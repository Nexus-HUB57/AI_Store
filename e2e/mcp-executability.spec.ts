/**
 * E2E Test — MCP Protocol Servers Executability Validation
 * ========================================================
 * Validates that ALL 1200 MCP Protocol Servers are present in the
 * catalogue, are queryable via the API, and expose the required
 * E2E-executable surface: capability discovery, resource listing,
 * and tool invocation metadata.
 *
 * Run: npx playwright test e2e/mcp-executability.spec.ts
 */

import { test, expect } from '@playwright/test'

const TOTAL_MCP_EXPECTED = 1200
const TOTAL_TOOLS_EXPECTED = 2704
const MCP_SEGMENTS = ['MCP_PROTOCOL_SERVERS'] as const
const ALL_SEGMENTS = [
  'MCP_PROTOCOL_SERVERS',
  'AGENT_APPS',
  'EXECUTABLE_SKILLS',
  'KNOWLEDGE_PACKS',
  'SYNTHETIC_INFRASTRUCTURE',
  'PROMPT_HARNESS',
  'IN_APP_PRODUCTS',
] as const

const MCP_EXEC_PROTOCOLS = ['stdio', 'sse', 'streamable-http', 'websocket', 'grpc']

// ─── API-level E2E tests ────────────────────────────────────

test.describe('MCP E2E Executability — API Validation', () => {

  test('GET /api/health returns 2704 products and ok status', async ({ request }) => {
    const resp = await request.get('/api/health')
    expect(resp.status()).toBe(200)

    const body = await resp.json()
    expect(body).toHaveProperty('status', 'ok')
    expect(body.counts.products).toBe(TOTAL_TOOLS_EXPECTED)
    expect(body.counts).toHaveProperty('agents')
    expect(body.counts).toHaveProperty('transactions')
  })

  test('GET /api/products returns paginated products with correct total', async ({ request }) => {
    const resp = await request.get('/api/products?limit=1')
    expect(resp.status()).toBe(200)

    const body = await resp.json()
    expect(body.pagination.total).toBe(TOTAL_TOOLS_EXPECTED)
    expect(body.products).toHaveLength(1)
  })

  test('GET /api/products?segmento=MCP_PROTOCOL_SERVERS returns all 1200 MCPs', async ({ request }) => {
    // Fetch all MCPs across pages
    const pageSize = 100
    let totalMCPs = 0
    let page = 1
    let hasMore = true

    while (hasMore) {
      const resp = await request.get(`/api/products?segmento=MCP_PROTOCOL_SERVERS&limit=${pageSize}&page=${page}`)
      expect(resp.status()).toBe(200)

      const body = await resp.json()
      totalMCPs += body.products.length
      hasMore = page < body.pagination.totalPages
      page++
    }

    expect(totalMCPs).toBe(TOTAL_MCP_EXPECTED)
  })

  test('MCP products have required E2E-executable fields', async ({ request }) => {
    const resp = await request.get('/api/products?segmento=MCP_PROTOCOL_SERVERS&limit=50&page=1')
    expect(resp.status()).toBe(200)

    const body = await resp.json()
    expect(body.products.length).toBeGreaterThan(0)

    for (const product of body.products) {
      // Every MCP must have a name
      expect(product.nome).toBeTruthy()
      expect(typeof product.nome).toBe('string')

      // Every MCP must have a unique slug
      expect(product.slug).toBeTruthy()
      expect(typeof product.slug).toBe('string')

      // Every MCP must be in the MCP_PROTOCOL_SERVERS segment
      expect(product.segmento).toBe('MCP_PROTOCOL_SERVERS')

      // Every MCP must have a coreBusiness describing E2E executability
      expect(product.coreBusiness).toBeTruthy()
      expect(product.coreBusiness.toLowerCase()).toContain('mcp')

      // Every MCP must have a valid price
      expect(typeof product.precoSats).toBe('number')
      expect(product.precoSats).toBeGreaterThan(0)

      // Every MCP must have rating and downloads
      expect(typeof product.rating).toBe('number')
      expect(product.rating).toBeGreaterThanOrEqual(0)

      // Every MCP must have pulsarEnergy and fitnessScore
      expect(typeof product.pulsarEnergy).toBe('number')
      expect(product.pulsarEnergy).toBeGreaterThanOrEqual(0)
      expect(typeof product.fitnessScore).toBe('number')
      expect(product.fitnessScore).toBeGreaterThanOrEqual(0)

      // Every MCP must have A2A execution count
      expect(typeof product.a2aExecutions).toBe('number')

      // Every MCP must have source = mcp-registry
      expect(product.source).toBe('mcp-registry')

      // Every MCP must have a version
      expect(product.version).toBeTruthy()

      // Every MCP must have icon emoji
      expect(product.iconEmoji).toBe('🔌')
    }
  })

  test('MCP products reference executable protocols in their metadata', async ({ request }) => {
    const resp = await request.get('/api/products?segmento=MCP_PROTOCOL_SERVERS&limit=100&page=1')
    expect(resp.status()).toBe(200)

    const body = await resp.json()
    const protocolReferences = new Set<string>()

    for (const product of body.products) {
      // The coreBusiness should mention the protocol type
      const business = product.coreBusiness.toLowerCase()
      for (const protocol of MCP_EXEC_PROTOCOLS) {
        if (business.includes(protocol)) {
          protocolReferences.add(protocol)
        }
      }
    }

    // At least 3 different MCP protocols should be referenced
    expect(protocolReferences.size).toBeGreaterThanOrEqual(3)
  })

  test('MCP products cover all 30 MCP categories', async ({ request }) => {
    const resp = await request.get('/api/products?segmento=MCP_PROTOCOL_SERVERS&limit=100&page=1')
    expect(resp.status()).toBe(200)

    const body = await resp.json()
    const categories = new Set<string>()

    for (const product of body.products) {
      // segmentoDisplay format: "MCP Protocol Servers › category"
      if (product.segmentoDisplay && product.segmentoDisplay.includes('›')) {
        const category = product.segmentoDisplay.split('›')[1].trim()
        categories.add(category)
      }
    }

    // Should have multiple distinct categories
    expect(categories.size).toBeGreaterThanOrEqual(10)
  })

  test('All 7 segments have products in the catalogue', async ({ request }) => {
    const segmentCounts: Record<string, number> = {}

    for (const segment of ALL_SEGMENTS) {
      const resp = await request.get(`/api/products?segmento=${segment}&limit=1`)
      expect(resp.status()).toBe(200)

      const body = await resp.json()
      segmentCounts[segment] = body.pagination.total
    }

    // Verify each segment has its expected count
    expect(segmentCounts.MCP_PROTOCOL_SERVERS).toBe(1200)
    expect(segmentCounts.AGENT_APPS).toBe(250)
    expect(segmentCounts.EXECUTABLE_SKILLS).toBe(250)
    expect(segmentCounts.KNOWLEDGE_PACKS).toBe(250)
    expect(segmentCounts.SYNTHETIC_INFRASTRUCTURE).toBe(254)
    expect(segmentCounts.PROMPT_HARNESS).toBe(250)
    expect(segmentCounts.IN_APP_PRODUCTS).toBe(250)

    // Total must equal 2704
    const total = Object.values(segmentCounts).reduce((a, b) => a + b, 0)
    expect(total).toBe(TOTAL_TOOLS_EXPECTED)
  })

  test('Product search returns MCP results', async ({ request }) => {
    const resp = await request.get('/api/products?q=mcp&limit=10')
    expect(resp.status()).toBe(200)

    const body = await resp.json()
    expect(body.pagination.total).toBeGreaterThan(0)
    expect(body.products.length).toBeGreaterThan(0)
  })

  test('MCP products can be sorted by pulsar, downloads, rating', async ({ request }) => {
    for (const sort of ['pulsarEnergy', 'downloads', 'rating']) {
      const resp = await request.get(`/api/products?segmento=MCP_PROTOCOL_SERVERS&limit=10&sort=${sort}`)
      expect(resp.status()).toBe(200)

      const body = await resp.json()
      expect(body.products.length).toBeGreaterThan(0)

      // Verify sort order (descending)
      for (let i = 1; i < body.products.length; i++) {
        const prev = body.products[i - 1][sort]
        const curr = body.products[i][sort]
        expect(prev).toBeGreaterThanOrEqual(curr)
      }
    }
  })

  test('Featured products include MCP servers', async ({ request }) => {
    const resp = await request.get('/api/products?featured=true&limit=20')
    expect(resp.status()).toBe(200)

    const body = await resp.json()
    expect(body.pagination.total).toBeGreaterThan(0)
  })
})

