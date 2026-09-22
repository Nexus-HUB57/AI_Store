import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BAITWalletSDK, formatSats, satsToBAIT, baitToSats, validateBaitAddress } from '@/lib/wallet-sdk'

describe('b\'AI\'tcoin Wallet SDK', () => {
  describe('formatSats', () => {
    it('formats small amounts', () => {
      expect(formatSats(500)).toBe('500')
    })

    it('formats thousands with locale', () => {
      expect(formatSats(5000)).toBe('5,000')
    })

    it('formats millions', () => {
      expect(formatSats(1000000)).toBe('1,000,000')
    })

    it('formats zero', () => {
      expect(formatSats(0)).toBe('0')
    })
  })

  // Denomination convention: 1 BAIT = 100_000_000 saitoshis (Bitcoin-style, 8 decimals)
  // Aligned with SDK constant SAITOSHIS_PER_BAIT in src/lib/wallet-sdk.ts
  describe('satsToBAIT', () => {
    it('converts 100_000_000 sats to 1 BAIT', () => {
      expect(satsToBAIT(100_000_000)).toBe(1)
    })

    it('converts 5_000_000_000 sats to 50 BAIT', () => {
      expect(satsToBAIT(5_000_000_000)).toBe(50)
    })

    it('converts 10_000_000_000 sats to 100 BAIT', () => {
      expect(satsToBAIT(10_000_000_000)).toBe(100)
    })

    it('returns fractional BAIT for sub-unit amounts', () => {
      // 150 sats = 0.0000015 BAIT
      expect(satsToBAIT(150)).toBeCloseTo(0.0000015, 10)
    })

    it('returns 0 for 0 sats', () => {
      expect(satsToBAIT(0)).toBe(0)
    })
  })

  describe('baitToSats', () => {
    it('converts 1 BAIT to 100_000_000 sats', () => {
      expect(baitToSats(1)).toBe(100_000_000)
    })

    it('converts 50 BAIT to 5_000_000_000 sats', () => {
      expect(baitToSats(50)).toBe(5_000_000_000)
    })

    it('converts 100 BAIT to 10_000_000_000 sats', () => {
      expect(baitToSats(100)).toBe(10_000_000_000)
    })

    it('returns 0 for 0 BAIT', () => {
      expect(baitToSats(0)).toBe(0)
    })
  })

  describe('satsToBAIT / baitToSats roundtrip', () => {
    it('is reversible for exact BAIT-boundary amounts', () => {
      expect(baitToSats(satsToBAIT(100_000_000))).toBe(100_000_000)
      expect(baitToSats(satsToBAIT(200_000_000))).toBe(200_000_000)
      expect(baitToSats(satsToBAIT(1_000_000_000))).toBe(1_000_000_000)
    })
  })

  describe('validateBaitAddress', () => {
    it('accepts bAI_ prefix address', () => {
      expect(validateBaitAddress('bAI_nexus_agent_01')).toBe(true)
    })

    it('accepts 0x hex address', () => {
      expect(validateBaitAddress('0xabcdef1234567890')).toBe(true)
    })

    it('accepts @ system address', () => {
      expect(validateBaitAddress('@nexus-genesis')).toBe(true)
    })

    it('rejects empty string', () => {
      expect(validateBaitAddress('')).toBe(false)
    })

    it('rejects too short', () => {
      expect(validateBaitAddress('ab')).toBe(false)
    })

    it('rejects spaces', () => {
      expect(validateBaitAddress('bAI has space')).toBe(false)
    })
  })

  describe('BAITWalletSDK', () => {
    let sdk: BAITWalletSDK

    beforeEach(() => {
      sdk = new BAITWalletSDK({ network: 'testnet' })
    })

    it('initializes with correct network', () => {
      expect(sdk.network).toBe('testnet')
    })

    it('creates a transaction payload', () => {
      const tx = sdk.createTransaction({
        from: 'bAI_sender',
        to: 'bAI_receiver',
        amountSats: 5000,
        type: 'purchase',
      })
      expect(tx).toHaveProperty('txId')
      expect(tx).toHaveProperty('amountSats', 5000)
      expect(tx).toHaveProperty('network', 'testnet')
      expect(tx).toHaveProperty('timestamp')
      expect(tx).toHaveProperty('status', 'pending')
    })

    it('creates transaction with metadata', () => {
      const tx = sdk.createTransaction({
        from: 'bAI_sender',
        to: 'bAI_receiver',
        amountSats: 3000,
        type: 'purchase',
        metadata: { productId: 'prod-1', productName: 'Test Agent' },
      })
      expect(tx.metadata?.productId).toBe('prod-1')
    })

    it('validates sufficient balance for single tx', () => {
      const result = sdk.validateBalance({ balance: 10000, amountSats: 5000 })
      expect(result.sufficient).toBe(true)
      expect(result.remaining).toBe(5000)
    })

    it('rejects insufficient balance', () => {
      const result = sdk.validateBalance({ balance: 3000, amountSats: 5000 })
      expect(result.sufficient).toBe(false)
      expect(result.deficit).toBe(2000)
    })

    it('validates balance for multiple items', () => {
      const items = [
        { id: 'p1', precoSats: 3000 },
        { id: 'p2', precoSats: 5000 },
      ]
      const result = sdk.validateBalance({ balance: 10000, items })
      expect(result.sufficient).toBe(true)
      expect(result.remaining).toBe(2000)
    })

    it('calculates discount correctly for free tier', () => {
      const result = sdk.calculateDiscount({ purchaseCount: 0, itemPriceSats: 5000 })
      expect(result.percent).toBe(100)
      expect(result.discountSats).toBe(5000)
      expect(result.chargedSats).toBe(0)
      expect(result.tier).toBe('free')
    })

    it('calculates discount correctly for half tier', () => {
      const result = sdk.calculateDiscount({ purchaseCount: 10, itemPriceSats: 5000 })
      expect(result.percent).toBe(50)
      expect(result.discountSats).toBe(2500)
      expect(result.chargedSats).toBe(2500)
      expect(result.tier).toBe('half')
    })

    it('calculates discount correctly for no-discount tier', () => {
      const result = sdk.calculateDiscount({ purchaseCount: 55, itemPriceSats: 5000 })
      expect(result.percent).toBe(0)
      expect(result.discountSats).toBe(0)
      expect(result.chargedSats).toBe(5000)
      expect(result.tier).toBe('none')
    })

    it('generates deterministic txId for same inputs', () => {
      const tx1 = sdk.createTransaction({
        from: 'bAI_a', to: 'bAI_b', amountSats: 1000, type: 'purchase',
      })
      const tx2 = sdk.createTransaction({
        from: 'bAI_a', to: 'bAI_b', amountSats: 1000, type: 'purchase',
      })
      // Same inputs should produce same txId prefix (based on hash)
      expect(tx1.txId).toBe(tx2.txId)
    })

    it('signs transaction (simulated)', () => {
      const tx = sdk.createTransaction({
        from: 'bAI_a', to: 'bAI_b', amountSats: 1000, type: 'purchase',
      })
      const signed = sdk.signTransaction(tx)
      expect(signed.signature).toBeTruthy()
      expect(signed.status).toBe('signed')
      expect(signed.signature).toMatch(/^bAI-sig-/)
    })

    it('broadcasts transaction (simulated)', async () => {
      const tx = sdk.createTransaction({
        from: 'bAI_a', to: 'bAI_b', amountSats: 1000, type: 'purchase',
      })
      const signed = sdk.signTransaction(tx)
      const receipt = await sdk.broadcast(signed)
      expect(receipt.confirmed).toBe(true)
      expect(receipt.blockHeight).toBeGreaterThan(0)
      expect(receipt.confirmations).toBeGreaterThanOrEqual(1)
    })
  })
})
