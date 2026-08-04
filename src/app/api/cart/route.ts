import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { purchaseSchema, validate } from '@/lib/schemas'
import { agentErrorResponse } from '@/lib/error-resolver'
import { recordCall } from '@/app/api/agent/metrics/route'
import { logger } from '@/lib/logger'
import { baitWallet, satsToBAIT, formatSats } from '@/lib/wallet-sdk'

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
    const raw = await req.json()
    const parsed = validate(purchaseSchema, raw)
    if (!parsed.success) {
      return agentErrorResponse('/api/cart', new Error(parsed.error.message), 400)
    }
    const body = parsed.data

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

    // Check balance via Wallet SDK
    const balanceCheck = baitWallet.validateBalance({ balance: agent.balanceSats, amountSats: totalCharged })
    if (!balanceCheck.sufficient) {
      const err = new Error(`Saldo insuficiente: necessário ${totalCharged}, disponível ${agent.balanceSats}`)
      Object.assign(err, { balance: agent.balanceSats, required: totalCharged })
      return agentErrorResponse('/api/cart', err, 400)
    }

    // Create, sign, and broadcast the main transaction via Wallet SDK
    const tx = baitWallet.createTransaction({
      from: agent.address,
      to: '@nexus-genesis',
      amountSats: totalCharged,
      type: 'purchase',
      metadata: { items: body.items.length, discountTier: tier },
    })
    const signedTx = baitWallet.signTransaction(tx)
    const receipt = await baitWallet.broadcast(signedTx)

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

      // Per-item Wallet SDK transaction
      const itemTx = baitWallet.createTransaction({
        from: agent.address,
        to: '@nexus-genesis',
        amountSats: item.chargedPrice,
        type: 'purchase',
        metadata: { productId: item.id, tier: item.tier },
      })
      const signedItemTx = baitWallet.signTransaction(itemTx)

      await db.transaction.create({
        data: {
          type: tier === 'free' ? 'purchase_free' : tier === 'half' ? 'purchase_discounted' : 'purchase',
          status: 'confirmed',
          amountSats: item.originalPrice,
          discountSats: item.discountAmount,
          buyerId: agent.id,
          sellerId: product?.authorAgent === agent.displayName ? agent.id : seller.id,
          productId: item.id,
          txHash: signedItemTx.txId,
          blockHeight: receipt.blockHeight + i,
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
      txId: receipt.txId,
      totalOriginal: body.totalSats,
      totalDiscount: totalDiscount,
      totalCharged,
      totalBAIT: satsToBAIT(totalCharged),
      totalChargedFormatted: formatSats(totalCharged),
      items: itemResults,
      newBalance,
      confirmations: receipt.confirmations,
      network: 'bAI-mainnet',
      blockHash: receipt.blockHash,
      blockHeight: receipt.blockHeight,
      timestamp: receipt.timestamp,
    })
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'Erro desconhecido'
    logger.error('cart_purchase_failed', { error: errMsg })
    return agentErrorResponse('/api/cart', e, 500)
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

  const networkInfo = baitWallet.getNetworkInfo()

  return NextResponse.json({
    network: `bAI-${networkInfo.network}`,
    blockHeight: networkInfo.blockHeight,
    mempoolSize: 42,
    avgFee: networkInfo.avgFee,
    totalSupply: networkInfo.totalSupply,
    circulating: networkInfo.circulating,
    discountTier,
  })
}
