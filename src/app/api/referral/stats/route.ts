import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) {
    return NextResponse.json({ error: 'agentId obrigatório' }, { status: 400 })
  }

  const [rewards, agent] = await Promise.all([
    db.referralReward.findMany({
      where: { referrerId: agentId },
      include: {
        referred: { select: { id: true, displayName: true, address: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.agent.findUnique({
      where: { id: agentId },
      select: { referralCode: true, balanceSats: true, displayName: true },
    }),
  ])

  const totalEarned = rewards.reduce((s, r) => s + r.amountSats, 0)
  const pendingRewards = rewards.filter((r) => !r.claimed)
  const totalPending = pendingRewards.reduce((s, r) => s + r.amountSats, 0)

  return NextResponse.json({
    referralCode: agent?.referralCode || '',
    displayName: agent?.displayName || '',
    totalReferrals: rewards.length,
    totalEarned,
    totalPending,
    rewards,
  })
}
