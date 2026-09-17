import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/mcp/[slug] — Get MCP package details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const pkg = await db.mcpPackage.findUnique({
      where: { slug },
      include: { tools: true },
    })

    if (!pkg) {
      return NextResponse.json({ error: 'MCP package not found' }, { status: 404 })
    }

    return NextResponse.json(pkg)
  } catch (error) {
    console.error('[/api/mcp/[slug] GET]', error)
    return NextResponse.json({ error: 'Failed to get MCP package' }, { status: 500 })
  }
}
