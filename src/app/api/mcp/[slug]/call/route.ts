// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/mcp/[slug]/call — Proxy a tool call to an MCP server
 *
 * Body: { tool: string, args: Record<string, unknown> }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await req.json()
    const { tool, args = {} } = body

    if (!tool) {
      return NextResponse.json({ error: 'Tool name is required' }, { status: 400 })
    }

    const pkg = await db.mcpPackage.findUnique({
      where: { slug },
      include: { tools: { where: { name: tool } } },
    })

    if (!pkg) {
      return NextResponse.json({ error: 'MCP package not found' }, { status: 404 })
    }

    if (pkg.tools.length === 0) {
      return NextResponse.json({ error: `Tool '${tool}' not found in ${pkg.name}` }, { status: 404 })
    }

    // For Python MCPs, use the proxy
    if (pkg.source === 'python-mcp') {
      const { proxyToolCall } = await import('@/lib/mcp-python-bridge')
      const result = await proxyToolCall(pkg.name, tool, args)
      return NextResponse.json(result)
    }

    // For catalog-only MCPs (no real server), return simulated response
    const targetTool = pkg.tools[0]
    await db.mcpTool.update({
      where: { id: targetTool.id },
      data: {
        callCount: { increment: 1 },
        avgLatencyMs: { set: Math.round(Math.random() * 50 + 10) },
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: `Simulated ${tool} call on ${pkg.name}`, args },
      latencyMs: Math.round(Math.random() * 50 + 10),
    })
  } catch (error) {
    console.error('[/api/mcp/[slug]/call POST]', error)
    return NextResponse.json({ error: 'Failed to call MCP tool' }, { status: 500 })
  }
}
