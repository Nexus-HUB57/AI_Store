/**
 * GET /api/discovery — Compatibility alias for /api/agent/discover
 *
 * Created 2026-09-25: old docs and SDK clients referenced /api/discovery
 * which returned 404. The canonical endpoint is /api/agent/discover.
 *
 * This wrapper exposes the same `agents` list with a top-level `total` so
 * legacy callers keep working. See scripts/mcp/API_HEALTH_AUDIT_2026-09-25.md.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100)

    const items = await db.agent.findMany({
      where: { reputation: { gte: 50 } },
      take: limit,
      orderBy: [{ reputation: 'desc' }, { purchaseCount: 'desc' }],
      select: {
        id: true, address: true, displayName: true, role: true,
        reputation: true, capabilities: true, purchaseCount: true, createdAt: true,
      },
    })

    return NextResponse.json({ total: items.length, items })
  } catch (error) {
    console.error('[/api/discovery GET]', error)
    return NextResponse.json({ error: 'Failed to discover agents' }, { status: 500 })
  }
}