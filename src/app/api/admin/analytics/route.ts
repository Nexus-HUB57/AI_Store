import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recordCall } from '@/app/api/agent/metrics/route'
import { getEventStats, getConversionFunnel } from '@/lib/event-tracker'

export async function GET(req: NextRequest) {
  const period = (req.nextUrl.searchParams.get('period') || '24h') as '1h' | '24h' | '7d' | '30d'

  function getPeriodMs(p: string): number {
    switch (p) {
      case '1h': return 3600000
      case '24h': return 86400000
      case '7d': return 604800000
      case '30d': return 2592000000
      default: return 86400000
    }
  }

  const startTime = Date.now()
  try {
    const [productCount, agentCount, txCount, reviewCount, totalDownloads, totalRevenue] =
      await Promise.all([
        db.product.count(),
        db.agent.count(),
        db.transaction.count(),
        db.review.count(),
        db.product.aggregate({ _sum: { downloads: true } }),
        db.transaction.aggregate({
          where: { status: 'confirmed' },
          _sum: { amountSats: true, discountSats: true },
        }),
      ])

    const revenueSats = totalRevenue._sum.amountSats || 0
    const discountSats = totalRevenue._sum.discountSats || 0
    const downloads = totalDownloads._sum.downloads || 0

    // Category distribution
    const categoryDist = await db.product.groupBy({
      by: ['segmento'],
      _count: { id: true },
      _avg: { rating: true, pulsarEnergy: true },
      _sum: { downloads: true },
      orderBy: { _count: { id: 'desc' } },
    })

    // Top products by downloads
    const topProducts = await db.product.findMany({
      take: 10,
      orderBy: { downloads: 'desc' },
      select: {
        id: true, nome: true, slug: true, segmento: true,
        downloads: true, rating: true, precoSats: true, pulsarEnergy: true,
      },
    })

    // Recent transactions
    const recentTx = await db.transaction.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, type: true, status: true,
        amountSats: true, discountSats: true,
        txHash: true, blockHeight: true, createdAt: true,
        buyer: { select: { displayName: true, address: true } },
        product: { select: { nome: true, slug: true } },
      },
    })

    // Agent leaderboard
    const topAgents = await db.agent.findMany({
      take: 10,
      orderBy: { purchaseCount: 'desc' },
      select: {
        id: true, displayName: true, address: true,
        purchaseCount: true, balanceSats: true, reputation: true,
        createdAt: true,
      },
    })

    // Revenue over time (last 7 days by day)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
    const revenueByDay = await db.transaction.groupBy({
      by: ['createdAt'],
      where: {
        status: 'confirmed',
        createdAt: { gte: sevenDaysAgo },
      },
      _sum: { amountSats: true },
    })

    // Analytics funnel
    const funnel = getConversionFunnel()
    const eventStats = getEventStats()

    const latencyMs = Date.now() - startTime
    recordCall({ endpoint: '/api/admin/analytics', method: 'GET', statusCode: 200, latencyMs })

    return NextResponse.json({
      meta: { period, generated_at: new Date().toISOString(), latency_ms: latencyMs },
      kpis: {
        total_products: productCount,
        total_agents: agentCount,
        total_transactions: txCount,
        total_reviews: reviewCount,
        total_downloads: downloads,
        total_revenue_sats: revenueSats,
        total_revenue_bait: Math.round(revenueSats / 100),
        total_discounts_sats: discountSats,
        avg_product_rating: categoryDist.length > 0
          ? Math.round(categoryDist.reduce((s, c) => s + (c._avg.rating || 0), 0) / categoryDist.length * 10) / 10
          : 0,
      },
      category_distribution: categoryDist.map(c => ({
        segment: c.segmento,
        count: c._count.id,
        avg_rating: Math.round((c._avg.rating || 0) * 10) / 10,
        avg_pulsar: Math.round((c._avg.pulsarEnergy || 0) * 10) / 10,
        total_downloads: c._sum.downloads || 0,
      })),
      top_products: topProducts,
      top_agents: topAgents,
      recent_transactions: recentTx,
      revenue_by_day: revenueByDay.map(r => ({
        date: r.createdAt.toISOString().split('T')[0],
        revenue_sats: r._sum.amountSats || 0,
      })),
      funnel,
      events: eventStats,
    })
  } catch (error) {
    const latencyMs = Date.now() - startTime
    recordCall({ endpoint: '/api/admin/analytics', method: 'GET', statusCode: 500, latencyMs })
    return NextResponse.json(
      { error: 'Analytics fetch failed', details: String(error) },
      { status: 500 },
    )
  }
}
