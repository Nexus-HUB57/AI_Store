/**
 * MCP Server: Agentic Awareness
 * Tracks agent capabilities, awareness levels, and inter-agent communication
 */

import { McpServer } from '../../lib/mcp/sdk'
import type { McpManifest } from '../../lib/mcp/types'

const manifest: McpManifest = {
  name: 'mcp-agentic-awareness',
  version: '1.0.0',
  description: 'Agent awareness tracker — capability discovery and inter-agent coordination',
  author: '@nexus-genesis',
  category: 'communication',
  tags: ['agent', 'awareness', 'capabilities', 'coordination'],
  entrypoint: 'index.ts',
  runtime: 'node',
  permissions: { network: false, filesystem: [], env: [] },
  envVars: {},
  tools: [
    {
      name: 'register_agent',
      description: 'Register an agent with its capabilities and metadata',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
          capabilities: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' },
        },
        required: ['agentId'],
      },
    },
    {
      name: 'discover_agents',
      description: 'Discover agents by capability or proximity',
      inputSchema: {
        type: 'object',
        properties: {
          capability: { type: 'string' },
          limit: { type: 'integer', default: 10 },
        },
      },
    },
    {
      name: 'get_agent_profile',
      description: 'Get a specific agent\'s profile and capabilities',
      inputSchema: {
        type: 'object',
        properties: { agentId: { type: 'string' } },
        required: ['agentId'],
      },
    },
  ],
}

// In-memory agent store
const agents = new Map<string, {
  agentId: string; capabilities: string[]; metadata: Record<string, unknown>
  registeredAt: Date; lastSeen: Date
}>()

const server = new McpServer(manifest)

server.tool(manifest.tools[0], async (input) => {
  const agentId = input.agentId as string
  agents.set(agentId, {
    agentId,
    capabilities: (input.capabilities as string[]) ?? [],
    metadata: (input.metadata as Record<string, unknown>) ?? {},
    registeredAt: agents.get(agentId)?.registeredAt ?? new Date(),
    lastSeen: new Date(),
  })
  return { registered: true, agentId }
})

server.tool(manifest.tools[1], async (input) => {
  const limit = (input.limit as number) ?? 10
  const cap = input.capability as string | undefined
  let result = Array.from(agents.values())
  if (cap) result = result.filter((a) => a.capabilities.includes(cap))
  return { agents: result.slice(0, limit), total: result.length }
})

server.tool(manifest.tools[2], async (input) => {
  const agent = agents.get(input.agentId as string)
  if (!agent) return { found: false, error: 'Agent not found' }
  return { found: true, agent }
})

server.register()
export default server
