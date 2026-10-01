import { NextResponse } from 'next/server'
import {
  syncExperiential,
  listExperientialSyncs,
  experientialMeta,
} from '@/lib/experiential-bridge'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 180 // 3min; sync pode envolver build de router

/**
 * POST /api/experiential/sync
 *
 * Invoca `exp` CLI (ou fallback filesystem) e espelha traces + routers
 * nas tabelas `ExperientialTrace`, `ExperientialRouter`, `ExperientialSync`.
 * Idempotente.
 *
 * Body opcional: { trigger?: 'manual'|'cron'|'webhook', source?: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const result = await syncExperiential({
      trigger: body.trigger || 'manual',
      source: body.source,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    logger.error('[/api/experiential/sync POST]', { error })
    return NextResponse.json({ ok: false, error: 'sync failed' }, { status: 500 })
  }
}

/**
 * GET /api/experiential/sync
 *
 * Lista histórico de syncs (últimos 50 por padrão).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limit = Number(url.searchParams.get('limit') || 50)
    const trigger = url.searchParams.get('trigger') || undefined
    const [syncs, meta] = await Promise.all([
      listExperientialSyncs({ limit, trigger }),
      Promise.resolve(experientialMeta),
    ])
    return NextResponse.json({
      ok: true,
      syncs,
      meta: {
        repo: meta.repo,
        version: meta.version,
        root: meta.root,
        cli_available: await meta.cli_available(),
      },
    })
  } catch (error) {
    logger.error('[/api/experiential/sync GET]', { error })
    return NextResponse.json({ ok: false, error: 'list failed' }, { status: 500 })
  }
}
