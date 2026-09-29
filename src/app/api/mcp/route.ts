// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/mcp — List MCP packages
 * Soft-fails with empty list if McpPackage table/schema is not migrated yet
 * (avoids hard 500 that can cascade into client error UX).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || undefined
    const source = searchParams.get('source') || undefined
    const verified =
      searchParams.get('verified') === 'true'
        ? true
        : searchParams.get('verified') === 'false'
          ? false
          : undefined
    const featured = searchParams.get('featured') === 'true' ? true : undefined
    const search = searchParams.get('search') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (source) where.source = source
    if (verified !== undefined) where.verified = verified
    if (featured !== undefined) where.featured = featured
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
      ]
    }

    const [packages, total] = await Promise.all([
      db.mcpPackage.findMany({
        where,
        include: { tools: true },
        take: limit,
        skip: offset,
        orderBy: { downloads: 'desc' },
      }),
      db.mcpPackage.count({ where }),
    ])

    return NextResponse.json({ packages, total, limit, offset })
  } catch (error) {
    console.error('[/api/mcp GET]', error)
    // Soft-fail: catalog products (1504) remain the primary surface;
    // MCP table may not be seeded on HostGator yet.
    return NextResponse.json(
      {
        packages: [],
        total: 0,
        limit: 50,
        offset: 0,
        degraded: true,
        error: 'mcp_catalog_unavailable',
        hint: 'Run prisma db push + MCP seed on host; products API is independent.',
      },
      { status: 200 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'register') {
      const { registerAllPythonMCPs } = await import('@/lib/mcp-python-bridge')
      const result = await registerAllPythonMCPs()
      return NextResponse.json(result)
    }

    if (action === 'health') {
      const { healthCheckAllPythonMCPs } = await import('@/lib/mcp-python-bridge')
      const result = await healthCheckAllPythonMCPs()
      return NextResponse.json(result)
    }

    if (action === 'stats') {
      try {
        const [total, tools, featured, verified, categories] = await Promise.all([
          db.mcpPackage.count(),
          db.mcpTool.count(),
          db.mcpPackage.count({ where: { featured: true } }),
          db.mcpPackage.count({ where: { verified: true } }),
          db.mcpPackage.groupBy({
            by: ['category'],
            _count: { category: true },
            orderBy: { _count: { category: 'desc' } },
          }),
        ])
        return NextResponse.json({
          total,
          tools,
          featured,
          verified,
          categories: categories.map((c) => ({
            name: c.category,
            count: c._count.category,
          })),
        })
      } catch {
        return NextResponse.json({
          total: 0,
          tools: 0,
          featured: 0,
          verified: 0,
          categories: [],
          degraded: true,
        })
      }
    }

    return NextResponse.json(
      { error: 'Unknown action. Use: register, health, stats' },
      { status: 400 },
    )
  } catch (error) {
    console.error('[/api/mcp POST]', error)
    return NextResponse.json({ error: 'Failed to process MCP action' }, { status: 500 })
  }
}
