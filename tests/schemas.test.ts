import { describe, it, expect } from 'vitest'
import {
  loginSchema, cartItemSchema, purchaseSchema,
  reviewSchema, productsQuerySchema, uploadMetaSchema,
  referralClaimSchema, validate,
} from '@/lib/schemas'

// ─── Helper ───
function validFields(schema: any, data: Record<string, unknown>) {
  return validate(schema, data).success
}

// ─── Login Schema ───
describe('loginSchema', () => {
  it('accepts valid login with address only', () => {
    expect(validFields(loginSchema, { address: 'bAI_test123' })).toBe(true)
  })

  it('accepts login with all fields', () => {
    expect(validFields(loginSchema, {
      address: 'bAI_abcdef123456',
      displayName: 'Agent Nexus',
      referralCode: 'NEXUS-ABC123',
    })).toBe(true)
  })

  it('rejects empty address', () => {
    const r = validate(loginSchema, { address: '' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.message).toContain('obrigat')
  })

  it('rejects address shorter than 3 chars', () => {
    expect(validFields(loginSchema, { address: 'ab' })).toBe(false)
  })

  it('rejects address longer than 128 chars', () => {
    expect(validFields(loginSchema, { address: 'x'.repeat(129) })).toBe(false)
  })

  it('accepts max-length displayName (64)', () => {
    expect(validFields(loginSchema, { address: 'bAI_test', displayName: 'x'.repeat(64) })).toBe(true)
  })

  it('rejects displayName longer than 64', () => {
    expect(validFields(loginSchema, { address: 'bAI_test', displayName: 'x'.repeat(65) })).toBe(false)
  })
})

// ─── Cart Item Schema ───
describe('cartItemSchema', () => {
  const valid = { id: 'prod-1', nome: 'Test Agent', precoSats: 5000 }

  it('accepts valid cart item', () => {
    expect(validFields(cartItemSchema, valid)).toBe(true)
  })

  it('rejects empty id', () => {
    expect(validFields(cartItemSchema, { ...valid, id: '' })).toBe(false)
  })

  it('rejects precoSats below minimum (20)', () => {
    expect(validFields(cartItemSchema, { ...valid, precoSats: 19 })).toBe(false)
  })

  it('rejects precoSats above maximum (10000)', () => {
    expect(validFields(cartItemSchema, { ...valid, precoSats: 10001 })).toBe(false)
  })

  it('rejects non-integer precoSats', () => {
    expect(validFields(cartItemSchema, { ...valid, precoSats: 50.5 })).toBe(false)
  })

  it('rejects string precoSats (coerced by zod for .number)', () => {
    const r = validate(cartItemSchema, { ...valid, precoSats: 'abc' })
    expect(r.success).toBe(false)
  })
})

// ─── Purchase Schema ───
describe('purchaseSchema', () => {
  const validItems = [{ id: 'p1', nome: 'Agent', precoSats: 5000 }]

  it('accepts valid purchase', () => {
    expect(validFields(purchaseSchema, {
      items: validItems, totalSats: 5000, agentId: 'agent-1',
    })).toBe(true)
  })

  it('rejects empty items array', () => {
    expect(validFields(purchaseSchema, {
      items: [], totalSats: 0, agentId: 'agent-1',
    })).toBe(false)
  })

  it('rejects more than 50 items', () => {
    const manyItems = Array.from({ length: 51 }, (_, i) => ({
      id: `p${i}`, nome: `Agent ${i}`, precoSats: 2000,
    }))
    expect(validFields(purchaseSchema, {
      items: manyItems, totalSats: 102000, agentId: 'agent-1',
    })).toBe(false)
  })

  it('accepts exactly 50 items', () => {
    const fiftyItems = Array.from({ length: 50 }, (_, i) => ({
      id: `p${i}`, nome: `Agent ${i}`, precoSats: 2000,
    }))
    expect(validFields(purchaseSchema, {
      items: fiftyItems, totalSats: 100000, agentId: 'agent-1',
    })).toBe(true)
  })

  it('rejects negative totalSats', () => {
    expect(validFields(purchaseSchema, {
      items: validItems, totalSats: -1, agentId: 'agent-1',
    })).toBe(false)
  })

  it('defaults discountTotal to 0', () => {
    const r = validate(purchaseSchema, {
      items: validItems, totalSats: 5000, agentId: 'agent-1',
    })
    if (r.success) expect(r.data.discountTotal).toBe(0)
  })

  it('rejects empty agentId', () => {
    expect(validFields(purchaseSchema, {
      items: validItems, totalSats: 5000, agentId: '',
    })).toBe(false)
  })
})

// ─── Review Schema ───
describe('reviewSchema', () => {
  const valid = { productId: 'p1', agentId: 'a1', rating: 4 }

  it('accepts minimal review', () => {
    expect(validFields(reviewSchema, valid)).toBe(true)
  })

  it('accepts full review', () => {
    expect(validFields(reviewSchema, {
      ...valid, title: 'Great!', comment: 'Works perfectly', txHash: '0xabc',
    })).toBe(true)
  })

  it('rejects rating below 1', () => {
    expect(validFields(reviewSchema, { ...valid, rating: 0 })).toBe(false)
  })

  it('rejects rating above 5', () => {
    expect(validFields(reviewSchema, { ...valid, rating: 6 })).toBe(false)
  })

  it('accepts float rating coerced to int (5.0)', () => {
    const r = validate(reviewSchema, { ...valid, rating: 5.0 })
    expect(r.success).toBe(true)
  })

  it('rejects empty productId', () => {
    expect(validFields(reviewSchema, { ...valid, productId: '' })).toBe(false)
  })

  it('rejects title longer than 100', () => {
    expect(validFields(reviewSchema, { ...valid, title: 'x'.repeat(101) })).toBe(false)
  })

  it('rejects comment longer than 1000', () => {
    expect(validFields(reviewSchema, { ...valid, comment: 'x'.repeat(1001) })).toBe(false)
  })
})

// ─── Products Query Schema ───
describe('productsQuerySchema', () => {
  it('defaults all fields', () => {
    const r = validate(productsQuerySchema, {})
    if (r.success) {
      expect(r.data.q).toBe('')
      expect(r.data.segmento).toBe('')
      expect(r.data.sort).toBe('pulsarEnergy')
      expect(r.data.page).toBe(1)
      expect(r.data.limit).toBe(24)
      expect(r.data.featured).toBeUndefined()
    }
  })

  it('coerces page and limit from strings', () => {
    const r = validate(productsQuerySchema, { page: '3', limit: '50' })
    if (r.success) {
      expect(r.data.page).toBe(3)
      expect(r.data.limit).toBe(50)
    }
  })

  it('clamps page to minimum 1', () => {
    const r = validate(productsQuerySchema, { page: '0' })
    if (r.success) expect(r.data.page).toBe(1)
  })

  it('clamps limit to max 100', () => {
    const r = validate(productsQuerySchema, { limit: '200' })
    if (r.success) expect(r.data.limit).toBe(100)
  })

  it('accepts valid sort values', () => {
    for (const sort of ['pulsarEnergy', 'downloads', 'rating', 'price', 'fitness', 'executions', 'newest']) {
      const r = validate(productsQuerySchema, { sort })
      if (r.success) expect(r.data.sort).toBe(sort)
    }
  })

  it('rejects invalid sort', () => {
    expect(validFields(productsQuerySchema, { sort: 'invalid' })).toBe(false)
  })

  it('accepts featured=true', () => {
    const r = validate(productsQuerySchema, { featured: 'true' })
    if (r.success) expect(r.data.featured).toBe('true')
  })

  it('rejects featured=maybe', () => {
    expect(validFields(productsQuerySchema, { featured: 'maybe' })).toBe(false)
  })
})

// ─── Upload Meta Schema ───
describe('uploadMetaSchema', () => {
  const valid = { nome: 'My Agent', precoSats: 5000, segmento: 'AGENT_APPS' }

  it('accepts valid upload', () => {
    expect(validFields(uploadMetaSchema, valid)).toBe(true)
  })

  it('rejects empty nome', () => {
    expect(validFields(uploadMetaSchema, { ...valid, nome: '' })).toBe(false)
  })

  it('rejects precoSats below 2000 (20 BAIT)', () => {
    expect(validFields(uploadMetaSchema, { ...valid, precoSats: 1999 })).toBe(false)
  })

  it('rejects precoSats above 10000 (100 BAIT)', () => {
    expect(validFields(uploadMetaSchema, { ...valid, precoSats: 10001 })).toBe(false)
  })

  it('accepts all valid segmentos', () => {
    const segments = ['AGENT_APPS', 'EXECUTABLE_SKILLS', 'KNOWLEDGE_PACKS',
      'SYNTHETIC_INFRASTRUCTURE', 'PROMPT_HARNESS', 'IN_APP_PRODUCTS']
    for (const seg of segments) {
      expect(validFields(uploadMetaSchema, { ...valid, segmento: seg })).toBe(true)
    }
  })

  it('rejects invalid segmento', () => {
    expect(validFields(uploadMetaSchema, { ...valid, segmento: 'INVALID' })).toBe(false)
  })

  it('defaults optional fields', () => {
    const r = validate(uploadMetaSchema, valid)
    if (r.success) {
      expect(r.data.coreBusiness).toBe('')
      expect(r.data.publicoAlvoAI).toBe('')
    }
  })
})

// ─── Referral Claim Schema ───
describe('referralClaimSchema', () => {
  it('accepts valid claim', () => {
    expect(validFields(referralClaimSchema, { agentId: 'agent-1' })).toBe(true)
  })

  it('rejects empty agentId', () => {
    expect(validFields(referralClaimSchema, { agentId: '' })).toBe(false)
  })
})

// ─── Validate Helper ───
describe('validate helper', () => {
  it('returns success with correct data shape', () => {
    const r = validate(loginSchema, { address: 'bAI_test' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data).toHaveProperty('address')
      expect(r.data.address).toBe('bAI_test')
    }
  })

  it('returns error with message and details', () => {
    const r = validate(loginSchema, { address: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error).toHaveProperty('message')
      expect(typeof r.error.message).toBe('string')
    }
  })
})
