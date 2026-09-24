import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const databaseUrl = process.env.DATABASE_URL ?? 'file:/tmp/ai-store-purchase-intent-tests.db'
const db = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
})

describe.skipIf(!process.env.DATABASE_URL)('PurchaseIntent constraints', () => {
  beforeEach(async () => {
    await db.purchaseIntent.deleteMany()
    await db.agent.deleteMany()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  async function createAgent(address: string) {
    return db.agent.create({
      data: {
        address,
        displayName: address,
        referralCode: `ref-${address}`,
      },
    })
  }

  it('permite uma chave por comprador e rejeita replay duplicado', async () => {
    const buyer = await createAgent('intent-buyer-a')
    const data = {
      buyerId: buyer.id,
      idempotencyKey: 'idem-key-00000001',
      requestHash: 'hash-cart-a',
      originalAmountSats: 5000,
      discountAmountSats: 0,
      chargedAmountSats: 5000,
      status: 'pending',
    }

    const first = await db.purchaseIntent.create({ data })
    expect(first.status).toBe('pending')

    await expect(db.purchaseIntent.create({ data })).rejects.toMatchObject({
      code: 'P2002',
    })
  })

  it('permite a mesma chave para compradores diferentes', async () => {
    const buyerA = await createAgent('intent-buyer-b')
    const buyerB = await createAgent('intent-buyer-c')

    const base = {
      idempotencyKey: 'idem-key-00000002',
      requestHash: 'hash-cart-b',
      originalAmountSats: 2000,
      discountAmountSats: 2000,
      chargedAmountSats: 0,
      status: 'confirmed',
    }

    const [intentA, intentB] = await Promise.all([
      db.purchaseIntent.create({ data: { ...base, buyerId: buyerA.id, externalTxId: 'tx-intent-a' } }),
      db.purchaseIntent.create({ data: { ...base, buyerId: buyerB.id, externalTxId: 'tx-intent-b' } }),
    ])

    expect(intentA.id).not.toBe(intentB.id)
    expect(intentA.buyerId).not.toBe(intentB.buyerId)
  })

  it('rejeita externalTxId duplicado para impedir dupla liquidação', async () => {
    const buyer = await createAgent('intent-buyer-d')
    const data = {
      buyerId: buyer.id,
      requestHash: 'hash-cart-c',
      originalAmountSats: 8000,
      discountAmountSats: 1000,
      chargedAmountSats: 7000,
      status: 'confirmed',
      externalTxId: 'tx-external-unique',
    }

    await db.purchaseIntent.create({
      data: { ...data, idempotencyKey: 'idem-key-00000003' },
    })

    await expect(db.purchaseIntent.create({
      data: { ...data, idempotencyKey: 'idem-key-00000004' },
    })).rejects.toMatchObject({ code: 'P2002' })
  })

  it('mantém requestHash e valores da intenção para replay determinístico', async () => {
    const buyer = await createAgent('intent-buyer-e')
    const intent = await db.purchaseIntent.create({
      data: {
        buyerId: buyer.id,
        idempotencyKey: 'idem-key-00000005',
        requestHash: 'hash-cart-deterministic',
        originalAmountSats: 10000,
        discountAmountSats: 2500,
        chargedAmountSats: 7500,
      },
    })

    const replay = await db.purchaseIntent.findUnique({
      where: {
        buyerId_idempotencyKey: {
          buyerId: buyer.id,
          idempotencyKey: 'idem-key-00000005',
        },
      },
    })

    expect(replay?.id).toBe(intent.id)
    expect(replay?.requestHash).toBe('hash-cart-deterministic')
    expect(replay?.chargedAmountSats).toBe(7500)
  })
})
