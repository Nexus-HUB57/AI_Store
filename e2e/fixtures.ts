/**
 * Shared Playwright helpers for AI Store E2E tests.
 *
 * UI: loginAs, openCart, closeDialog
 * API (CSRF-aware): bootstrapCsrf, loginAgent, fetchProducts, purchaseCart
 *
 * CSRF pattern (middleware):
 *   1. GET any page/API → Set-Cookie: csrf_token=...
 *   2. POST with header X-CSRF-Token matching cookie
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test'

// ─── UI helpers ─────────────────────────────────────────────────────────────

/** Login as agent via UI wallet dialog. Returns when agent badge is visible. */
export async function loginAs(
  page: Page,
  address: string,
  displayName: string,
) {
  const loginTrigger = page.locator('button:has-text("Conectar Wallet")')
  await loginTrigger.waitFor({ state: 'visible', timeout: 15_000 })
  await loginTrigger.click()

  const loginDialog = page.locator('[role="dialog"]').last()
  await loginDialog.waitFor({ state: 'visible', timeout: 10_000 })

  await loginDialog.locator('input').first().fill(address)
  await loginDialog.locator('input').nth(1).fill(displayName)
  await loginDialog.locator('button:has-text("Autenticar Agente")').click()

  const agentBadge = page.locator(`button:has-text("${displayName}")`)
  await agentBadge.waitFor({ state: 'visible', timeout: 15_000 })

  if (await page.locator('[role="dialog"]').isVisible()) {
    const closeBtn = page
      .locator('[role="dialog"]')
      .locator('button[aria-label="Close"]')
    if (await closeBtn.isVisible()) await closeBtn.click()
    else await page.keyboard.press('Escape')
  }
}

/** Open cart sheet (FAB with shopping-cart icon). */
export async function openCart(page: Page) {
  const cartFab = page.locator('button').filter({
    has: page.locator('svg.lucide-shopping-cart, svg[class*="shopping-cart"]'),
  })
  await cartFab.waitFor({ state: 'visible', timeout: 10_000 })
  await cartFab.click()

  const cartSheet = page.locator('[role="dialog"]').last()
  await cartSheet.waitFor({ state: 'visible', timeout: 10_000 })
  return cartSheet
}

/** Close the currently open dialog/sheet. */
export async function closeDialog(page: Page) {
  const dialog = page.locator('[role="dialog"]').last()
  if (!(await dialog.isVisible())) return
  const closeBtn = dialog.locator('button[aria-label="Close"]')
  if (await closeBtn.isVisible()) await closeBtn.click()
  else await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible({ timeout: 5_000 })
}

// ─── API CSRF session ───────────────────────────────────────────────────────

/**
 * Bootstrap CSRF token by hitting a safe GET endpoint.
 * Playwright's request context stores cookies automatically;
 * we only need to return the token for the X-CSRF-Token header.
 */
export async function bootstrapCsrf(request: APIRequestContext): Promise<string> {
  // Homepage sets csrf_token cookie (Path=/aistore/)
  const home = await request.get('/')
  // Health also refreshes the token
  await request.get('/api/health')

  // Read cookie jar from storage state if available
  const storage = await request.storageState?.().catch(() => null)
  if (storage?.cookies) {
    const found = storage.cookies.find((c: { name: string }) => c.name === 'csrf_token')
    if (found?.value) return found.value
  }

  // Fallback: parse Set-Cookie from a dedicated probe
  const probe = await request.get('/api/products?limit=1')
  const headers = probe.headers()
  const setCookie = headers['set-cookie'] || ''
  const match = setCookie.match(/csrf_token=([^;]+)/)
  if (match) return match[1]

  // Last resort: empty — caller will see 403 and know to refresh
  return ''
}

function csrfHeaders(token: string, extra?: Record<string, string>) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'X-CSRF-Token': token } : {}),
    ...extra,
  }
}

/** API: login agent (CSRF-aware). Returns body with agent. */
export async function loginAgent(
  request: APIRequestContext,
  address: string,
  displayName: string,
  csrfToken?: string,
) {
  const token = csrfToken ?? (await bootstrapCsrf(request))
  const res = await request.post('/api/auth/login', {
    headers: csrfHeaders(token),
    data: { address, displayName },
  })
  // Allow 200 success; surface body for debugging on failure
  const body = await res.json().catch(() => ({}))
  if (res.status() !== 200) {
    throw new Error(
      `loginAgent failed: HTTP ${res.status()} ${JSON.stringify(body).slice(0, 200)}`,
    )
  }
  expect(body).toHaveProperty('agent')
  return body as {
    agent: {
      id: string
      address: string
      displayName: string
      balanceSats: number
      isNew?: boolean
    }
    signupBonus?: number
  }
}

/** API: fetch N products. */
export async function fetchProducts(request: APIRequestContext, limit = 1) {
  const res = await request.get(`/api/products?limit=${limit}`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toHaveProperty('products')
  expect(Array.isArray(body.products)).toBe(true)
  expect(body.products.length).toBeGreaterThan(0)
  return body.products as Array<{ id: string; precoSats: number; nome?: string }>
}

/** API: POST /api/cart purchase (CSRF-aware). */
export async function purchaseCart(
  request: APIRequestContext,
  opts: {
    agentId: string
    items: Array<{ id: string; precoSats: number }>
    totalSats: number
    idempotencyKey?: string
    csrfToken?: string
  },
) {
  const token = opts.csrfToken ?? (await bootstrapCsrf(request))
  const data: Record<string, unknown> = {
    agentId: opts.agentId,
    items: opts.items,
    totalSats: opts.totalSats,
  }
  if (opts.idempotencyKey) data.idempotencyKey = opts.idempotencyKey

  const res = await request.post('/api/cart', {
    headers: csrfHeaders(token),
    data,
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status(), body }
}

/** API: assert health shape (used by health-api + prod smoke). */
export async function assertHealth(request: APIRequestContext) {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toHaveProperty('status', 'ok')
  expect(body).toHaveProperty('version')
  expect(typeof body.version).toBe('string')
  expect(body.services).toHaveProperty('database', 'connected')
  return body
}
