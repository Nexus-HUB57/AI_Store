/**
 * MCP Ecosystem — Core Type Definitions
 * Distributed as .aipkg packages (7th catalog segment)
 */

// ─── Package Manifest ────────────────────────────────────────────
export interface McpManifest {
  name: string
  version: string
  description: string
  author: string
  category: McpCategory
  tags: string[]
  entrypoint: string
  runtime: McpRuntime
  permissions: McpPermission
  envVars: Record<string, string>
  tools: McpToolDef[]
  dependencies?: Record<string, string>
}

export type McpCategory =
  | 'utility'
  | 'data'
  | 'ai-ml'
  | 'blockchain'
  | 'communication'
  | 'monitoring'
  | 'security'
  | 'rag'
  | 'self-heal'
  | 'marketplace'

export type McpRuntime = 'node' | 'python' | 'wasm' | 'docker'

export interface McpPermission {
  network?: boolean
  filesystem?: string[]  // allowed paths
  env?: string[]         // allowed env vars
  compute?: { maxMemoryMB?: number; timeoutMs?: number }
}

// ─── Tool Definitions ────────────────────────────────────────────
export interface McpToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>  // JSON Schema
  outputSchema?: Record<string, unknown>
  permissions?: string[]
}

// ─── Tool Call ───────────────────────────────────────────────────
export interface McpCallRequest {
  toolName: string
  packageName: string
  input: Record<string, unknown>
  callerAgent: string
  timeoutMs?: number
}

export interface McpCallResult {
  success: boolean
  output: Record<string, unknown>
  latencyMs: number
  error?: string
  toolId?: string
  callId?: string
}

// ─── Install / Acquire ───────────────────────────────────────────
export interface McpInstallRequest {
  packageName: string
  version?: string
  agentId: string
  config?: Record<string, unknown>
}

export interface McpInstallResult {
  success: boolean
  installId?: string
  error?: string
}

// ─── Health / Status ─────────────────────────────────────────────
export interface McpHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  packagesLoaded: number
  activeCalls: number
  servers: McpServerStatus[]
  timestamp: string
}

export interface McpServerStatus {
  name: string
  status: 'running' | 'stopped' | 'error'
  port?: number
  lastPing?: string
  errorCount?: number
}

// ─── Self-Heal ───────────────────────────────────────────────────
export interface McpSelfHealInput {
  packageId?: string
  toolId?: string
  eventType: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  context?: Record<string, unknown>
}

export interface McpSelfHealResult {
  eventId: string
  action: 'logged' | 'retried' | 'restarted' | 'escalated'
  resolution?: string
}

// ─── RAG Feedback ────────────────────────────────────────────────
export interface McpRagInput {
  packageId?: string
  toolId?: string
  agentId: string
  query: string
  documentId?: string
  relevance?: number
  feedback?: string
  rating?: number
}

// ─── AIPKG Pack ──────────────────────────────────────────────────
export interface AipkgConfig {
  name: string
  version: string
  description: string
  author: string
  category: McpCategory
  entrypoint: string
  runtime: McpRuntime
  outDir?: string
  include?: string[]
  exclude?: string[]
}
