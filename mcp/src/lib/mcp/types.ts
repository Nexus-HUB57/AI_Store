/**
 * MCP Type Definitions — TypeScript port of the b'AI'tcoin MCP SDK.
 * Follows the Model Context Protocol spec (2024-11-05).
 *
 *   https://modelcontextprotocol.io/specification/2024-11-05
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export interface TextContent {
  type: "text";
  text: string;
  annotations?: Record<string, unknown>;
}

export interface ImageContent {
  type: "image";
  data: string; // base64
  mimeType: string;
  annotations?: Record<string, unknown>;
}

export interface EmbeddedResource {
  type: "resource";
  resource: { uri: string; text?: string; blob?: string; mimeType?: string };
}

export type Content = TextContent | ImageContent | EmbeddedResource;

export interface Tool {
  name: string;
  description?: string;
  inputSchema: {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  };
  annotations?: Record<string, unknown>;
}

export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  annotations?: Record<string, unknown>;
}

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface Prompt {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
}

export interface ServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  logging?: Record<string, unknown>;
  sampling?: Record<string, unknown>;
}

export interface Implementation {
  name: string;
  version: string;
  title?: string;
}

// ---------------------------------------------------------------------------
// JSON-RPC envelope
// ---------------------------------------------------------------------------

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

// ---------------------------------------------------------------------------
// Method results
// ---------------------------------------------------------------------------

export interface CallToolResult {
  content: Content[];
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
}

export interface ReadResourceResult {
  contents: { uri: string; text?: string; blob?: string; mimeType?: string }[];
}

export interface GetPromptResult {
  description?: string;
  messages: { role: "user" | "assistant"; content: Content | string }[];
}

// ---------------------------------------------------------------------------
// Manifest (.aipkg)
// ---------------------------------------------------------------------------

export interface AipkgMcpManifest {
  aipkg: "1.0";
  kind: "mcp";
  name: string;
  version: string;
  displayName: string;
  description: string;
  author: { agentId: string; displayName?: string; verified?: boolean };
  category: string;
  tags?: string[];
  iconEmoji?: string;
  license?: string;
  repository?: string;
  homepage?: string;
  mcp: {
    transport: "stdio" | "sse" | "http";
    command: string;
    args?: string[];
    env?: Record<string, string>;
    capabilities?: {
      tools?: boolean;
      resources?: boolean;
      prompts?: boolean;
      logging?: boolean;
      sampling?: boolean;
    };
    minProtocolVersion?: string;
  };
  runtime?: {
    memoryMb?: number;
    cpuMillicores?: number;
    timeoutMs?: number;
    sandbox?: "none" | "process" | "wasm";
  };
  tools?: { name: string; description?: string; category?: string }[];
  pricing?: { model: "free" | "per-call" | "subscription"; priceSats?: number; pricePerCallSats?: number };
  telemetry?: { emitTo?: string; includeCallPayload?: boolean; sampleRate?: number };
}

export const PROTOCOL_VERSION = "2024-11-05";

// ---------------------------------------------------------------------------
// MCP Error Codes
// ---------------------------------------------------------------------------

export enum McpErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32602,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  RESOURCE_NOT_FOUND = -32002,
  TOOL_NOT_FOUND = -32003,
  PROMPT_NOT_FOUND = -32004,
  REQUEST_TIMEOUT = -32005,
  CAPABILITY_NOT_SUPPORTED = -32006,
}

export class McpError extends Error {
  constructor(public code: McpErrorCode, message: string, public data?: Record<string, unknown>) {
    super(message);
    this.name = "McpError";
  }
  toJSONRPC() {
    return { code: this.code, message: this.message, ...(this.data ? { data: this.data } : {}) };
  }
}