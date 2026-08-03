import { describe, it, expect } from 'vitest'

/**
 * Pure logic tests for cart/purchase business rules.
 * These mirror the discount calculation in /api/cart/route.ts
 * but test the logic independently without DB/HTTP.
 */

function getDiscountTier(purchaseCount: number): { tier: string; percent: number } {
  if (purchaseCount < 3) return { tier: 'free', percent: 100 }
  if (purchaseCount < 50) return { tier: 'half', percent: 50 }
  return { tier: 'none', percent: 0 }
}

function calculateItemDiscount(purchaseCount: number, itemPriceSats: number) {
  const tier = getDiscountTier(purchaseCount)
  const discountAmount = Math.floor(itemPriceSats * (tier.percent / 100))
  return {
    originalPrice: itemPriceSats,
    discountAmount,
    chargedPrice: itemPriceSats - discountAmount,
    tier: tier.tier,
    tierLabel: tier.tier === 'free' ? 'GRATIS' : tier.tier === 'half' ? '-50%' : '',
  }
}

function calculateCartTotal(items: { precoSats: number }[], startPurchaseCount: number) {
  let totalCharged = 0
  let totalDiscount = 0
  let totalOriginal = 0
  const results = []
  let idx = startPurchaseCount

  for (const item of items) {
    const result = calculateItemDiscount(idx, item.precoSats)
    results.push(result)
    totalCharged += result.chargedPrice
    totalDiscount += result.discountAmount
    totalOriginal += result.originalPrice
    idx++
  }

  return { items: results, totalCharged, totalDiscount, totalOriginal }
}

describe('Discount Tier Logic', () => {
  it('purchaseCount 0 → free tier', () => {
    expect(getDiscountTier(0)).toEqual({ tier: 'free', percent: 100 })
  })

  it('purchaseCount 1 → free tier', () => {
    expect(getDiscountTier(1)).toEqual({ tier: 'free', percent: 100 })
  })

  it('purchaseCount 2 → free tier (last free)', () => {
    expect(getDiscountTier(2)).toEqual({ tier: 'free', percent: 100 })
  })

  it('purchaseCount 3 → half tier (first discounted)', () => {
    expect(getDiscountTier(3)).toEqual({ tier: 'half', percent: 50 })
  })

  it('purchaseCount 49 → half tier (last discounted)', () => {
    expect(getDiscountTier(49)).toEqual({ tier: 'half', percent: 50 })
  })

  it('purchaseCount 50 → none tier', () => {
    expect(getDiscountTier(50)).toEqual({ tier: 'none', percent: 0 })
  })

  it('purchaseCount 100 → none tier', () => {
    expect(getDiscountTier(100)).toEqual({ tier: 'none', percent: 0 })
  })
})

describe('Item Discount Calculation', () => {
  it('free tier: 5000 sats → 0 charged', () => {
    const r = calculateItemDiscount(0, 5000)
    expect(r.originalPrice).toBe(5000)
    expect(r.discountAmount).toBe(5000)
    expect(r.chargedPrice).toBe(0)
    expect(r.tierLabel).toBe('GRATIS')
  })

  it('half tier: 5000 sats → 2500 charged', () => {
    const r = calculateItemDiscount(10, 5000)
    expect(r.chargedPrice).toBe(2500)
    expect(r.discountAmount).toBe(2500)
    expect(r.tierLabel).toBe('-50%')
  })

  it('none tier: 5000 sats → 5000 charged', () => {
    const r = calculateItemDiscount(55, 5000)
    expect(r.chargedPrice).toBe(5000)
    expect(r.discountAmount).toBe(0)
    expect(r.tierLabel).toBe('')
  })

  it('handles odd prices: 3333 sats at 50% → 1666 charged', () => {
    const r = calculateItemDiscount(10, 3333)
    expect(r.discountAmount).toBe(1666) // Math.floor(3333 * 0.5)
    expect(r.chargedPrice).toBe(1667) // 3333 - 1666
  })

  it('minimum price (2000 sats) free → 0 charged', () => {
    const r = calculateItemDiscount(0, 2000)
    expect(r.chargedPrice).toBe(0)
  })
})

describe('Cart Total Calculation', () => {
  it('3 items from zero: all free', () => {
    const items = [
      { precoSats: 5000 },
      { precoSats: 3000 },
      { precoSats: 7000 },
    ]
    const cart = calculateCartTotal(items, 0)
    expect(cart.totalCharged).toBe(0)
    expect(cart.totalDiscount).toBe(15000)
    expect(cart.totalOriginal).toBe(15000)
    expect(cart.items.every(i => i.tier === 'free')).toBe(true)
  })

  it('5 items from zero: 3 free + 2 half', () => {
    const items = Array.from({ length: 5 }, () => ({ precoSats: 4000 }))
    const cart = calculateCartTotal(items, 0)
    expect(cart.totalCharged).toBe(4000) // 0 + 0 + 0 + 2000 + 2000
    expect(cart.totalDiscount).toBe(16000) // 3*4000 (free) + 2*2000 (half off)
  })

  it('transition from free to half within cart', () => {
    const items = Array.from({ length: 4 }, () => ({ precoSats: 5000 }))
    const cart = calculateCartTotal(items, 1) // start at purchase 1
    // Purchases 1,2 → free; 3,4 → half
    expect(cart.items[0].tier).toBe('free')
    expect(cart.items[1].tier).toBe('free')
    expect(cart.items[2].tier).toBe('half')
    expect(cart.items[3].tier).toBe('half')
    expect(cart.totalCharged).toBe(5000) // 0+0+2500+2500
  })

  it('all items at none tier', () => {
    const items = Array.from({ length: 3 }, () => ({ precoSats: 5000 }))
    const cart = calculateCartTotal(items, 55)
    expect(cart.totalCharged).toBe(15000)
    expect(cart.totalDiscount).toBe(0)
  })

  it('correct totalOriginal always equals sum of original prices', () => {
    const items = [{ precoSats: 2000 }, { precoSats: 8000 }, { precoSats: 5000 }]
    const cart = calculateCartTotal(items, 0)
    expect(cart.totalOriginal).toBe(15000)
    expect(cart.totalCharged + cart.totalDiscount).toBe(15000)
  })
})
