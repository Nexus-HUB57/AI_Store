import { NextResponse } from 'next/server'
import { listExperientialRouters } from '@/lib/experiential-bridge'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/experiential/routers
 *
 * Lista frozen routers sincronizados. Suporta filtros: project, status, limit, offset.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const project = url.searchParams.get('project') || undefined
    const status = url.searchParams.get('status') || undefined
    const limit = Number(url.searchParams.get('limit') || 100)
    const offset = Number(url.searchParams.get('offset') || 0)
    const result = await listExperientialRouters({ project, status, limit, offset })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    logger.error('[/api/experiential/routers GET]', { error })
    return NextResponse.json({ ok: false, error: 'list failed' }, { status: 500 })
  }
}
