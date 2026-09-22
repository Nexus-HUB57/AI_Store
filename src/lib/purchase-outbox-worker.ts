import { db } from '@/lib/db'
import { baitWallet } from '@/lib/wallet-sdk'
import { logger } from '@/lib/logger'

const RETRY_BASE_MS = 5_000
const MAX_ATTEMPTS = 8
const STALE_LOCK_MS = 5 * 60_000

type PurchaseItem = {
  id: string
  nome: string
  precoSats: number
  originalPrice: number
  discountAmount: number
  chargedPrice: number
  tier: string
  tierLabel: string
}

type PurchasePayload = {
  items: PurchaseItem[]
  totalOriginal: number
  totalDiscount: number
  totalCharged: number
  tier: string
}

type BroadcastReceipt = {
  txId: string
  confirmed: boolean
  blockHeight: number
  confirmations: number
  blockHash: string
  timestamp: string
}

export type PurchaseOutboxState =
  | { status: 'confirmed'; intentId: string; receipt: BroadcastReceipt }
  | { status: 'pending'; intentId: string; attempts: number; nextAttemptAt: Date; error?: string }
  | { status: 'missing'; intentId: string }

export async function createPurchaseIntentAndOutbox(input: {
  buyerId: string
  idempotencyKey: string
  requestHash: string
  payload: PurchasePayload
  originalAmountSats: number
  discountAmountSats: number
  chargedAmountSats: number
}) {
  return db.$transaction(async tx => {
    const intent = await tx.purchaseIntent.create({
      data: {
        buyerId: input.buyerId,
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        payloadJson: JSON.stringify(input.payload),
        originalAmountSats: input.originalAmountSats,
        discountAmountSats: input.discountAmountSats,
        chargedAmountSats: input.chargedAmountSats,
        status: 'pending',
      },
    })

    await tx.purchaseOutbox.create({
      data: {
        intentId: intent.id,
        status: 'pending',
      },
    })

    return intent
  })
}

function parseReceipt(receiptJson: string): BroadcastReceipt | null {
  if (!receiptJson) return null
  try {
    const parsed = JSON.parse(receiptJson) as BroadcastReceipt
    if (!parsed.txId || !parsed.confirmed) return null
    return parsed
  } catch {
    return null
  }
}

function parsePayload(payloadJson: string): PurchasePayload {
  const payload = JSON.parse(payloadJson) as PurchasePayload
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error('PurchaseIntent payload inválido: items ausentes')
  }
  return payload
}

async function claimOutbox(intentId: string, now: Date) {
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS)
  return db.$transaction(async tx => {
    const outbox = await tx.purchaseOutbox.findUnique({ where: { intentId } })
    if (!outbox) return null
    if (outbox.status === 'completed') return outbox
    if (outbox.status === 'processing' && (!outbox.lockedAt || outbox.lockedAt > staleBefore)) return null
    if (outbox.status === 'pending' || outbox.status === 'retry' || (outbox.status === 'processing' && outbox.lockedAt && outbox.lockedAt <= staleBefore)) {
      const claimed = await tx.purchaseOutbox.updateMany({
        where: {
          id: outbox.id,
          OR: [
            { status: 'pending', availableAt: { lte: now } },
            { status: 'retry', availableAt: { lte: now } },
            { status: 'processing', lockedAt: { lte: staleBefore } },
          ],
        },
        data: {
          status: 'processing',
          lockedAt: now,
          attempts: { increment: 1 },
        },
      })
      if (claimed.count !== 1) return null
      await tx.purchaseIntent.update({
        where: { id: intentId },
        data: { attempts: { increment: 1 }, nextAttemptAt: now },
      })
      return tx.purchaseOutbox.findUnique({ where: { id: outbox.id } })
    }
    return null
  })
}

async function markRetry(intentId: string, error: unknown, attempts: number) {
  const message = error instanceof Error ? error.message : 'Falha desconhecida no worker'
  const delay = Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1), 15 * 60_000)
  const nextAttemptAt = new Date(Date.now() + delay)
  const status = attempts >= MAX_ATTEMPTS ? 'dead_letter' : 'retry'

  await db.$transaction(async tx => {
    await tx.purchaseOutbox.update({
      where: { intentId },
      data: { status, availableAt: nextAttemptAt, lockedAt: null, lastError: message },
    })
    await tx.purchaseIntent.update({
      where: { id: intentId },
      data: { status: 'pending', nextAttemptAt, lastError: message },
    })
  })

  logger.error('purchase_outbox_retry', { intentId, attempts, status, error: message })
  return { status: 'pending' as const, intentId, attempts, nextAttemptAt, error: message }
}

