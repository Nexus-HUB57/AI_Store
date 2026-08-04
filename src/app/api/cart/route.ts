import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { purchaseSchema, validate } from '@/lib/schemas'
import { agentErrorResponse } from '@/lib/error-resolver'
import { recordCall } from '@/app/api/agent/metrics/route'
import { logger } from '@/lib/logger'
import { baitWallet, satsToBAIT, formatSats } from '@/lib/wallet-sdk'
import { trackPurchase } from '@/lib/event-tracker'

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

/**
 * Generate a deterministic idempotency key from request data.
 * Uses SHA-256 of agentId + first item id + totalSats.
 */
function generateIdempotencyKey(agentId: string, firstItemId: string, totalSats: number): string {
  const input = `${agentId}:${firstItemId}:${totalSats}`
  return createHash('sha256').update(input).digest('hex').slice(0, 32)
}

/**
 * Classify an error to provide a specific status code and message.
 * Known error types get targeted responses; unknown errors get 500.
 */
function classifyError(e: unknown, idempotencyKey: string): { statusCode: number; message: string } {
  const errMsg = e instanceof Error ? e.message : 'Erro desconhecido'

  if (errMsg.includes('Saldo insuficiente') || errMsg.includes('insufficient balance')) {
    return { statusCode: 400, message: `Saldo insuficiente: ${errMsg}` }
  }
  if (errMsg.includes('Product not found') || errMsg.includes('não encontrado')) {
    return { statusCode: 404, message: `Produto não encontrado: ${errMsg}` }
  }
  if (errMsg.includes('Agent not found') || errMsg.includes('Agente não encontrado')) {
    return { statusCode: 404, message: `Agente não encontrado: ${errMsg}` }
  }
  return { statusCode: 500, message: errMsg }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  let idempotencyKey = ''

  try {
    const raw = await req.json()

    // Extract idempotencyKey before schema validation (not part of the schema)
    const providedKey = typeof raw.idempotencyKey === 'string' ? raw.idempotencyKey : undefined

    const parsed = validate(purchaseSchema, raw)
    if (!parsed.success) {
      return agentErrorResponse('/api/cart', new Error(parsed.error.message), 400)
    }
    const body = parsed.data

    // Resolve idempotency key: use client-provided or generate deterministic one
    idempotencyKey = providedKey || generateIdempotencyKey(body.agentId, body.items[0].id, body.totalSats)
    const idempotencyTxHash = `idemp-${idempotencyKey}`

    // ── Idempotency check ──
    const existingTx = await db.transaction.findFirst({
      where: { txHash: idempotencyTxHash },
    })
    if (existingTx) {
      logger.info('cart_idempotency_hit', {
        idempotencyKey,
        existingTxId: existingTx.id,
        buyerId: body.agentId,
      })

      const latencyMs = Date.now() - startTime
      recordCall({ endpoint: '/api/cart', method: 'POST', statusCode: 200, latencyMs })

      return NextResponse.json({
        success: true,
        idempotent: true,
        txId: existingTx.txHash,
        originalTxId: existingTx.id,
        amountSats: existingTx.amountSats,
        discountSats: existingTx.discountSats,
        chargedSats: existingTx.amountSats - existingTx.discountSats,
        blockHeight: existingTx.blockHeight,
        message: 'This purchase was already processed (idempotent replay)',
      })
    }

    // Fetch agent with current purchaseCount
    const agent = await db.agent.findUnique({ where: { id: body.agentId } })
    if (!agent) {
      return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
    }

    const purchaseCount = agent.purchaseCount || 0
    const { tier, percent } = getDiscountTier(purchaseCount)

    // Calculate per-item discounts based on purchase position
    const itemResults: Array<{
      id: string
      nome: string
      precoSats: number
      originalPrice: number
      discountAmount: number
      chargedPrice: number
      tier: string
      tierLabel: string
    }> = []
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

    // ── Wallet SDK calls (outside DB transaction — simulated/external) ──
    const tx = baitWallet.createTransaction({
      from: agent.address,
      to: '@nexus-genesis',
      amountSats: totalCharged,
      type: 'purchase',
      metadata: { items: body.items.length, discountTier: tier, idempotencyKey },
    })
    const signedTx = baitWallet.signTransaction(tx)
    const receipt = await baitWallet.broadcast(signedTx)

    // Pre-sign all per-item transactions (outside DB transaction)
    const signedItemTxs = itemResults.map((item, i) => {
      const itemTx = baitWallet.createTransaction({
        from: agent.address,
        to: '@nexus-genesis',
        amountSats: item.chargedPrice,
        type: 'purchase',
        metadata: { productId: item.id, tier: item.tier, idempotencyKey },
      })
      return baitWallet.signTransaction(itemTx)
    })

    // ── Atomic DB transaction (all-or-nothing) ──
    await db.$transaction(async (tx) => {
      // Find or create system seller (nexus-genesis) inside transaction
      let seller = await tx.agent.findFirst({ where: { address: '@nexus-genesis' } })
      if (!seller) {
        seller = await tx.agent.create({
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

      // Re-read agent inside transaction for latest balance
      const freshAgent = await tx.agent.findUnique({ where: { id: agent.id } })
      if (!freshAgent) {
        throw new Error(`Agent not found: ${agent.id}`)
      }
      if (freshAgent.balanceSats < totalCharged) {
        const err = new Error(
          `Saldo insuficiente (race detected): necessário ${totalCharged}, disponível ${freshAgent.balanceSats}`
        )
        Object.assign(err, { balance: freshAgent.balanceSats, required: totalCharged })
        throw err
      }

      // Create per-item transactions and increment downloads
      for (let i = 0; i < body.items.length; i++) {
        const item = itemResults[i]
        const product = await tx.product.findUnique({ where: { id: item.id } })

        // First item uses idempotency txHash for dedup; rest use signed item txId
        const itemTxHash = i === 0 ? idempotencyTxHash : signedItemTxs[i].txId

        // Determine seller: nexus-genesis for system products, seller otherwise
        const isOwnProduct = product?.authorAgent && (
          product.authorAgent === agent.address ||
          product.authorAgent === agent.displayName
        )

        await tx.transaction.create({
          data: {
            type: tier === 'free' ? 'purchase_free' : tier === 'half' ? 'purchase_discounted' : 'purchase',
            status: 'confirmed',
            amountSats: item.originalPrice,
            discountSats: item.discountAmount,
            buyerId: agent.id,
            sellerId: isOwnProduct ? agent.id : seller.id,
            productId: item.id,
            txHash: itemTxHash,
            blockHeight: receipt.blockHeight + i,
          },
        })

        // Increment product downloads (only if product exists)
        if (product) {
          await tx.product.update({
            where: { id: item.id },
            data: { downloads: { increment: 1 } },
          })
        }
      }

      // Debit buyer balance and increment purchase count
      await tx.agent.update({
        where: { id: agent.id },
        data: {
          balanceSats: { decrement: totalCharged },
          purchaseCount: purchaseCount + body.items.length,
        },
      })

      // Credit seller
      await tx.agent.update({
        where: { id: seller.id },
        data: { balanceSats: { increment: totalCharged } },
      })
    })

    // Re-read agent after transaction for accurate balance
    const updatedAgent = await db.agent.findUnique({
      where: { id: agent.id },
      select: { balanceSats: true },
    })
    const newBalance = updatedAgent ? updatedAgent.balanceSats : agent.balanceSats - totalCharged

    // Track purchase analytics
    trackPurchase(receipt.txId, body.items.length, totalCharged, body.agentId)

    const latencyMs = Date.now() - startTime
    recordCall({ endpoint: '/api/cart', method: 'POST', statusCode: 200, latencyMs })
    logger.info('cart_purchase_success', {
      idempotencyKey,
      agentId: body.agentId,
      totalCharged,
      itemCount: body.items.length,
      latencyMs,
    })

    return NextResponse.json({
      success: true,
      txId: receipt.txId,
      totalOriginal: body.totalSats,
      totalDiscount,
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
    const { statusCode, message } = classifyError(e, idempotencyKey)
    logger.error('cart_purchase_failed', {
      idempotencyKey,
      error: message,
      statusCode,
    })
    return agentErrorResponse('/api/cart', e, statusCode)
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

  const networkInfo = await baitWallet.getNetworkInfo()

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
