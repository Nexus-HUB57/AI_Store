import { test, expect, type APIRequestContext } from '@playwright/test'

/*
 * E2E tests for the /api/cart endpoint — API-level, no browser rendering.
 *
 * Covers: single-item purchase, insufficient balance, validation errors,
 * idempotency key replay, network info, and multi-item purchase.
 */

test.describe('Cart API', () => {

  /** Helper: login as a new agent and return the agent data. */
  async function loginAgent(request: APIRequestContext, address: string, displayName: string) {
    const res = await request.post('/api/auth/login', {
      data: { address, displayName },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('agent')
    return body
  }

  /** Helper: fetch N products and return the array. */
  async function fetchProducts(request: APIRequestContext, limit = 1) {
    const res = await request.get(`/api/products?limit=${limit}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('products')
    expect(Array.isArray(body.products)).toBe(true)
    expect(body.products.length).toBeGreaterThan(0)
    return body.products
  }

  // ── a) Successful single item purchase ───────────────────────────
  test('POST /api/cart — successful single item purchase', async ({ request }) => {
    const { agent } = await loginAgent(request, 'e2e-api-single', 'API Single Tester')
    const products = await fetchProducts(request, 1)
    const product = products[0]

    const res = await request.post('/api/cart', {
      data: {
        agentId: agent.id,
        items: [{ id: product.id, precoSats: product.precoSats }],
        totalSats: product.precoSats,
      },
    })

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('success', true)
    expect(body).toHaveProperty('txId')
    expect(typeof body.txId).toBe('string')
    expect(body).toHaveProperty('items')
    expect(Array.isArray(body.items)).toBe(true)
  })

  // ── b) Insufficient balance ──────────────────────────────────────
  test('POST /api/cart — insufficient balance', async ({ request }) => {
    const { agent } = await loginAgent(request, 'e2e-api-balance', 'API Balance Tester')
    const products = await fetchProducts(request, 1)
    const product = products[0]

    const res = await request.post('/api/cart', {
      data: {
        agentId: agent.id,
        items: [{ id: product.id, precoSats: product.precoSats }],
        totalSats: 999_999,
      },
    })

    const body = await res.json()
    // Should return an error about insufficient balance
    const bodyStr = JSON.stringify(body).toLowerCase()
    expect(bodyStr).toContain('saldo')
  })

  // ── c) Validation error (missing fields) ────────────────────────
  test('POST /api/cart — validation error (missing fields)', async ({ request }) => {
    const res = await request.post('/api/cart', {
      data: {},
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // ── d) Idempotency key replay ────────────────────────────────────
  test('POST /api/cart — idempotency key replay', async ({ request }) => {
    const { agent } = await loginAgent(request, 'e2e-api-idempotent', 'API Idempotent Tester')
    const products = await fetchProducts(request, 1)
    const product = products[0]
    const idempotencyKey = 'e2e-idem-test-key-001'

    const cartPayload = {
      idempotencyKey,
      agentId: agent.id,
      items: [{ id: product.id, precoSats: product.precoSats }],
      totalSats: product.precoSats,
    }

    // First request — should succeed
    const res1 = await request.post('/api/cart', { data: cartPayload })
    expect(res1.status()).toBe(200)
    const body1 = await res1.json()
    expect(body1).toHaveProperty('success', true)

    // Second request with the same idempotency key — should be idempotent
    const res2 = await request.post('/api/cart', { data: cartPayload })
    const body2 = await res2.json()
    expect(body2).toHaveProperty('idempotent', true)
  })

  // ── e) GET /api/cart — network info ──────────────────────────────
  test('GET /api/cart — network info', async ({ request }) => {
    const res = await request.get('/api/cart')

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('network')
    expect(typeof body.network).toBe('string')
    expect(body).toHaveProperty('blockHeight')
    expect(typeof body.blockHeight).toBe('number')
    expect(body).toHaveProperty('discountTier')
  })

  // ── f) Multi-item purchase ───────────────────────────────────────
  test('POST /api/cart — multi-item purchase', async ({ request }) => {
    const { agent } = await loginAgent(request, 'e2e-api-multi', 'API Multi Tester')
    const products = await fetchProducts(request, 3)

    const items = products.map((p: { id: string; precoSats: number }) => ({
      id: p.id,
      precoSats: p.precoSats,
    }))
    const totalSats = items.reduce((sum: number, item: { precoSats: number }) => sum + item.precoSats, 0)

    const res = await request.post('/api/cart', {
      data: {
        agentId: agent.id,
        items,
        totalSats,
      },
    })

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('success', true)
    expect(body).toHaveProperty('items')
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items.length).toBe(3)

    // Verify each item has a discountTier
    for (const item of body.items) {
      expect(item).toHaveProperty('discountTier')
    }
  })
})
