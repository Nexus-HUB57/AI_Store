// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Static sub-paths that have their own route handlers under
// src/app/api/mcp/ or mcp/src/app/api/mcp/. The dynamic [slug] matcher
// would otherwise shadow them in Next.js routing.
const STATIC_SUBPATHS = new Set(['catalog', 'health', 'install', 'acquire', 'call', 'compact'])

/**
 * GET /api/mcp/[slug] — Get MCP package details
 *
 * Refactored 2026-09-25:
 *   1. Was using `where: { slug }` but McpPackage has no `slug` field —
 *      only `name`. Switched to `where: { name: slug }`.
 *   2. Added guard so static subpaths (catalog/health/install/...) bypass
 *      this dynamic matcher, letting their dedicated route handlers serve.
 *   See scripts/mcp/API_HEALTH_AUDIT_2026-09-25.md for full diagnosis.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    if (STATIC_SUBPATHS.has(slug)) {
      return NextResponse.json({ error: 'Use dedicated subroute' }, { status: 404 })
    }
    const pkg = await db.mcpPackage.findUnique({
      where: { name: slug },
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
