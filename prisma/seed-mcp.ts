/**
 * MCP Ecosystem — Seed Script
 * Populates the database with initial MCP packages, tools, and demo data
 *
 * Usage: npx tsx prisma/seed-mcp.ts
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// ─── Package Definitions ─────────────────────────────────────────
const MCP_PACKAGES = [
  {
    name: 'mcp-tool-registry',
    slug: 'mcp-tool-registry',
    description: 'Central registry for MCP tool discovery and resolution',
    category: 'utility',
    tags: ['registry', 'discovery', 'tools'],
    authorAgent: '@nexus-genesis',
    tools: [
      { name: 'list_tools', description: 'List all registered MCP tools' },
      { name: 'resolve_tool', description: 'Resolve a FQN to its handler and schema' },
      { name: 'get_tool_schema', description: 'Get input/output JSON schema for a tool' },
    ],
  },
  {
    name: 'mcp-self-heal',
    slug: 'mcp-self-heal',
    description: 'Self-healing engine for MCP runtime — detects and remediates failures',
    category: 'self-heal',
    tags: ['self-heal', 'resilience', 'monitoring'],
    authorAgent: '@nexus-genesis',
    tools: [
      { name: 'report_event', description: 'Report a self-heal event' },
      { name: 'resolve_event', description: 'Mark a self-heal event as resolved' },
      { name: 'get_unresolved', description: 'Get all unresolved self-heal events' },
    ],
  },
  {
    name: 'mcp-rag-upgrader',
    slug: 'mcp-rag-upgrader',
    description: 'RAG feedback loop — collects retrieval feedback and upgrades knowledge base',
    category: 'rag',
    tags: ['rag', 'feedback', 'knowledge', 'retrieval'],
    authorAgent: '@nexus-genesis',
    tools: [
      { name: 'submit_feedback', description: 'Submit RAG feedback for a retrieval result' },
      { name: 'get_feedback_stats', description: 'Get aggregated RAG feedback statistics' },
      { name: 'suggest_upgrade', description: 'Suggest knowledge base upgrades' },
    ],
  },
  {
    name: 'mcp-agentic-awareness',
    slug: 'mcp-agentic-awareness',
    description: 'Agent awareness tracker — capability discovery and inter-agent coordination',
    category: 'communication',
    tags: ['agent', 'awareness', 'capabilities', 'coordination'],
    authorAgent: '@nexus-genesis',
    tools: [
      { name: 'register_agent', description: 'Register an agent with capabilities' },
      { name: 'discover_agents', description: 'Discover agents by capability' },
      { name: 'get_agent_profile', description: 'Get a specific agent profile' },
    ],
  },
  {
    name: 'mcp-telemetry',
    slug: 'mcp-telemetry',
    description: 'Telemetry collector — tracks tool calls, latency, errors, and usage metrics',
    category: 'monitoring',
    tags: ['telemetry', 'metrics', 'monitoring', 'observability'],
    authorAgent: '@nexus-genesis',
    tools: [
      { name: 'record_metric', description: 'Record a telemetry metric' },
      { name: 'query_metrics', description: 'Query aggregated metrics' },
      { name: 'get_dashboard', description: 'Get a summary dashboard of metrics' },
    ],
  },
  {
    name: 'mcp-marketplace',
    slug: 'mcp-marketplace',
    description: 'MCP marketplace — publish, discover, and acquire .aipkg packages',
    category: 'marketplace',
    tags: ['marketplace', 'packages', 'publish', 'acquire'],
    authorAgent: '@nexus-genesis',
    priceSats: 0,
    tools: [
      { name: 'publish_package', description: 'Publish a package to the marketplace' },
      { name: 'search_packages', description: 'Search the marketplace' },
      { name: 'acquire_package', description: 'Acquire a package from the marketplace' },
    ],
  },
  {
    name: 'mcp-oracle',
    slug: 'mcp-oracle',
    description: 'Oracle server — provides price feeds, on-chain data, and external API integrations',
    category: 'blockchain',
    tags: ['oracle', 'price-feed', 'on-chain', 'defi'],
    authorAgent: '@nexus-genesis',
    priceSats: 5000,
    tools: [
      { name: 'get_price', description: 'Get current price for a token pair' },
      { name: 'get_onchain_data', description: 'Fetch on-chain data for a contract' },
    ],
  },
  {
    name: 'mcp-bridge',
    slug: 'mcp-bridge',
    description: 'Cross-chain bridge adapter — facilitates asset transfers between chains',
    category: 'blockchain',
    tags: ['bridge', 'cross-chain', 'transfer'],
    authorAgent: '@nexus-genesis',
    priceSats: 8000,
    tools: [
      { name: 'initiate_transfer', description: 'Initiate a cross-chain transfer' },
      { name: 'check_status', description: 'Check transfer status' },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding MCP ecosystem...\n')

  for (const pkgDef of MCP_PACKAGES) {
    // Upsert package
    const pkg = await db.mcpPackage.upsert({
      where: { name: pkgDef.name },
      update: {
        slug: pkgDef.slug,
        description: pkgDef.description,
        category: pkgDef.category,
        tags: JSON.stringify(pkgDef.tags),
        authorAgent: pkgDef.authorAgent,
        toolsJson: JSON.stringify(pkgDef.tools),
        priceSats: pkgDef.priceSats ?? 0,
      },
      create: {
        name: pkgDef.name,
        slug: pkgDef.slug,
        description: pkgDef.description,
        category: pkgDef.category,
        tags: JSON.stringify(pkgDef.tags),
        authorAgent: pkgDef.authorAgent,
        toolsJson: JSON.stringify(pkgDef.tools),
        priceSats: pkgDef.priceSats ?? 0,
        manifestJson: JSON.stringify({ name: pkgDef.name, version: '1.0.0' }),
        verified: true,
        featured: pkgDef.name === 'mcp-tool-registry' || pkgDef.name === 'mcp-marketplace',
      },
    })

    // Upsert tools (find-first + create pattern since no unique compound index)
    for (const toolDef of pkgDef.tools) {
      const existing = await db.mcpTool.findFirst({
        where: { packageId: pkg.id, name: toolDef.name },
      })
      if (existing) {
        await db.mcpTool.update({
          where: { id: existing.id },
          data: { description: toolDef.description },
        })
      } else {
        await db.mcpTool.create({
          data: {
            packageId: pkg.id,
            name: toolDef.name,
            description: toolDef.description,
            inputSchema: JSON.stringify({ type: 'object', properties: {} }),
            outputSchema: JSON.stringify({ type: 'object', properties: {} }),
          },
        })
      }
    }

    console.log(`  ✅ ${pkgDef.name} (${pkgDef.tools.length} tools)`)
  }

  // Seed a demo self-heal event
  const firstPkg = await db.mcpPackage.findFirst({ where: { name: 'mcp-self-heal' } })
  if (firstPkg) {
    await db.mcpSelfHealEvent.create({
      data: {
        packageId: firstPkg.id,
        eventType: 'startup_check',
        severity: 'info',
        message: 'MCP ecosystem initialized — all servers healthy',
        contextJson: JSON.stringify({ seedVersion: '1.0.0' }),
        resolved: true,
        resolvedAt: new Date(),
      },
    })
  }

  const totalPackages = await db.mcpPackage.count()
  const totalTools = await db.mcpTool.count()

  console.log(`\n🌱 MCP seeding complete: ${totalPackages} packages, ${totalTools} tools`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
