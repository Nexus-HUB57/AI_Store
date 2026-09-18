// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/mcp — List MCP packages
 * Query params: category, source, verified, featured, search, limit, offset
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || undefined
    const source = searchParams.get('source') || undefined
    const verified = searchParams.get('verified') === 'true' ? true : searchParams.get('verified') === 'false' ? false : undefined
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
    return NextResponse.json({ error: 'Failed to list MCPs' }, { status: 500 })
  }
}

/**
 * POST /api/mcp — Register Python MCPs or trigger catalog action
 * Body: { action: 'register' | 'handshake' | 'health' }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'register') {
      // Re-register all Python MCPs from manifests
      const { registerAllPythonMCPs } = await import('@/lib/mcp-python-bridge')
      const result = await registerAllPythonMCPs()
      return NextResponse.json(result)
    }

    if (action === 'health') {
      // Run health check on Python MCPs
      const { healthCheckAllPythonMCPs } = await import('@/lib/mcp-python-bridge')
      const result = await healthCheckAllPythonMCPs()
      return NextResponse.json(result)
    }

    if (action === 'stats') {
      // Return catalog stats
      const [total, tools, featured, verified, pythonMCPs, categories] = await Promise.all([
        db.mcpPackage.count(),
        db.mcpTool.count(),
        db.mcpPackage.count({ where: { featured: true } }),
        db.mcpPackage.count({ where: { verified: true } }),
        db.mcpPackage.count(),
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
        pythonMCPs,
        categories: categories.map(c => ({ name: c.category, count: c._count.category })),
      })
    }

    return NextResponse.json({ error: 'Unknown action. Use: register, health, stats' }, { status: 400 })
  } catch (error) {
    console.error('[/api/mcp POST]', error)
    return NextResponse.json({ error: 'Failed to process MCP action' }, { status: 500 })
  }
}
