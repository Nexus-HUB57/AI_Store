/**
 * MCP Ecosystem — Health Check Module
 * Provides health-check logic for the MCP runtime
 */

import type { McpHealthStatus, McpServerStatus } from './types'

export interface HealthCheckOptions {
  dbAvailable?: boolean
  serversExpected?: number
}

/**
 * Compute overall health from server statuses and DB availability
 */
export function computeHealth(
  servers: McpServerStatus[],
  options: HealthCheckOptions = {}
): McpHealthStatus {
  const errorServers = servers.filter((s) => s.status === 'error')
  const stoppedServers = servers.filter((s) => s.status === 'stopped')

  let status: McpHealthStatus['status'] = 'healthy'
  if (errorServers.length > 0 || !options.dbAvailable) {
    status = 'unhealthy'
  } else if (stoppedServers.length > 0) {
    status = 'degraded'
  }

  return {
    status,
    uptime: process.uptime ? Math.round(process.uptime() * 1000) : 0,
    packagesLoaded: 0, // filled by registry
    activeCalls: 0,    // filled by registry
    servers,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Ping a server by making a lightweight check
 */
export async function pingServer(url: string, timeoutMs = 3000): Promise<McpServerStatus> {
  const name = new URL(url).hostname
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    return {
      name,
      status: res.ok ? 'running' : 'error',
      lastPing: new Date().toISOString(),
    }
  } catch {
    return {
      name,
      status: 'error',
      lastPing: new Date().toISOString(),
      errorCount: 1,
    }
  }
}
