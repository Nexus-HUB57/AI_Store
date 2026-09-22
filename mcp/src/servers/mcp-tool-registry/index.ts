/**
 * MCP Server: Tool Registry
 * Registers, discovers, and resolves MCP tools across packages
 */

import { McpServer } from '../../lib/mcp/sdk'
import type { McpManifest } from '../../lib/mcp/types'

const manifest: McpManifest = {
  name: 'mcp-tool-registry',
  version: '1.0.0',
  description: 'Central registry for MCP tool discovery and resolution',
  author: '@nexus-genesis',
  category: 'utility',
  tags: ['registry', 'discovery', 'tools'],
  entrypoint: 'index.ts',
  runtime: 'node',
  permissions: { network: false, filesystem: [], env: [] },
  envVars: {},
  tools: [
    {
      name: 'list_tools',
      description: 'List all registered MCP tools, optionally filtered by package or category',
      inputSchema: {
        type: 'object',
        properties: {
          packageName: { type: 'string', description: 'Filter by package name' },
          category: { type: 'string', description: 'Filter by category' },
        },
      },
    },
    {
      name: 'resolve_tool',
      description: 'Resolve a fully-qualified tool name to its handler and schema',
      inputSchema: {
        type: 'object',
        properties: {
          fqn: { type: 'string', description: 'Fully-qualified tool name (package/tool)' },
        },
        required: ['fqn'],
      },
    },
    {
      name: 'get_tool_schema',
      description: 'Get the input/output JSON schema for a specific tool',
      inputSchema: {
        type: 'object',
        properties: {
          fqn: { type: 'string', description: 'Fully-qualified tool name' },
        },
        required: ['fqn'],
      },
    },
  ],
}

const server = new McpServer(manifest)

server.tool(manifest.tools[0], async (input) => {
  const { getAllTools, findPackagesByCategory, getToolsForPackage } = await import('../../lib/mcp/registry')
  if (input.packageName) {
    return { tools: getToolsForPackage(input.packageName as string) }
  }
  if (input.category) {
    const pkgs = findPackagesByCategory(input.category as string)
    const result: unknown[] = []
    for (const p of pkgs) result.push(...getToolsForPackage(p.name))
    return { tools: result }
  }
  return { tools: getAllTools() }
})

server.tool(manifest.tools[1], async (input) => {
  const { getTool } = await import('../../lib/mcp/registry')
  const tool = getTool(input.fqn as string)
  if (!tool) return { found: false, error: `Tool "${input.fqn}" not found` }
  return { found: true, tool }
})

server.tool(manifest.tools[2], async (input) => {
  const { getTool } = await import('../../lib/mcp/registry')
  const tool = getTool(input.fqn as string)
  if (!tool) return { found: false, error: `Tool "${input.fqn}" not found` }
  return { found: true, inputSchema: tool.inputSchema, outputSchema: tool.outputSchema }
})

server.register()
export default server
