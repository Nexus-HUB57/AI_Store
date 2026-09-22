import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPurchaseIntentAndOutbox } from '@/lib/purchase-outbox-worker'

const databaseUrl = process.env.DATABASE_URL ?? 'file:/tmp/ai-store-purchase-outbox-tests.db'
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } })

describe.skipIf(!process.env.DATABASE_URL)('Purchase outbox', () => {
  beforeEach(async () => {
    await db.purchaseOutbox.deleteMany()
    await db.purchaseIntent.deleteMany()
    await db.agent.deleteMany()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('persiste intenção e outbox no mesmo fluxo antes de qualquer worker', async () => {
    const buyer = await db.agent.create({
      data: {
        address: 'outbox-buyer-a',
        displayName: 'Outbox Buyer A',
        referralCode: 'outbox-a',
      },
    })

    const intent = await createPurchaseIntentAndOutbox({
      buyerId: buyer.id,
      idempotencyKey: 'outbox-key-00000001',
      requestHash: 'outbox-hash-a',
      payload: {
        items: [{
          id: 'product-a',
          nome: 'Product A',
          precoSats: 5000,
          originalPrice: 5000,
          discountAmount: 0,
          chargedPrice: 5000,
          tier: 'none',
          tierLabel: '',
        }],
        totalOriginal: 5000,
        totalDiscount: 0,
        totalCharged: 5000,
        tier: 'none',
      },
      originalAmountSats: 5000,
      discountAmountSats: 0,
      chargedAmountSats: 5000,
    })

    const persisted = await db.purchaseIntent.findUnique({
      where: { id: intent.id },
      include: { outbox: true },
    })

    expect(persisted?.status).toBe('pending')
    expect(persisted?.outbox?.status).toBe('pending')
    expect(persisted?.outbox?.intentId).toBe(intent.id)
    expect(JSON.parse(persisted?.payloadJson ?? '{}').totalCharged).toBe(5000)
  })

  it('não cria segunda outbox quando a chave do comprador colide', async () => {
    const buyer = await db.agent.create({
      data: {
        address: 'outbox-buyer-b',
        displayName: 'Outbox Buyer B',
        referralCode: 'outbox-b',
      },
    })

    const input = {
      buyerId: buyer.id,
      idempotencyKey: 'outbox-key-00000002',
      requestHash: 'outbox-hash-b',
      payload: {
        items: [{ id: 'product-b', nome: 'Product B', precoSats: 3000, originalPrice: 3000, discountAmount: 0, chargedPrice: 3000, tier: 'none', tierLabel: '' }],
        totalOriginal: 3000,
        totalDiscount: 0,
        totalCharged: 3000,
        tier: 'none',
      },
      originalAmountSats: 3000,
      discountAmountSats: 0,
      chargedAmountSats: 3000,
    }

    await createPurchaseIntentAndOutbox(input)
    await expect(createPurchaseIntentAndOutbox(input)).rejects.toMatchObject({ code: 'P2002' })
    expect(await db.purchaseOutbox.count()).toBe(1)
  })
})
