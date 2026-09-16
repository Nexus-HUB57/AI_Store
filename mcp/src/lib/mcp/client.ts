/**
 * MCP Client — speaks JSON-RPC 2.0 over stdio to a child MCP server.
 */

import { spawn, ChildProcess } from "node:child_process";
import {
  AipkgMcpManifest,
  CallToolResult,
  JsonRpcRequest,
  JsonRpcResponse,
  McpError,
  McpErrorCode,
  PROTOCOL_VERSION,
  ReadResourceResult,
} from "./types";

export interface McpClientOptions {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  protocolVersion?: string;
  clientInfo?: { name: string; version: string };
  startupTimeoutMs?: number;
}

export class McpClient {
  private proc!: ChildProcess;
  private buffer = Buffer.alloc(0);
  private nextId = 1;
  private pending = new Map<string | number, { resolve: (v: any) => void; reject: (e: any) => void }>();
  private initialized = false;
  private serverInfo?: { name: string; version: string; title?: string };
  private serverCapabilities: Record<string, unknown> = {};
  private instructions?: string;

  constructor(private opts: McpClientOptions) {}

  async start(): Promise<void> {
    const { command, args = [], env = {} } = this.opts;
    this.proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    this.proc.stdout!.on("data", (chunk) => this.onData(chunk));
    this.proc.stderr!.on("data", (chunk) => process.stderr.write(`[mcp-child stderr] ${chunk}`));
    this.proc.on("exit", (code) => {
      // reject all pending
      for (const [, p] of this.pending) p.reject(new Error(`child exited with code ${code}`));
      this.pending.clear();
    });
    this.proc.on("error", (err) => {
      for (const [, p] of this.pending) p.reject(err);
      this.pending.clear();
    });

    // initialize
    const initResult = await this.request<{
      protocolVersion: string;
      serverInfo: { name: string; version: string; title?: string };
      capabilities: Record<string, unknown>;
      instructions?: string;
    }>("initialize", {
      protocolVersion: this.opts.protocolVersion ?? PROTOCOL_VERSION,
      clientInfo: this.opts.clientInfo ?? { name: "ai-store-orchestrator", version: "1.0.0" },
      capabilities: {
        roots: { listChanged: false },
        sampling: {},
      },
    });
    this.serverInfo = initResult.serverInfo;
    this.serverCapabilities = initResult.capabilities;
    this.instructions = initResult.instructions;
    this.notify("notifications/initialized", {});
    this.initialized = true;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get info(): { name: string; version: string } | undefined {
    return this.serverInfo;
  }

  get caps(): Record<string, unknown> {
    return this.serverCapabilities;
  }

  async stop(): Promise<void> {
    if (!this.proc) return;
    this.notify("notifications/cancelled", {});
    this.proc.kill("SIGTERM");
    await new Promise<void>((res) => {
      this.proc.once("exit", () => res());
      setTimeout(() => {
        try { this.proc.kill("SIGKILL"); } catch {}
        res();
      }, 2000);
    });
  }

  // ----------------------------------------------------- API
  async listTools(): Promise<{ name: string; description?: string; inputSchema?: any }[]> {
    const r = await this.request<{ tools: any[] }>("tools/list");
    return r.tools;
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<CallToolResult> {
    return this.request<CallToolResult>("tools/call", { name, arguments: args });
  }

  async listResources(): Promise<any[]> {
    const r = await this.request<{ resources: any[] }>("resources/list");
    return r.resources;
  }

  async readResource(uri: string): Promise<ReadResourceResult> {
    return this.request<ReadResourceResult>("resources/read", { uri });
  }

  async listPrompts(): Promise<any[]> {
    const r = await this.request<{ prompts: any[] }>("prompts/list");
    return r.prompts;
  }

  async ping(): Promise<boolean> {
    try {
      await this.request("ping");
      return true;
    } catch {
      return false;
    }
  }

  // ------------------------------------------------- Transport
  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;
      const header = this.buffer.slice(0, headerEnd).toString("ascii");
      const m = /Content-Length:\s*(\d+)/i.exec(header);
      if (!m) {
        this.buffer = this.buffer.slice(headerEnd + 4);
        continue;
      }
      const len = parseInt(m[1], 10);
      const total = headerEnd + 4 + len;
      if (this.buffer.length < total) return;
      const body = this.buffer.slice(headerEnd + 4, total).toString("utf-8");
      this.buffer = this.buffer.slice(total);
      try {
        const msg = JSON.parse(body) as JsonRpcResponse;
        if (msg.id !== undefined && msg.id !== null) {
          const p = this.pending.get(msg.id);
          if (p) {
            this.pending.delete(msg.id);
            if (msg.error) p.reject(new McpError(msg.error.code, msg.error.message, msg.error.data as any));
            else p.resolve(msg.result);
          }
        }
      } catch (e: any) {
        process.stderr.write(`[mcp-client parse error] ${e.message}\n`);
      }
    }
  }

  private send(msg: JsonRpcRequest): void {
    const body = JSON.stringify(msg);
    const header = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`;
    this.proc.stdin!.write(header + body);
  }

  private request<R = any>(method: string, params?: any, timeoutMs = 30_000): Promise<R> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new McpError(McpErrorCode.REQUEST_TIMEOUT, `request timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.send({ jsonrpc: "2.0", id, method, params });
    });
  }

  private notify(method: string, params?: any): void {
    this.send({ jsonrpc: "2.0", method, params });
  }
}