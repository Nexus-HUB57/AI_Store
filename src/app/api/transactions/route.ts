/**
 * GET /api/transactions — list transactions (with optional filters)
 *
 * Created 2026-09-25: this endpoint was returning 404 because no route
 * existed in src/app/api/transactions/, even though the frontend (and
 * /api/health) advertises it. See scripts/mcp/API_HEALTH_AUDIT_2026-09-25.md.
 *
 * Mirrors the pattern used by /api/products for consistency.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const buyerId = url.searchParams.get('buyerId') || undefined
    const sellerId = url.searchParams.get('sellerId') || undefined
    const productId = url.searchParams.get('productId') || undefined
    const status = url.searchParams.get('status') || undefined

    const where: Record<string, unknown> = {}
    if (buyerId) where.buyerId = buyerId
    if (sellerId) where.sellerId = sellerId
    if (productId) where.productId = productId
    if (status) where.status = status

    const [items, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          product: { select: { id: true, nome: true, slug: true, segmento: true } },
          buyer: { select: { id: true, address: true, displayName: true } },
          seller: { select: { id: true, address: true, displayName: true } },
        },
      }),
      db.transaction.count({ where }),
    ])

    return NextResponse.json({ items, total, limit, offset })
  } catch (error) {
    console.error('[/api/transactions GET]', error)
    return NextResponse.json({ error: 'Failed to list transactions' }, { status: 500 })
  }
}