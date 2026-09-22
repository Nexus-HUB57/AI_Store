/**
 * MCP Orchestrator — runtime that manages the lifecycle of MCP servers.
 *
 * Responsibilities:
 *  - Spawns MCP child processes from .aipkg manifests
 *  - Holds an in-memory handle registry
 *  - Provides high-level `callTool(mcpName, toolName, args)`
 *  - Feeds telemetry into the autoevolution pipeline
 *  - Self-heals by restarting dead processes with exponential backoff
 */

import { EventEmitter } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AipkgMcpManifest } from "./types";
import { McpClient } from "./client";
import { TelemetryRecorder, TelemetryEvent } from "./telemetry";
import { McpRegistry, InstalledMcp } from "./registry";

export interface OrchestratorOptions {
  telemetryLogPath?: string;
  pulsarUrl?: string;
  ragInbox?: string;
  maxConcurrentCalls?: number;
}

interface McpHandle {
  manifest: AipkgMcpManifest;
  client: McpClient;
  installedAt: number;
  callCount: number;
  lastError?: string;
  consecutiveFailures: number;
  restartAttempts: number;
  status: "starting" | "ready" | "error" | "stopped";
  tools?: { name: string; description?: string; inputSchema?: any }[];
}

export class McpOrchestrator extends EventEmitter {
  private handles = new Map<string, McpHandle>();
  private registry: McpRegistry;
  private telemetry: TelemetryRecorder;
  private maxConcurrentCalls: number;
  private inflight = 0;
  private inflightQueue: Array<() => void> = [];

  constructor(registry: McpRegistry, opts: OrchestratorOptions = {}) {
    super();
    this.registry = registry;
    this.telemetry = new TelemetryRecorder({
      logPath: opts.telemetryLogPath ?? path.join(process.cwd(), "logs", "mcp-orchestrator.jsonl"),
      pulsarUrl: opts.pulsarUrl,
      ragInbox: opts.ragInbox,
    });
    this.maxConcurrentCalls = opts.maxConcurrentCalls ?? 32;
  }

  // ---------------------------------------------------- Lifecycle
  async install(manifest: AipkgMcpManifest): Promise<InstalledMcp> {
    const installed = await this.registry.register(manifest);
    await this.spawn(installed.manifest);
    this.emit("installed", installed);
    return installed;
  }

  async uninstall(name: string): Promise<void> {
    await this.stop(name);
    await this.registry.unregister(name);
    this.emit("uninstalled", name);
  }

  async start(name: string): Promise<McpHandle> {
    const installed = await this.registry.get(name);
    if (!installed) throw new Error(`MCP not installed: ${name}`);
    return this.spawn(installed.manifest);
  }

  async stop(name: string): Promise<void> {
    const h = this.handles.get(name);
    if (!h) return;
    h.status = "stopped";
    try { await h.client.stop(); } catch {}
    this.handles.delete(name);
    this.emit("stopped", name);
  }

  async restart(name: string): Promise<McpHandle> {
    await this.stop(name);
    return this.start(name);
  }

  // --------------------------------------------------- High-level call
  async callTool(
    mcpName: string,
    toolName: string,
    args: Record<string, unknown> = {},
    opts: { timeoutMs?: number; callerAgent?: string } = {},
  ): Promise<any> {
    await this.acquire();
    const handle = this.handles.get(mcpName);
    if (!handle) {
      this.release();
      throw new Error(`MCP not running: ${mcpName}`);
    }
    if (handle.status !== "ready") {
      this.release();
      throw new Error(`MCP not ready: ${mcpName} (status=${handle.status})`);
    }

    const start = Date.now();
    let ok = false;
    let errorMsg: string | undefined;
    let result: any;
    try {
      result = await handle.client.callTool(toolName, args);
      ok = !(result?.isError ?? false);
      if (!ok) errorMsg = (result?.content?.[0] as any)?.text ?? "unknown error";
      return result;
    } catch (e: any) {
      errorMsg = e.message ?? String(e);
      handle.lastError = errorMsg;
      handle.consecutiveFailures += 1;
      this.maybeSelfHeal(mcpName);
      throw e;
    } finally {
      this.release();
      handle.callCount++;
      const event: TelemetryEvent = {
        event: "orchestrator.callTool",
        mcp: mcpName,
        tool: toolName,
        durationMs: Date.now() - start,
        ok,
        error: errorMsg,
        ts: Date.now(),
        callerAgent: opts.callerAgent,
      };
      void this.telemetry.record(event);
      this.emit("call", event);
    }
  }