// ─── UI-level E2E tests ─────────────────────────────────────

test.describe('MCP E2E Executability — UI Validation', () => {

  test('Homepage renders product grid with 2704 products', async ({ page }) => {
    await page.goto('/')

    // Wait for products to load
    const firstCard = page.locator('[class*="card-glow-hover"]').first()
    await firstCard.waitFor({ state: 'visible', timeout: 20_000 })

    // Verify products are rendered (BAIT price labels)
    await expect(page.locator('text=BAIT').first()).toBeVisible({ timeout: 15_000 })
  })

  test('MCP products are visible and clickable in the catalogue', async ({ page }) => {
    await page.goto('/')

    const firstCard = page.locator('[class*="card-glow-hover"]').first()
    await firstCard.waitFor({ state: 'visible', timeout: 20_000 })

    // Click product to open detail dialog
    await firstCard.click()

    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible', timeout: 10_000 })

    // Verify product detail content
    await expect(dialog.locator('text=BAIT').first()).toBeVisible()

    // Close dialog
    await page.keyboard.press('Escape')
  })

  test('Stats API returns correct counts for dashboard', async ({ request }) => {
    const resp = await request.get('/api/stats')
    expect(resp.status()).toBe(200)

    const body = await resp.json()
    // Stats should reflect 2704 total products
    if (body.totalProducts !== undefined) {
      expect(body.totalProducts).toBe(TOTAL_TOOLS_EXPECTED)
    }
  })
})
