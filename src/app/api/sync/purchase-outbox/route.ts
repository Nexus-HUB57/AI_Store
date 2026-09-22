import { NextRequest, NextResponse } from 'next/server'
import { reconcilePurchaseIntents } from '@/lib/purchase-outbox-worker'

function authorized(req: NextRequest): boolean {
  const expected = process.env.OUTBOX_WORKER_SECRET
  const supplied = req.headers.get('x-outbox-worker-secret')
  return Boolean(expected && supplied && supplied === expected)
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const results = await reconcilePurchaseIntents()
  const summary = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.status] = (acc[result.status] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({ ok: true, processed: results.length, summary })
}
