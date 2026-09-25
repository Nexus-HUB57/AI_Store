/**
 * GET /api/agents — Compatibility alias for /api/agent/metrics
 *
 * Created 2026-09-25: external docs and old client code referenced
 * /api/agents which returned 404. The canonical endpoint is /api/agent/metrics.
 * This thin wrapper forwards query params and keeps the legacy contract alive.
 *
 * See scripts/mcp/API_HEALTH_AUDIT_2026-09-25.md.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)
    const minReputation = parseInt(url.searchParams.get('minReputation') || '0', 10)
    const search = url.searchParams.get('q') || undefined

    const where: Record<string, unknown> = {}
    if (minReputation > 0) where.reputation = { gte: minReputation }
    if (search) {
      where.OR = [
        { address: { contains: search } },
        { displayName: { contains: search } },
      ]
    }

    const items = await db.agent.findMany({
      where,
      take: limit,
      orderBy: [{ reputation: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true, address: true, displayName: true, role: true,
        reputation: true, purchaseCount: true, createdAt: true, updatedAt: true,
      },
    })

    return NextResponse.json({ total: items.length, items })
  } catch (error) {
    console.error('[/api/agents GET]', error)
    return NextResponse.json({ error: 'Failed to list agents' }, { status: 500 })
  }
}