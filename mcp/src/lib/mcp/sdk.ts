/**
 * MCP Ecosystem — SDK Core
 * Provides the McpServer base class for building MCP servers
 */

import type { McpManifest, McpToolDef, McpCallRequest, McpCallResult } from './types'
import { registerPackage, unregisterPackage } from './registry'

// ─── Tool Handler Type ───────────────────────────────────────────
export type ToolHandler = (
  input: Record<string, unknown>,
  context: { callerAgent: string; packageName: string }
) => Promise<Record<string, unknown>>

// ─── McpServer Base Class ────────────────────────────────────────
export class McpServer {
  private manifest: McpManifest
  private handlers = new Map<string, ToolHandler>()

  constructor(manifest: McpManifest) {
    this.manifest = manifest
  }

  /** Register a tool handler */
  tool(def: McpToolDef, handler: ToolHandler): this {
    if (!this.manifest.tools.find((t) => t.name === def.name)) {
      this.manifest.tools.push(def)
    }
    this.handlers.set(def.name, handler)
    return this
  }

  /** Call a tool by name */
  async callTool(request: McpCallRequest): Promise<McpCallResult> {
    const handler = this.handlers.get(request.toolName)
    if (!handler) {
      return {
        success: false,
        output: {},
        latencyMs: 0,
        error: `Tool "${request.toolName}" not found in package "${this.manifest.name}"`,
      }
    }

    const start = Date.now()
    try {
      const output = await handler(request.input, {
        callerAgent: request.callerAgent,
        packageName: this.manifest.name,
      })
      return {
        success: true,
        output,
        latencyMs: Date.now() - start,
      }
    } catch (err) {
      return {
        success: false,
        output: {},
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  /** Register this server's package into the global registry */
  register(): void {
    registerPackage(this.manifest)
  }

  /** Unregister from the global registry */
  unregister(): void {
    unregisterPackage(this.manifest.name)
  }

  /** Get the manifest */
  getManifest(): McpManifest {
    return { ...this.manifest }
  }

  /** List registered tool names */
  listTools(): string[] {
    return Array.from(this.handlers.keys())
  }
}

// ─── Factory Helper ──────────────────────────────────────────────
export function createServer(manifest: McpManifest): McpServer {
  return new McpServer(manifest)
}
