/**
 * MCP Ecosystem — Package Registry
 * In-memory registry with lazy-loading from DB
 */

import type {
  McpManifest,
  McpToolDef,
  McpHealthStatus,
  McpServerStatus,
} from './types'

// ─── In-Memory Registry ──────────────────────────────────────────
const packages = new Map<string, McpManifest>()
const tools = new Map<string, McpToolDef & { packageName: string }>()
let activeCalls = 0
let startTime = Date.now()

// ─── Package Registration ────────────────────────────────────────
export function registerPackage(manifest: McpManifest): void {
  packages.set(manifest.name, manifest)
  for (const tool of manifest.tools) {
    tools.set(`${manifest.name}/${tool.name}`, { ...tool, packageName: manifest.name })
  }
}

export function unregisterPackage(name: string): void {
  const manifest = packages.get(name)
  if (manifest) {
    for (const tool of manifest.tools) {
      tools.delete(`${name}/${tool.name}`)
    }
    packages.delete(name)
  }
}

export function getPackage(name: string): McpManifest | undefined {
  return packages.get(name)
}

export function getAllPackages(): McpManifest[] {
  return Array.from(packages.values())
}

export function findPackagesByCategory(category: string): McpManifest[] {
  return Array.from(packages.values()).filter((p) => p.category === category)
}

export function findPackagesByTag(tag: string): McpManifest[] {
  return Array.from(packages.values()).filter((p) => p.tags.includes(tag))
}

// ─── Tool Lookup ─────────────────────────────────────────────────
export function getTool(fqn: string): (McpToolDef & { packageName: string }) | undefined {
  return tools.get(fqn)
}

export function getAllTools(): (McpToolDef & { packageName: string })[] {
  return Array.from(tools.values())
}

export function getToolsForPackage(name: string): McpToolDef[] {
  const manifest = packages.get(name)
  return manifest ? manifest.tools : []
}

// ─── Call Tracking ───────────────────────────────────────────────
export function incrementActiveCalls(): void {
  activeCalls++
}

export function decrementActiveCalls(): void {
  activeCalls = Math.max(0, activeCalls - 1)
}

// ─── Health ──────────────────────────────────────────────────────
export function getHealth(servers: McpServerStatus[] = []): McpHealthStatus {
  const unhealthyServers = servers.filter((s) => s.status === 'error').length
  return {
    status: unhealthyServers > 0 ? 'degraded' : 'healthy',
    uptime: Date.now() - startTime,
    packagesLoaded: packages.size,
    activeCalls,
    servers,
    timestamp: new Date().toISOString(),
  }
}

export function resetStartTime(): void {
  startTime = Date.now()
}

// ─── Utility ─────────────────────────────────────────────────────
export function clear(): void {
  packages.clear()
  tools.clear()
  activeCalls = 0
}
