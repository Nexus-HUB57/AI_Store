/**
 * MCP Server: Marketplace
 * Publish, discover, and acquire MCP packages in the marketplace
 */

import { McpServer } from '../../lib/mcp/sdk'
import type { McpManifest } from '../../lib/mcp/types'

const manifest: McpManifest = {
  name: 'mcp-marketplace',
  version: '1.0.0',
  description: 'MCP marketplace — publish, discover, and acquire .aipkg packages',
  author: '@nexus-genesis',
  category: 'marketplace',
  tags: ['marketplace', 'packages', 'publish', 'acquire'],
  entrypoint: 'index.ts',
  runtime: 'node',
  permissions: { network: true, filesystem: [], env: [] },
  envVars: {},
  tools: [
    {
      name: 'publish_package',
      description: 'Publish a new MCP package version to the marketplace',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
          description: { type: 'string' },
          manifest: { type: 'object' },
        },
        required: ['name', 'version'],
      },
    },
    {
      name: 'search_packages',
      description: 'Search the marketplace for packages by query, category, or tags',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          limit: { type: 'integer', default: 20 },
        },
      },
    },
    {
      name: 'acquire_package',
      description: 'Acquire (purchase/install) a package from the marketplace',
      inputSchema: {
        type: 'object',
        properties: {
          packageName: { type: 'string' },
          version: { type: 'string' },
          agentId: { type: 'string' },
        },
        required: ['packageName', 'agentId'],
      },
    },
  ],
}

// In-memory package listing
const listings = new Map<string, {
  name: string; version: string; description: string
  manifest: Record<string, unknown>; publishedAt: Date; downloads: number
}>()

const server = new McpServer(manifest)

server.tool(manifest.tools[0], async (input) => {
  const name = input.name as string
  const existing = listings.get(name)
  listings.set(name, {
    name,
    version: input.version as string,
    description: (input.description as string) ?? '',
    manifest: (input.manifest as Record<string, unknown>) ?? {},
    publishedAt: existing?.publishedAt ?? new Date(),
    downloads: existing?.downloads ?? 0,
  })
  return { published: true, name, version: input.version }
})

server.tool(manifest.tools[1], async (input) => {
  const limit = (input.limit as number) ?? 20
  let result = Array.from(listings.values())

  if (input.query) {
    const q = (input.query as string).toLowerCase()
    result = result.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    )
  }
  if (input.category) {
    result = result.filter(
      (p) => (p.manifest as { category?: string }).category === input.category
    )
  }

  return { packages: result.slice(0, limit), total: result.length }
})

server.tool(manifest.tools[2], async (input) => {
  const name = input.packageName as string
  const listing = listings.get(name)
  if (!listing) return { success: false, error: `Package "${name}" not found in marketplace` }

  listing.downloads++
  return {
    success: true,
    package: listing.name,
    version: listing.version,
    message: `Package "${name}" acquired successfully`,
  }
})

server.register()
export default server
