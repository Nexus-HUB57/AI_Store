/**
 * MCP Ecosystem — Runtime Engine
 * Loads, validates, and starts MCP server packages
 */

import { createServer, McpServer } from './sdk'
import type { McpManifest, McpHealthStatus } from './types'
import {
  registerPackage,
  getAllPackages,
  getHealth,
  incrementActiveCalls,
  decrementActiveCalls,
} from './registry'

// ─── Runtime State ───────────────────────────────────────────────
const activeServers = new Map<string, McpServer>()
let isRunning = false

// ─── Server Loader ───────────────────────────────────────────────
export async function loadServer(manifest: McpManifest): Promise<McpServer> {
  const server = createServer(manifest)

  // Register built-in no-op handlers for each declared tool
  // (real servers override these via .tool() in their index.ts)
  for (const toolDef of manifest.tools) {
    server.tool(toolDef, async (input) => ({
      message: `Tool "${toolDef.name}" executed (no-op default)`,
      input,
    }))
  }

  server.register()
  activeServers.set(manifest.name, server)
  return server
}

// ─── Batch Load ──────────────────────────────────────────────────
export async function loadServers(manifests: McpManifest[]): Promise<McpServer[]> {
  const servers: McpServer[] = []
  for (const m of manifests) {
    servers.push(await loadServer(m))
  }
  return servers
}

// ─── Execute Tool Call ───────────────────────────────────────────
export async function executeCall(
  packageName: string,
  toolName: string,
  input: Record<string, unknown>,
  callerAgent: string
): Promise<{ success: boolean; output: Record<string, unknown>; latencyMs: number; error?: string }> {
  const server = activeServers.get(packageName)
  if (!server) {
    return { success: false, output: {}, latencyMs: 0, error: `Package "${packageName}" not loaded` }
  }

  incrementActiveCalls()
  try {
    const result = await server.callTool({ toolName, packageName, input, callerAgent })
    return result
  } finally {
    decrementActiveCalls()
  }
}

// ─── Health ──────────────────────────────────────────────────────
export function getRuntimeHealth(): McpHealthStatus {
  const servers = Array.from(activeServers.entries()).map(([name, srv]) => ({
    name,
    status: 'running' as const,
    toolsCount: srv.listTools().length,
  }))

  return getHealth(
    servers.map((s) => ({
      name: s.name,
      status: s.status,
      toolsCount: s.toolsCount,
    }))
  )
}

// ─── Bootstrap ───────────────────────────────────────────────────
export async function startRuntime(): Promise<void> {
  if (isRunning) return
  isRunning = true
  console.log(`[MCP Runtime] Started at ${new Date().toISOString()}`)
  console.log(`[MCP Runtime] Loaded ${activeServers.size} server(s), ${getAllPackages().length} package(s)`)
}

export async function stopRuntime(): Promise<void> {
  isRunning = false
  for (const [name, srv] of activeServers) {
    srv.unregister()
  }
  activeServers.clear()
  console.log('[MCP Runtime] Stopped')
}

// ─── CLI entrypoint ──────────────────────────────────────────────
if (typeof require !== 'undefined' && require.main === module) {
  startRuntime()
    .then(() => console.log('[MCP Runtime] Ready.'))
    .catch((err) => console.error('[MCP Runtime] Failed to start:', err))
}
