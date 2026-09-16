/**
 * MCP Server — TypeScript reference implementation.
 *
 * Mirrors the Python SDK so behavior is identical on both stacks.
 *
 * Usage:
 *
 *     const server = new McpServer({ name: "mcp-catalog", version: "1.0.0" });
 *
 *     server.tool("search_products", { query: z.string() }, async ({ query }) => ({
 *       content: [{ type: "text", text: JSON.stringify([...]) }],
 *     }));
 *
 *     server.start();
 */

import { spawn, ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { z, ZodTypeAny } from "zod";
import {
  AipkgMcpManifest,
  CallToolResult,
  Content,
  Implementation,
  JsonRpcRequest,
  JsonRpcResponse,
  McpError,
  McpErrorCode,
  Prompt,
  PROTOCOL_VERSION,
  ReadResourceResult,
  Resource,
  ServerCapabilities,
  TextContent,
  Tool,
} from "./types";

// ---------------------------------------------------------------------------
// Tool handler shape
// ---------------------------------------------------------------------------

export type ToolHandler = (args: any, extra: { signal?: AbortSignal }) => Promise<CallToolResult>;

interface ToolEntry {
  tool: Tool;
  handler: ToolHandler;
  schema: ZodTypeAny;
}

interface ResourceEntry {
  resource: Resource;
  handler: (uri: string) => Promise<ReadResourceResult | string | Buffer>;
}

// ---------------------------------------------------------------------------
// McpServer
// ---------------------------------------------------------------------------

export interface McpServerOptions {
  name: string;
  version: string;
  title?: string;
  description?: string;
  capabilities?: ServerCapabilities;
  telemetry?: (event: Record<string, unknown>) => Promise<void> | void;
}

export class McpServer {
  private impl: Implementation;
  private capabilities: ServerCapabilities;
  private description?: string;
  private tools = new Map<string, ToolEntry>();
  private resources = new Map<string, ResourceEntry>();
  private logLevel: "debug" | "info" | "warn" | "error" = "info";
  private clientInfo?: { name: string; version: string };
  private telemetry?: (event: Record<string, unknown>) => Promise<void> | void;
  private proc?: ChildProcess;
  private buffer = Buffer.alloc(0);
  private nextId = 1;
  private pending = new Map<string | number, { resolve: (v: any) => void; reject: (e: any) => void }>();
  private onNotification?: (method: string, params: any) => void;

  constructor(opts: McpServerOptions) {
    this.impl = { name: opts.name, version: opts.version, title: opts.title };
    this.capabilities = opts.capabilities ?? {
      tools: { listChanged: true },
      resources: { subscribe: false, listChanged: false },
      prompts: { listChanged: false },
      logging: {},
    };
    this.description = opts.description;
    this.telemetry = opts.telemetry;
  }

  // ------------------------------------------------------------- API
  tool(
    name: string,
    schema: ZodTypeAny,
    description: string,
    handler: ToolHandler,
  ): void {
    const jsonSchema = zodToJsonSchema(schema);
    this.tools.set(name, {
      tool: { name, description, inputSchema: jsonSchema },
      handler,
      schema,
    });
  }

  resource(resource: Resource, handler: (uri: string) => Promise<ReadResourceResult | string | Buffer>): void {
    this.resources.set(resource.uri, { resource, handler });
  }

  // ------------------------------------------------------- I/O layer
  /** Start a stdio MCP server reading from stdin, writing to stdout. */
  async startStdio(): Promise<void> {
    process.stdin.on("data", (chunk) => this.onData(chunk));
    process.stdin.on("end", () => process.exit(0));
    this.log("info", `${this.impl.name} v${this.impl.version} ready (stdio)`);
    // We don't need to spawn — we ARE the server.
  }

  /** Connect this server as a stdio child process (used for local exec). */
  async connectAsProcess(command: string, args: string[] = [], env: Record<string, string> = {}): Promise<ChildProcess> {
    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    proc.stdout!.on("data", (chunk) => this.onData(chunk));
    proc.stderr!.on("data", (chunk) => process.stderr.write(chunk));
    proc.on("exit", (code) => this.log("warn", `child exited with code ${code}`));
    this.proc = proc;
    return proc;
  }

  setOnNotification(fn: (method: string, params: any) => void): void {
    this.onNotification = fn;
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
        const msg = JSON.parse(body) as JsonRpcRequest;
        void this.handleIncoming(msg);
      } catch (e: any) {
        this.log("error", `parse error: ${e.message}`);
      }
    }
  }

  private send(msg: JsonRpcResponse | JsonRpcRequest): void {
    const body = JSON.stringify(msg);
    const header = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`;
    const stream = this.proc?.stdin ?? process.stdout;
    stream.write(header);
    stream.write(body);
  }

  // ------------------------------------------------- Dispatch
  private async handleIncoming(msg: JsonRpcRequest): Promise<void> {
    const { method, params, id } = msg;
    const isNotification = id === undefined || id === null;

    try {
      let result: any;
      switch (method) {
        case "initialize":
          result = await this.onInitialize(params as any);
          break;
        case "notifications/initialized":
          this.log("debug", "client initialized");
          return;
        case "ping":
          result = {};
          break;
        case "tools/list":
          result = { tools: Array.from(this.tools.values()).map((t) => t.tool) };
          break;
        case "tools/call":
          result = await this.onToolCall(params as any);
          break;
        case "resources/list":
          result = { resources: Array.from(this.resources.values()).map((r) => r.resource) };
          break;
        case "resources/read":
          result = await this.onResourceRead(params as any);
          break;
        case "prompts/list":
          result = { prompts: [] };
          break;
        case "prompts/get":
          throw new McpError(McpErrorCode.PROMPT_NOT_FOUND, "no prompts registered");
        case "logging/setLevel":
          this.logLevel = (params as any).level ?? "info";
          result = {};
          break;
        case "completion/complete":
          result = { completion: { values: [], total: 0, hasMore: false } };
          break;
        default:
          if (!isNotification) {
            this.send({
              jsonrpc: "2.0",
              id: id ?? null,
              error: { code: McpErrorCode.METHOD_NOT_FOUND, message: `unknown method: ${method}` },
            });
          }
          return;
      }
      if (!isNotification) {
        this.send({ jsonrpc: "2.0", id: id ?? null, result });
      } else if (this.onNotification) {
        this.onNotification(method, params);
      }
    } catch (e: any) {
      const err = e instanceof McpError ? e.toJSONRPC() : { code: McpErrorCode.INTERNAL_ERROR, message: e.message };
      if (!isNotification) {
        this.send({ jsonrpc: "2.0", id: id ?? null, error: err });
      }
    }
  }

  private async onInitialize(p: { protocolVersion: string; clientInfo: any }): Promise<any> {
    this.clientInfo = p.clientInfo;
    return {
      protocolVersion: p.protocolVersion ?? PROTOCOL_VERSION,
      capabilities: this.capabilities,
      serverInfo: this.impl,
      instructions: this.description,
    };
  }

  private async onToolCall(p: { name: string; arguments?: Record<string, unknown> }): Promise<CallToolResult> {
    const entry = this.tools.get(p.name);
    if (!entry) throw new McpError(McpErrorCode.TOOL_NOT_FOUND, `tool not found: ${p.name}`);

    const start = Date.now();
    let isError = false;
    let errorMsg: string | undefined;
    try {
      const args = entry.schema ? entry.schema.parse(p.arguments ?? {}) : p.arguments ?? {};
      const out = await entry.handler(args, {});
      return out;
    } catch (e: any) {
      isError = true;
      errorMsg = e.message;
      return { content: [{ type: "text", text: `Error: ${errorMsg}` } as TextContent], isError: true };
    } finally {
      if (this.telemetry) {
        try {
          await this.telemetry({
            event: "tools/call",
            mcp: this.impl.name,
            tool: p.name,
            durationMs: Date.now() - start,
            ok: !isError,
            error: errorMsg,
            ts: Date.now(),
            client: this.clientInfo,
          });
        } catch {}
      }
    }
  }

  private async onResourceRead(p: { uri: string }): Promise<ReadResourceResult> {
    const entry = this.resources.get(p.uri);
    if (!entry) throw new McpError(McpErrorCode.RESOURCE_NOT_FOUND, `resource not found: ${p.uri}`);
    const out = await entry.handler(p.uri);
    if (typeof out === "string") return { contents: [{ uri: p.uri, text: out }] };
    if (Buffer.isBuffer(out)) {
      return { contents: [{ uri: p.uri, blob: out.toString("base64") }] };
    }
    return out;
  }

  // ------------------------------------------------- Outbound
  async request<R = any>(method: string, params?: any, timeoutMs = 30000): Promise<R> {
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

  notify(method: string, params?: any): void {
    this.send({ jsonrpc: "2.0", method, params });
  }

  // ------------------------------------------------- Logging
  private log(level: "debug" | "info" | "warn" | "error", msg: string): void {
    const order = { debug: 0, info: 1, warn: 2, error: 3 } as const;
    if (order[level] < order[this.logLevel]) return;
    process.stderr.write(`[mcp:${this.impl.name}] [${level}] ${msg}\n`);
  }
}

// ---------------------------------------------------------------------------
// Zod → JSON Schema (minimal, only what we need)
// ---------------------------------------------------------------------------

function zodToJsonSchema(schema: ZodTypeAny): { type: "object"; properties?: Record<string, unknown>; required?: string[] } {
  if (!(schema instanceof z.ZodObject)) {
    return { type: "object", properties: {} };
  }
  const shape = schema.shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [k, v] of Object.entries(shape as Record<string, ZodTypeAny>)) {
    properties[k] = zodFieldToJson(v);
    if (!(v instanceof z.ZodOptional)) required.push(k);
  }
  const out: { type: "object"; properties?: Record<string, unknown>; required?: string[] } = { type: "object", properties };
  if (required.length) out.required = required;
  return out;
}

function zodFieldToJson(v: ZodTypeAny): any {
  if (v instanceof z.ZodString) return { type: "string", description: v.description };
  if (v instanceof z.ZodNumber) return { type: "number", description: v.description };
  if (v instanceof z.ZodBoolean) return { type: "boolean", description: v.description };
  if (v instanceof z.ZodEnum) return { type: "string", enum: v.options, description: v.description };
  if (v instanceof z.ZodArray) return { type: "array", items: zodFieldToJson(v._def.type as ZodTypeAny), description: v.description };
  if (v instanceof z.ZodOptional) return zodFieldToJson(v._def.innerType as ZodTypeAny);
  if (v instanceof z.ZodObject) return zodToJsonSchema(v);
  return { type: "string", description: v.description };
}