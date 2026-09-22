/**
 * MCP Server: Telemetry
 * Collects, aggregates, and exposes MCP runtime metrics
 */

import { McpServer } from '../../lib/mcp/sdk'
import type { McpManifest } from '../../lib/mcp/types'

const manifest: McpManifest = {
  name: 'mcp-telemetry',
  version: '1.0.0',
  description: 'Telemetry collector — tracks tool calls, latency, errors, and usage metrics',
  author: '@nexus-genesis',
  category: 'monitoring',
  tags: ['telemetry', 'metrics', 'monitoring', 'observability'],
  entrypoint: 'index.ts',
  runtime: 'node',
  permissions: { network: false, filesystem: [], env: [] },
  envVars: {},
  tools: [
    {
      name: 'record_metric',
      description: 'Record a telemetry metric (counter, gauge, or histogram)',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['counter', 'gauge', 'histogram'] },
          value: { type: 'number' },
          labels: { type: 'object' },
        },
        required: ['name', 'type', 'value'],
      },
    },
    {
      name: 'query_metrics',
      description: 'Query aggregated metrics by name or time range',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          since: { type: 'string', description: 'ISO timestamp' },
          aggregate: { type: 'string', enum: ['sum', 'avg', 'max', 'min', 'count'] },
        },
      },
    },
    {
      name: 'get_dashboard',
      description: 'Get a summary dashboard of all tracked metrics',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}

// In-memory metrics store
const metrics: Array<{
  name: string; type: string; value: number; labels: Record<string, string>
  timestamp: Date
}> = []

const server = new McpServer(manifest)

server.tool(manifest.tools[0], async (input) => {
  metrics.push({
    name: input.name as string,
    type: input.type as string,
    value: input.value as number,
    labels: (input.labels as Record<string, string>) ?? {},
    timestamp: new Date(),
  })
  return { recorded: true }
})

server.tool(manifest.tools[1], async (input) => {
  let filtered = metrics
  if (input.name) filtered = filtered.filter((m) => m.name === input.name)
  if (input.since) {
    const since = new Date(input.since as string)
    filtered = filtered.filter((m) => m.timestamp >= since)
  }
  const values = filtered.map((m) => m.value)
  const agg = input.aggregate as string ?? 'count'
  let result: number
  switch (agg) {
    case 'sum': result = values.reduce((a, b) => a + b, 0); break
    case 'avg': result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0; break
    case 'max': result = values.length > 0 ? Math.max(...values) : 0; break
    case 'min': result = values.length > 0 ? Math.min(...values) : 0; break
    default: result = values.length
  }
  return { aggregate: agg, value: result, sampleSize: values.length }
})

server.tool(manifest.tools[2], async () => {
  const byName = new Map<string, { count: number; lastValue: number; types: Set<string> }>()
  for (const m of metrics) {
    const existing = byName.get(m.name)
    if (existing) {
      existing.count++
      existing.lastValue = m.value
      existing.types.add(m.type)
    } else {
      byName.set(m.name, { count: 1, lastValue: m.value, types: new Set([m.type]) })
    }
  }
  return {
    totalDataPoints: metrics.length,
    uniqueMetrics: byName.size,
    metrics: Array.from(byName.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      lastValue: data.lastValue,
      types: Array.from(data.types),
    })),
  }
})

server.register()
export default server
