/**
 * GET /api/reputation — Compatibility alias for /api/agent/reputation
 *
 * Created 2026-09-25: legacy docs referenced /api/reputation which returned
 * 404. The canonical endpoint is /api/agent/reputation.
 *
 * Note: there is no separate `Reputation` model in the schema — reputation
 * is a field on Agent. This endpoint returns agents ranked by reputation
 * with optional ?agentId= filter to mirror legacy callers' expectations.
 *
 * See scripts/mcp/API_HEALTH_AUDIT_2026-09-25.md.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const agentId = url.searchParams.get('agentId') || undefined
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)

    if (agentId) {
      const agent = await db.agent.findUnique({
        where: { address: agentId },
        select: {
          id: true, address: true, displayName: true,
          reputation: true, purchaseCount: true, createdAt: true,
        },
      })
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }
      return NextResponse.json({ items: [agent], total: 1 })
    }

    const items = await db.agent.findMany({
      take: limit,
      orderBy: [{ reputation: 'desc' }, { purchaseCount: 'desc' }],
      select: {
        id: true, address: true, displayName: true,
        reputation: true, purchaseCount: true, createdAt: true,
      },
    })

    return NextResponse.json({ total: items.length, items })
  } catch (error) {
    console.error('[/api/reputation GET]', error)
    return NextResponse.json({ error: 'Failed to list reputation' }, { status: 500 })
  }
}