  async listTools(mcpName: string): Promise<{ name: string; description?: string; inputSchema?: any }[]> {
    const handle = this.handles.get(mcpName);
    if (!handle || !handle.tools) {
      throw new Error(`MCP not running: ${mcpName}`);
    }
    return handle.tools;
  }

  listRunning(): { name: string; status: string; callCount: number; uptime: number }[] {
    return Array.from(this.handles.entries()).map(([name, h]) => ({
      name,
      status: h.status,
      callCount: h.callCount,
      uptime: Date.now() - h.installedAt,
    }));
  }

  async shutdownAll(): Promise<void> {
    const all = Array.from(this.handles.keys());
    await Promise.all(all.map((n) => this.stop(n)));
  }

  // ----------------------------------------------------- Internal
  private async spawn(manifest: AipkgMcpManifest): Promise<McpHandle> {
    const existing = this.handles.get(manifest.name);
    if (existing && existing.status !== "stopped") {
      try { await existing.client.stop(); } catch {}
    }

    const client = new McpClient({
      command: manifest.mcp.command,
      args: manifest.mcp.args ?? [],
      env: manifest.mcp.env ?? {},
      clientInfo: { name: "ai-store-orchestrator", version: "1.0.0" },
    });

    const handle: McpHandle = {
      manifest,
      client,
      installedAt: Date.now(),
      callCount: 0,
      consecutiveFailures: 0,
      restartAttempts: 0,
      status: "starting",
    };
    this.handles.set(manifest.name, handle);

    try {
      await client.start();
      handle.tools = await client.listTools();
      handle.status = "ready";
      this.emit("ready", manifest.name);
      void this.telemetry.record({
        event: "orchestrator.start",
        mcp: manifest.name,
        version: manifest.version,
        toolCount: handle.tools.length,
        ts: Date.now(),
      });
      return handle;
    } catch (e: any) {
      handle.status = "error";
      handle.lastError = e.message;
      this.emit("error", { name: manifest.name, error: e.message });
      throw e;
    }
  }

  private maybeSelfHeal(mcpName: string): void {
    const h = this.handles.get(mcpName);
    if (!h) return;
    if (h.consecutiveFailures >= 5 && h.restartAttempts < 3) {
      const backoff = Math.min(30_000, 1000 * Math.pow(2, h.restartAttempts));
      h.restartAttempts++;
      void this.telemetry.record({
        event: "orchestrator.selfHeal.scheduled",
        mcp: mcpName,
        attempt: h.restartAttempts,
        backoffMs: backoff,
        reason: h.lastError,
        ts: Date.now(),
      });
      setTimeout(() => {
        if (this.handles.has(mcpName)) {
          void this.restart(mcpName).catch((e) => {
            void this.telemetry.record({
              event: "orchestrator.selfHeal.failed",
              mcp: mcpName,
              error: e.message,
              ts: Date.now(),
            });
          });
        }
      }, backoff);
    }
  }

  private async acquire(): Promise<void> {
    if (this.inflight < this.maxConcurrentCalls) {
      this.inflight++;
      return;
    }
    await new Promise<void>((res) => this.inflightQueue.push(res));
    this.inflight++;
  }

  private release(): void {
    this.inflight = Math.max(0, this.inflight - 1);
    const next = this.inflightQueue.shift();
    if (next) next();
  }
}