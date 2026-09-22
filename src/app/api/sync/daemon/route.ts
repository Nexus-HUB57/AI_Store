import { NextResponse } from 'next/server'
import { syncProductsFromDaemon, getDaemonMarketplaceStats } from '@/lib/daemon-marketplace-bridge'

/** POST /api/sync/daemon — Trigger full sync of daemon products into local DB */
export async function POST() {
  try {
    const result = await syncProductsFromDaemon()
    return NextResponse.json({
      success: true,
      synced: result.upserted,
      totalFetched: result.totalFetched,
      errors: result.errors,
      durationMs: result.durationMs,
      message: `Synced ${result.upserted}/${result.totalFetched} products from b'AI'tcoin daemon in ${result.durationMs}ms`,
    })
  } catch (error) {
    console.error('[sync/daemon] error:', error)
    return NextResponse.json(
      { success: false, error: 'Sync failed', details: String(error) },
      { status: 500 },
    )
  }
}

/** GET /api/sync/daemon — Get daemon marketplace stats */
export async function GET() {
  try {
    const stats = await getDaemonMarketplaceStats()
    const listings = stats.listings ?? 0
    const active = stats.active ?? 0
    return NextResponse.json({
      daemonOnline: listings > 0 || active > 0,
      ...stats,
    })
  } catch (error) {
    return NextResponse.json({
      daemonOnline: false,
      listings: 0,
      active: 0,
      purchases: 0,
      totalVolumeBait: 0,
      error: String(error),
    })
  }
}