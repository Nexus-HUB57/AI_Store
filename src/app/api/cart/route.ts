import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { purchaseSchema, validate } from '@/lib/schemas'
import { agentErrorResponse } from '@/lib/error-resolver'
import { recordCall } from '@/app/api/agent/metrics/route'
import { logger } from '@/lib/logger'
import { baitWallet, formatSats, satsToBAIT } from '@/lib/wallet-sdk'
import { createPurchaseIntentAndOutbox } from '@/lib/purchase-outbox-worker'

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
 * Generate a deterministic idempotency key from the complete request.
 */
function generateIdempotencyKey(agentId: string, items: Array<{ id: string; nome: string; precoSats: number }>, totalSats: number): string {
  const input = JSON.stringify({ agentId, items, totalSats })
  return createHash('sha256').update(input).digest('hex').slice(0, 64)
}

function hashPurchaseRequest(agentId: string, items: Array<{ id: string; nome: string; precoSats: number }>, totalSats: number): string {
  return createHash('sha256').update(JSON.stringify({ agentId, items, totalSats })).digest('hex')
}

/**
 * Classify an error to provide a specific status code and message.
 * Known error types get targeted responses; unknown errors get 500.
 */
function classifyError(e: unknown): { statusCode: number; message: string } {
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
  if (errMsg.includes('Unique constraint failed') || errMsg.includes('P2002')) {
    return { statusCode: 409, message: 'Conflito de idempotência: a requisição já está sendo processada' }
  }
  return { statusCode: 500, message: errMsg }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  let idempotencyKey = ''

  try {
    const raw = await req.json()

    // Preserve the explicit key before schema validation for replay handling.
    const providedKey = typeof raw.idempotencyKey === 'string' ? raw.idempotencyKey : undefined

    const parsed = validate(purchaseSchema, raw)
    if (!parsed.success) {
      return agentErrorResponse('/api/cart', new Error(parsed.error.message), 400)
    }
    const body = parsed.data

    // Resolve idempotency key from the complete request when the client does
    // not provide one. The authenticated principal must be used here by the
    // caller once session binding is enabled.
    idempotencyKey = providedKey || generateIdempotencyKey(body.agentId, body.items, body.totalSats)
    const incomingRequestHash = hashPurchaseRequest(body.agentId, body.items, body.totalSats)

    const existingIntent = await db.purchaseIntent.findUnique({
      where: { buyerId_idempotencyKey: { buyerId: body.agentId, idempotencyKey } },
    })
    if (existingIntent && existingIntent.requestHash !== incomingRequestHash) {
      return NextResponse.json({ error: 'Chave de idempotência reutilizada com payload diferente' }, { status: 409 })
    }
    if (existingIntent?.status === 'confirmed') {
      logger.info('cart_idempotency_hit', {
        idempotencyKey,
        existingTxId: existingIntent.externalTxId,
        buyerId: body.agentId,
      })

      const latencyMs = Date.now() - startTime
      recordCall({ endpoint: '/api/cart', method: 'POST', statusCode: 200, latencyMs })

      return NextResponse.json({
        success: true,
        idempotent: true,
        txId: existingIntent.externalTxId,
        originalTxId: existingIntent.id,
        amountSats: existingIntent.originalAmountSats,
        discountSats: existingIntent.discountAmountSats,
        chargedSats: existingIntent.chargedAmountSats,
        message: 'This purchase was already processed (idempotent replay)',
      })
    }

    if (existingIntent) {
      return NextResponse.json(
        { error: 'Compra em processamento', idempotent: true, intentId: existingIntent.id },
        { status: 409 },
      )
    }

    // Fetch agent with current purchaseCount
    const agent = await db.agent.findUnique({ where: { id: body.agentId } })
    if (!agent) {
      return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
    }

    const purchaseCount = agent.purchaseCount || 0
    const { tier } = getDiscountTier(purchaseCount)

    const products = await db.product.findMany({
      where: { id: { in: body.items.map(item => item.id) } },
    })
    const productsById = new Map(products.map(product => [product.id, product]))
    const authoritativeItems = body.items.map(item => {
      const product = productsById.get(item.id)
      if (!product) throw new Error(`Product not found: ${item.id}`)
      return { id: product.id, nome: product.nome, precoSats: product.precoSats }
    })
    const authoritativeRequestHash = hashPurchaseRequest(body.agentId, authoritativeItems, body.totalSats)

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

    for (const item of authoritativeItems) {
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

    const authoritativeTotal = authoritativeItems.reduce((sum, item) => sum + item.precoSats, 0)
    if (body.totalSats !== authoritativeTotal) {
      return NextResponse.json({ error: 'Total do carrinho não corresponde ao catálogo' }, { status: 409 })
    }

    // Check balance via Wallet SDK
    const balanceCheck = baitWallet.validateBalance({ balance: agent.balanceSats, amountSats: totalCharged })
    if (!balanceCheck.sufficient) {
      const err = new Error(`Saldo insuficiente: necessário ${totalCharged}, disponível ${agent.balanceSats}`)
      Object.assign(err, { balance: agent.balanceSats, required: totalCharged })
      return agentErrorResponse('/api/cart', err, 400)
    }

    const intent = await createPurchaseIntentAndOutbox({
      buyerId: agent.id,
      idempotencyKey,
      requestHash: authoritativeRequestHash,
      payload: {
        items: itemResults,
        totalOriginal: authoritativeTotal,
        totalDiscount,
        totalCharged,
        tier,
      },
      originalAmountSats: authoritativeTotal,
      discountAmountSats: totalDiscount,
      chargedAmountSats: totalCharged,
    })

    const latencyMs = Date.now() - startTime
    recordCall({ endpoint: '/api/cart', method: 'POST', statusCode: 202, latencyMs })
    logger.info('cart_purchase_intent_created', {
      idempotencyKey,
      agentId: body.agentId,
      intentId: intent.id,
      totalCharged,
      itemCount: authoritativeItems.length,
      latencyMs,
    })

    return NextResponse.json({
      success: true,
      pending: true,
      intentId: intent.id,
      idempotencyKey,
      totalOriginal: authoritativeTotal,
      totalDiscount,
      totalCharged,
      totalBAIT: satsToBAIT(totalCharged),
      totalChargedFormatted: formatSats(totalCharged),
      items: itemResults,
      message: 'Compra persistida e aguardando processamento seguro',
    }, { status: 202 })
  } catch (e) {
    const { statusCode, message } = classifyError(e)
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
