import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const SIGNUP_BONUS = 10000 // 100 BAIT tokens (1 BAIT = 100 sats)
const REFERRAL_BONUS = 2500 // 25 BAIT tokens

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'NEXUS-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(req: NextRequest) {
  try {
    const { address, displayName, referralCode } = await req.json()

    if (!address) {
      return NextResponse.json({ error: 'Endereço obrigatório' }, { status: 400 })
    }

    // Check if agent already exists
    const existing = await db.agent.findUnique({ where: { address } })

    if (existing) {
      const caps = JSON.parse(existing.capabilities || '[]')
      return NextResponse.json({
        agent: {
          id: existing.id,
          address: existing.address,
          displayName: existing.displayName,
          role: existing.role,
          reputation: existing.reputation,
          balanceSats: existing.balanceSats,
          purchaseCount: existing.purchaseCount,
          referralCode: existing.referralCode,
          capabilities: caps,
          isNew: false,
        },
      })
    }

    // New agent — create with signup bonus
    const code = generateReferralCode()
    let referredById = ''
    let referralBonusGiven = false

    // Handle referral
    if (referralCode) {
      const referrer = await db.agent.findFirst({ where: { referralCode } })
      if (referrer) {
        referredById = referrer.id
      }
    }

    const agent = await db.agent.create({
      data: {
        address,
        displayName: displayName || address.slice(0, 12) + '...',
        role: 'buyer',
        reputation: 50,
        balanceSats: 100000 + SIGNUP_BONUS, // base 100K + 100 BAIT bonus
        capabilities: JSON.stringify(['ML_INFERENCE', 'DATA_PROCESSING']),
        referralCode: code,
        referredBy: referredById,
        purchaseCount: 0,
      },
    })

    // Create signup bonus transaction
    await db.transaction.create({
      data: {
        type: 'signup_bonus',
        status: 'confirmed',
        amountSats: SIGNUP_BONUS,
        discountSats: 0,
        buyerId: agent.id,
        sellerId: agent.id,
        txHash: `bAI-bonus-${agent.id.slice(0, 8)}-${Date.now().toString(36)}`,
        blockHeight: 0,
      },
    })

    // Give referral bonus to referrer
    if (referredById) {
      await db.agent.update({
        where: { id: referredById },
        data: { balanceSats: { increment: REFERRAL_BONUS } },
      })

      await db.referralReward.create({
        data: {
          referrerId: referredById,
          referredId: agent.id,
          amountSats: REFERRAL_BONUS,
          type: 'referral_signup',
          claimed: true,
        },
      })

      await db.transaction.create({
        data: {
          type: 'referral_bonus',
          status: 'confirmed',
          amountSats: REFERRAL_BONUS,
          discountSats: 0,
          buyerId: referredById,
          sellerId: agent.id,
          txHash: `bAI-ref-${referredById.slice(0, 6)}-${Date.now().toString(36)}`,
          blockHeight: 0,
        },
      })

      referralBonusGiven = true
    }

    const caps = JSON.parse(agent.capabilities || '[]')

    return NextResponse.json({
      agent: {
        id: agent.id,
        address: agent.address,
        displayName: agent.displayName,
        role: agent.role,
        reputation: agent.reputation,
        balanceSats: agent.balanceSats,
        purchaseCount: agent.purchaseCount,
        referralCode: agent.referralCode,
        capabilities: caps,
        isNew: true,
      },
      referralBonusGiven,
      signupBonus: SIGNUP_BONUS,
    })
  } catch (e) {
    console.error('Auth error:', e)
    return NextResponse.json({ error: 'Erro na autenticação' }, { status: 500 })
  }
}
