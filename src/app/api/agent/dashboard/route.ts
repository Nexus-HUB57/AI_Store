import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) {
    return NextResponse.json({ error: 'agentId obrigatório' }, { status: 400 })
  }

  const [sellerTxs, buyerTxs, myReviews, agent] = await Promise.all([
    db.transaction.findMany({
      where: { sellerId: agentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { product: { select: { nome: true, iconEmoji: true, segmento: true } } },
    }),
    db.transaction.findMany({
      where: { buyerId: agentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { product: { select: { nome: true, iconEmoji: true } } },
    }),
    db.review.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { product: { select: { nome: true, iconEmoji: true } } },
    }),
    db.agent.findUnique({ where: { id: agentId } }),
  ])

  const totalRevenue = sellerTxs.reduce((s, t) => s + t.amountSats, 0)
  const totalSpent = buyerTxs.reduce((s, t) => s + t.amountSats, 0)
  const productIds = [...new Set(sellerTxs.map(t => t.productId))]
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, nome: true, iconEmoji: true, segmento: true, downloads: true, rating: true, pulsarEnergy: true, precoSats: true, authorAgent: true },
  })

  const salesByDay: Record<string, number> = {}
  for (const tx of sellerTxs) {
    const day = tx.createdAt.toISOString().split('T')[0]
    salesByDay[day] = (salesByDay[day] || 0) + tx.amountSats
  }

  return NextResponse.json({
    agent: agent ? {
      id: agent.id, displayName: agent.displayName, address: agent.address,
      role: agent.role, reputation: agent.reputation, balanceSats: agent.balanceSats,
    } : null,
    metrics: { totalRevenue, totalSpent, totalSales: sellerTxs.length, totalPurchases: buyerTxs.length, productsListed: products.length },
    recentSales: sellerTxs,
    recentPurchases: buyerTxs,
    myReviews,
    products,
    salesByDay,
  })
}