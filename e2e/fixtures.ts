/**
 * Shared Playwright helpers for AI Store E2E tests.
 * Import from specs: import { loginAs, openCart, fetchProducts } from './fixtures'
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test'

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

  // Close residual dialog (new-user bonus)
  if (await page.locator('[role="dialog"]').isVisible()) {
    const closeBtn = page.locator('[role="dialog"]').locator('button[aria-label="Close"]')
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
  }
}

/** Open cart sheet (FAB with shopping-cart icon). Returns the sheet locator. */
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

/** Close the currently open cart / dialog. */
export async function closeDialog(page: Page) {
  const dialog = page.locator('[role="dialog"]').last()
  if (!(await dialog.isVisible())) return
  const closeBtn = dialog.locator('button[aria-label="Close"]')
  if (await closeBtn.isVisible()) {
    await closeBtn.click()
  } else {
    await page.keyboard.press('Escape')
  }
  await expect(dialog).not.toBeVisible({ timeout: 5_000 })
}

/** API: login agent and return body with agent. */
export async function loginAgent(
  request: APIRequestContext,
  address: string,
  displayName: string,
) {
  const res = await request.post('/api/auth/login', {
    data: { address, displayName },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toHaveProperty('agent')
  return body
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
