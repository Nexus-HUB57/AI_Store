import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

interface PurchaseItem {
  id: string
  nome: string
  precoSats: number
}

interface PurchaseRequest {
  items: PurchaseItem[]
  totalSats: number
  agentId: string
  discountTotal: number
}

/**
 * Discount tiers for new agents:
 * - Purchases 1-3: 100% FREE (full discount)
 * - Purchases 4-50: 50% OFF (half price)
 * - Purchases 51+: No discount
 */
function getDiscountTier(purchaseCount: number): { tier: string; percent: number } {
  if (purchaseCount < 3) return { tier: 'free', percent: 100 }
  if (purchaseCount < 50) return { tier: 'half', percent: 50 }
  return { tier: 'none', percent: 0 }
}

export async function POST(req: NextRequest) {
  try {
    const body: PurchaseRequest = await req.json()

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })
    }

    if (!body.agentId) {
      return NextResponse.json({ error: 'Agente não autenticado' }, { status: 401 })
    }

    // Fetch agent with current purchaseCount
    const agent = await db.agent.findUnique({ where: { id: body.agentId } })
    if (!agent) {
      return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
    }

    const purchaseCount = agent.purchaseCount || 0
    const { tier, percent } = getDiscountTier(purchaseCount)

    // Calculate per-item discounts based on purchase position
    const itemResults = []
    let totalCharged = 0
    let totalDiscount = 0
    let currentPurchaseIdx = purchaseCount

    for (const item of body.items) {
      const itemTier = getDiscountTier(currentPurchaseIdx)
      const discountAmount = Math.floor(item.precoSats * (itemTier.percent / 100))
      const charged = item.precoSats - discountAmount

      itemResults.push({
        ...item,
        originalPrice: item.precoSats,
        discountAmount,
        chargedPrice: charged,
        tier: itemTier.tier,
        tierLabel: itemTier.tier === 'free' ? 'GRÁTIS' : itemTier.tier === 'half' ? '-50%' : '',
      })

      totalCharged += charged
      totalDiscount += discountAmount
      currentPurchaseIdx++
    }

    // Check balance
    if (totalCharged > agent.balanceSats) {
      return NextResponse.json({
        error: 'Saldo insuficiente',
        required: totalCharged,
        balance: agent.balanceSats,
      }, { status: 400 })
    }

    const txId = `bAI-${uuidv4().slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`
    const confirmations = Math.floor(Math.random() * 3) + 1

    // Find or create system seller (nexus-genesis)
    let seller = await db.agent.findFirst({ where: { address: '@nexus-genesis' } })
    if (!seller) {
      seller = await db.agent.create({
        data: {
          address: '@nexus-genesis',
          displayName: 'Nexus AI-OS',
          role: 'admin',
          balanceSats: 0,
          referralCode: 'NEXUS-ROOT',
          capabilities: '[]',
        },
      })
    }

    // Create transactions per item and update DB
    for (let i = 0; i < body.items.length; i++) {
      const item = itemResults[i]
      const product = await db.product.findUnique({ where: { id: item.id } })

      await db.transaction.create({
        data: {
          type: tier === 'free' ? 'purchase_free' : tier === 'half' ? 'purchase_discounted' : 'purchase',
          status: 'confirmed',
          amountSats: item.originalPrice,
          discountSats: item.discountAmount,
          buyerId: agent.id,
          sellerId: product?.authorAgent === agent.displayName ? agent.id : seller.id,
          productId: item.id,
          txHash: `${txId}-${i}`,
          blockHeight: 1847293 + Math.floor(Math.random() * 100),
        },
      })

      // Increment product downloads
      if (product) {
        await db.product.update({
          where: { id: item.id },
          data: { downloads: { increment: 1 } },
        })
      }
    }

    // Debit buyer balance
    await db.agent.update({
      where: { id: agent.id },
      data: {
        balanceSats: { decrement: totalCharged },
        purchaseCount: purchaseCount + body.items.length,
      },
    })

    // Credit seller
    await db.agent.update({
      where: { id: seller.id },
      data: { balanceSats: { increment: totalCharged } },
    })

    const newBalance = agent.balanceSats - totalCharged

    return NextResponse.json({
      success: true,
      txId,
      totalOriginal: body.totalSats,
      totalDiscount: totalDiscount,
      totalCharged,
      items: itemResults,
      newBalance,
      confirmations,
      network: 'bAI-mainnet',
      blockHash: `0x${Buffer.from(txId).toString('hex').slice(0, 16)}...`,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Cart error:', e)
    return NextResponse.json({ error: 'Erro na transação' }, { status: 500 })
  }
}

/** GET: network info + discount tier for agent */
export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId')

  let discountTier = { tier: 'free', percent: 100, nextFree: 3, nextDiscounted: 47 }

  if (agentId) {
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      select: { purchaseCount: true, balanceSats: true },
    })
    if (agent) {
      discountTier = {
        tier: agent.purchaseCount < 3 ? 'free' : agent.purchaseCount < 50 ? 'half' : 'none',
        percent: agent.purchaseCount < 3 ? 100 : agent.purchaseCount < 50 ? 50 : 0,
        nextFree: Math.max(0, 3 - agent.purchaseCount),
        nextDiscounted: Math.max(0, 50 - agent.purchaseCount),
      }
    }
  }

  return NextResponse.json({
    network: 'bAI-mainnet',
    blockHeight: 1847293,
    mempoolSize: 42,
    avgFee: 1,
    totalSupply: '21_000_000 bAI',
    circulating: '14_302_891 bAI',
    discountTier,
  })
}
