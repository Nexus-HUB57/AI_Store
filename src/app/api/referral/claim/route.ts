import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const REFERRAL_BONUS = 2500 // 25 BAIT tokens

export async function POST(req: NextRequest) {
  try {
    const { referrerAddress, newAgentAddress } = await req.json()

    if (!referrerAddress || !newAgentAddress) {
      return NextResponse.json({ error: 'Dados obrigatórios' }, { status: 400 })
    }

    const referrer = await db.agent.findUnique({ where: { address: referrerAddress } })
    if (!referrer) {
      return NextResponse.json({ error: 'Referrer não encontrado' }, { status: 404 })
    }

    const newAgent = await db.agent.findUnique({ where: { address: newAgentAddress } })
    if (!newAgent) {
      return NextResponse.json({ error: 'Novo agente não encontrado' }, { status: 404 })
    }

    // Check if already rewarded
    const existing = await db.referralReward.findFirst({
      where: { referrerId: referrer.id, referredId: newAgent.id },
    })

    if (existing) {
      return NextResponse.json({ error: 'Recompensa já concedida', reward: existing }, { status: 409 })
    }

    // Create reward and credit referrer
    const [reward] = await db.$transaction([
      db.referralReward.create({
        data: {
          referrerId: referrer.id,
          referredId: newAgent.id,
          amountSats: REFERRAL_BONUS,
          type: 'referral_manual_claim',
          claimed: true,
        },
      }),
      db.agent.update({
        where: { id: referrer.id },
        data: { balanceSats: { increment: REFERRAL_BONUS } },
      }),
      db.transaction.create({
        data: {
          type: 'referral_bonus',
          status: 'confirmed',
          amountSats: REFERRAL_BONUS,
          discountSats: 0,
          buyerId: referrer.id,
          sellerId: newAgent.id,
          txHash: `bAI-ref-claim-${Date.now().toString(36)}`,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      reward: {
        id: reward.id,
        amountSats: REFERRAL_BONUS,
        type: 'referral_manual_claim',
      },
      newBalance: referrer.balanceSats + REFERRAL_BONUS,
    })
  } catch (e) {
    console.error('Referral claim error:', e)
    return NextResponse.json({ error: 'Erro ao processar indicação' }, { status: 500 })
  }
}
