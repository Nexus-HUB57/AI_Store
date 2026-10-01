import { NextResponse } from 'next/server'
import { listExperientialTraces } from '@/lib/experiential-bridge'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/experiential/traces
 *
 * Lista traces sincronizados. Suporta filtros: project, model, source, limit, offset.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const project = url.searchParams.get('project') || undefined
    const model = url.searchParams.get('model') || undefined
    const source = url.searchParams.get('source') || undefined
    const limit = Number(url.searchParams.get('limit') || 100)
    const offset = Number(url.searchParams.get('offset') || 0)
    const result = await listExperientialTraces({ project, model, source, limit, offset })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    logger.error('[/api/experiential/traces GET]', { error })
    return NextResponse.json({ ok: false, error: 'list failed' }, { status: 500 })
  }
}