async function finalizeIntent(intentId: string, receipt: BroadcastReceipt, payload: PurchasePayload) {
  await db.$transaction(async tx => {
    const intent = await tx.purchaseIntent.findUnique({ where: { id: intentId } })
    if (!intent) throw new Error(`PurchaseIntent não encontrado: ${intentId}`)
    if (intent.status === 'confirmed') return

    const buyer = await tx.agent.findUnique({ where: { id: intent.buyerId } })
    if (!buyer) throw new Error(`Agente não encontrado: ${intent.buyerId}`)
    if (buyer.balanceSats < intent.chargedAmountSats) {
      throw new Error(`Saldo insuficiente durante finalização: ${buyer.balanceSats}`)
    }

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

    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i]
      const product = await tx.product.findUnique({ where: { id: item.id } })
      if (!product) throw new Error(`Product not found during finalização: ${item.id}`)

      const existing = await tx.transaction.findFirst({ where: { txHash: i === 0 ? receipt.txId : `${receipt.txId}:${i}` } })
      if (!existing) {
        const isOwnProduct = product.authorAgent === buyer.address || product.authorAgent === buyer.displayName
        await tx.transaction.create({
          data: {
            type: item.tier === 'free' ? 'purchase_free' : item.tier === 'half' ? 'purchase_discounted' : 'purchase',
            status: 'confirmed',
            amountSats: item.originalPrice,
            discountSats: item.discountAmount,
            buyerId: buyer.id,
            sellerId: isOwnProduct ? buyer.id : seller.id,
            productId: item.id,
            txHash: i === 0 ? receipt.txId : `${receipt.txId}:${i}`,
            blockHeight: receipt.blockHeight + i,
          },
        })
        await tx.product.update({ where: { id: item.id }, data: { downloads: { increment: 1 } } })
      }
    }

    await tx.agent.update({
      where: { id: buyer.id },
      data: {
        balanceSats: { decrement: intent.chargedAmountSats },
        purchaseCount: { increment: payload.items.length },
      },
    })
    await tx.agent.update({ where: { id: seller.id }, data: { balanceSats: { increment: intent.chargedAmountSats } } })
    await tx.purchaseIntent.update({
      where: { id: intent.id },
      data: { status: 'confirmed', externalTxId: receipt.txId, receiptJson: JSON.stringify(receipt), lastError: '' },
    })
    await tx.purchaseOutbox.update({
      where: { intentId: intent.id },
      data: { status: 'completed', lockedAt: null, lastError: '' },
    })
  })
}

export async function processPurchaseOutboxIntent(intentId: string, now = new Date()): Promise<PurchaseOutboxState> {
  const claimed = await claimOutbox(intentId, now)
  if (!claimed) {
    const current = await db.purchaseIntent.findUnique({ where: { id: intentId } })
    if (!current) return { status: 'missing', intentId }
    const receipt = parseReceipt(current.receiptJson)
    if (current.status === 'confirmed' && receipt) return { status: 'confirmed', intentId, receipt }
    return { status: 'pending', intentId, attempts: current.attempts, nextAttemptAt: current.nextAttemptAt, error: current.lastError || undefined }
  }

  try {
    const intent = await db.purchaseIntent.findUnique({ where: { id: intentId }, include: { buyer: true } })
    if (!intent) return { status: 'missing', intentId }
    const payload = parsePayload(intent.payloadJson)
    const persistedReceipt = parseReceipt(intent.receiptJson)
    const receipt = persistedReceipt ?? await baitWallet.broadcast(
      baitWallet.signTransaction(
        baitWallet.createTransaction({
          from: intent.buyer.address,
          to: '@nexus-genesis',
          amountSats: intent.chargedAmountSats,
          type: 'purchase',
          metadata: { intentId: intent.id, idempotencyKey: intent.idempotencyKey },
        }),
      ),
    )

    if (!persistedReceipt) {
      await db.purchaseIntent.update({
        where: { id: intent.id },
        data: { status: 'broadcasted', externalTxId: receipt.txId, receiptJson: JSON.stringify(receipt) },
      })
    }

    await finalizeIntent(intent.id, receipt, payload)
    return { status: 'confirmed', intentId, receipt }
  } catch (error) {
    return markRetry(intentId, error, claimed.attempts)
  }
}

export async function reconcilePurchaseIntents(now = new Date()) {
  const candidates = await db.purchaseIntent.findMany({
    where: { status: { in: ['pending', 'broadcasted'] }, nextAttemptAt: { lte: now } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  const results: PurchaseOutboxState[] = []
  for (const candidate of candidates) {
    await db.purchaseOutbox.upsert({
      where: { intentId: candidate.id },
      create: { intentId: candidate.id },
      update: {},
    })
    results.push(await processPurchaseOutboxIntent(candidate.id, now))
  }
  return results
}
