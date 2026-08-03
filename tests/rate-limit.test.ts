import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

describe('rate limiting', () => {
  beforeEach(() => {
    // Use unique keys per test to avoid cross-test contamination
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('RATE_LIMITS config', () => {
    it('auth has strictest limits (10/min)', () => {
      expect(RATE_LIMITS.auth.limit).toBe(10)
      expect(RATE_LIMITS.auth.windowMs).toBe(60000)
    })

    it('upload has strict limits (5/min)', () => {
      expect(RATE_LIMITS.upload.limit).toBe(5)
    })

    it('search is more permissive (60/min)', () => {
      expect(RATE_LIMITS.search.limit).toBe(60)
    })

    it('default is permissive (120/min)', () => {
      expect(RATE_LIMITS.default.limit).toBe(120)
    })

    it('all configs have positive limits and windows', () => {
      for (const [name, config] of Object.entries(RATE_LIMITS)) {
        expect(config.limit).toBeGreaterThan(0)
        expect(config.windowMs).toBeGreaterThan(0)
      }
    })

    it('auth is stricter than default', () => {
      expect(RATE_LIMITS.auth.limit).toBeLessThan(RATE_LIMITS.default.limit)
    })

    it('upload is stricter than default', () => {
      expect(RATE_LIMITS.upload.limit).toBeLessThan(RATE_LIMITS.default.limit)
    })
  })

  describe('rateLimit function', () => {
    it('allows first request', () => {
      const result = rateLimit({ key: `test-${Date.now()}-1`, limit: 5, windowMs: 60000 })
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4)
      expect(result.limit).toBe(5)
    })

    it('tracks remaining correctly', () => {
      const key = `test-${Date.now()}-remaining`
      const r1 = rateLimit({ key, limit: 5, windowMs: 60000 })
      const r2 = rateLimit({ key, limit: 5, windowMs: 60000 })
      const r3 = rateLimit({ key, limit: 5, windowMs: 60000 })
      expect(r1.remaining).toBe(4)
      expect(r2.remaining).toBe(3)
      expect(r3.remaining).toBe(2)
    })

    it('rejects when limit exceeded', () => {
      const key = `test-${Date.now()}-overflow`
      for (let i = 0; i < 5; i++) {
        rateLimit({ key, limit: 5, windowMs: 60000 })
      }
      const result = rateLimit({ key, limit: 5, windowMs: 60000 })
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('provides resetAt timestamp in the future', () => {
      const result = rateLimit({ key: `test-${Date.now()}-reset`, limit: 1, windowMs: 60000 })
      expect(result.resetAt).toBeGreaterThan(Date.now())
    })

    it('isolates different keys', () => {
      const keyA = `test-${Date.now()}-iso-a`
      const keyB = `test-${Date.now()}-iso-b`
      for (let i = 0; i < 5; i++) rateLimit({ key: keyA, limit: 5, windowMs: 60000 })
      const rA = rateLimit({ key: keyA, limit: 5, windowMs: 60000 })
      const rB = rateLimit({ key: keyB, limit: 5, windowMs: 60000 })
      expect(rA.success).toBe(false)
      expect(rB.success).toBe(true)
    })

    it('allows burst up to exactly limit', () => {
      const key = `test-${Date.now()}-burst`
      let allSuccess = true
      for (let i = 0; i < 10; i++) {
        const r = rateLimit({ key, limit: 10, windowMs: 60000 })
        if (!r.success) allSuccess = false
      }
      expect(allSuccess).toBe(true)
    })

    it('uses default limit when not specified', () => {
      const result = rateLimit({ key: `test-${Date.now()}-default` })
      expect(result.limit).toBe(60) // default param
      expect(result.success).toBe(true)
    })
  })
})
