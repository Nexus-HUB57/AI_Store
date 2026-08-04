import { describe, it, expect } from 'vitest'
import { generateCsrfToken, validateCsrf } from '@/lib/csrf'

/** Create a minimal NextRequest-like object for testing */
function makeReq(opts: { method?: string; csrfHeader?: string; csrfCookie?: string }): // eslint-disable-next-line @typescript-eslint/no-explicit-any
any {
  const headers = new Map<string, string>()
  if (opts.csrfHeader) headers.set('x-csrf-token', opts.csrfHeader)
  return {
    method: opts.method || 'GET',
    headers: { get: (k: string) => headers.get(k) || null },
    cookies: { get: (k: string) => (k === 'csrf_token' && opts.csrfCookie ? { value: opts.csrfCookie } : undefined) },
  }
}

describe('CSRF utilities', () => {
  it('generates a token with correct format (64 hex chars)', () => {
    const token = generateCsrfToken()
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
    expect(token.length).toBe(64)
    expect(/^[0-9a-f]+$/.test(token)).toBe(true)
  })

  it('validates matching header and cookie tokens', () => {
    const token = generateCsrfToken()
    const req = makeReq({ method: 'POST', csrfHeader: token, csrfCookie: token })
    expect(validateCsrf(req)).toBe(true)
  })

  it('rejects mismatched tokens', () => {
    const tokenA = generateCsrfToken()
    const tokenB = generateCsrfToken()
    const req = makeReq({ method: 'POST', csrfHeader: tokenA, csrfCookie: tokenB })
    expect(validateCsrf(req)).toBe(false)
  })

  it('rejects missing header token', () => {
    const token = generateCsrfToken()
    const req = makeReq({ method: 'POST', csrfCookie: token })
    expect(validateCsrf(req)).toBe(false)
  })

  it('rejects missing cookie token', () => {
    const token = generateCsrfToken()
    const req = makeReq({ method: 'POST', csrfHeader: token })
    expect(validateCsrf(req)).toBe(false)
  })

  it('skips validation for GET requests', () => {
    const req = makeReq({ method: 'GET' })
    expect(validateCsrf(req)).toBe(true)
  })

  it('skips validation for HEAD requests', () => {
    const req = makeReq({ method: 'HEAD' })
    expect(validateCsrf(req)).toBe(true)
  })

  it('skips validation for OPTIONS requests', () => {
    const req = makeReq({ method: 'OPTIONS' })
    expect(validateCsrf(req)).toBe(true)
  })

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateCsrfToken()))
    expect(tokens.size).toBe(50)
  })
})
