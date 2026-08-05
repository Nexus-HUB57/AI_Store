import { db } from '@/lib/db'
import { computeReputation, getReputationBadge, getSandboxTrialCount } from '@/lib/reputation-engine'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) {
    return NextResponse.json({ error: 'agentId obrigatório' }, { status: 400 })
  }

  try {
  const agent = await db.agent.findUnique({ where: { id: agentId } })
  if (!agent) {
    return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
  }

  const [buyerTxs, reviews, referralCount] = await Promise.all([
    db.transaction.findMany({
      where: { buyerId: agentId },
      select: { status: true },
    }),
    db.review.findMany({
      where: { agentId },
      select: { rating: true },
    }),
    db.referralReward.count({
      where: { referrerId: agentId, claimed: true },
    }),
  ])

  const totalTxs = buyerTxs.length
  const successfulTxs = buyerTxs.filter(t => t.status === 'confirmed').length

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  const sandboxTrials = getSandboxTrialCount(agentId)

  const reputation = computeReputation({
    purchaseCount: agent.purchaseCount,
    reputation: agent.reputation,
    balanceSats: agent.balanceSats,
    createdAt: agent.createdAt,
    referrals: referralCount,
    reviewAvgRating: avgRating,
    successfulTxs,
    totalTxs,
    sandboxTrials,
  })

  const badge = getReputationBadge(reputation.grade)

  return NextResponse.json({
    agent_id: agent.id,
    reputation,
    badge: { ...badge, grade: reputation.grade },
  })
  } catch (error) {
    console.error('agent/reputation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
