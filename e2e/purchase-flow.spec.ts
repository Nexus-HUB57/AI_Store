import { test, expect, Page } from '@playwright/test'

/*
 * E2E test for a complete purchase flow on the AI Store Nexus.
 *
 * Flow:
 *  1. Navigate to homepage and wait for products to load
 *  2. Open product detail dialog, verify contents, then close it
 *  3. Login / register as an agent via the wallet connection dialog
 *  4. Add a product to the cart and verify the toast notification
 *  5. Open the cart panel and verify the product is listed
 *  6. Execute the purchase and verify success state
 */

test.describe('Purchase Flow', () => {

  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('complete purchase from browse to checkout', async () => {
    // ── Step 1: Navigate to homepage and wait for products ──────────
    await page.goto('/')

    // Wait for the product grid to appear — products render inside cards
    // that contain a "BAIT" price label (the product grid replaces skeletons).
    const firstProductCard = page.locator('[class*="card-glow-hover"]').first()
    await firstProductCard.waitFor({ state: 'visible', timeout: 15_000 })

    // Also confirm at least one product has a BAIT price rendered
    await expect(page.locator('text=BAIT').first()).toBeVisible({ timeout: 15_000 })

    // ── Step 2: Click the first product card to open detail dialog ──
    await firstProductCard.click()

    // The product detail dialog uses Radix Dialog — look for the dialog content
    const dialogContent = page.locator('[role="dialog"]')
    await dialogContent.waitFor({ state: 'visible', timeout: 10_000 })

    // Step 3: Verify product name, price (BAIT), and segment badge are visible
    // The dialog title contains the product name
    await expect(dialogContent.locator('h2, [role="heading"]').first()).toBeVisible()

    // Price is shown with "BAIT" text
    await expect(dialogContent.locator('text=BAIT').first()).toBeVisible()

    // Segment badge is present (one of the known segments rendered with underscore replaced by space)
    const segmentBadges = dialogContent.locator('[class*="border-"][class*="text-"]')
    await expect(segmentBadges.first()).toBeVisible()

    // Step 4: Close the dialog — click the Radix close button (X icon button)
    const closeBtn = dialogContent.locator('button[aria-label="Close"]')
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    } else {
      // Fallback: press Escape to close
      await page.keyboard.press('Escape')
    }

    // Wait for the dialog to disappear
    await expect(dialogContent).not.toBeVisible({ timeout: 5_000 })

    // ── Step 5: Click the login / register button ───────────────────
    // When not authenticated, the header shows "Conectar Wallet" button
    const loginTrigger = page.locator('button:has-text("Conectar Wallet")')
    await loginTrigger.waitFor({ state: 'visible', timeout: 10_000 })
    await loginTrigger.click()

    // ── Step 6: Fill in the login dialog ────────────────────────────
    const loginDialog = page.locator('[role="dialog"]').last()
    await loginDialog.waitFor({ state: 'visible', timeout: 10_000 })

    // Fill the address field ("Endereço do Agente")
    const addressInput = loginDialog.locator('input').first()
    await addressInput.fill('e2e-test-agent')

    // Fill the display name field ("Nome de Exibição")
    const nameInput = loginDialog.locator('input').nth(1)
    await nameInput.fill('E2E Tester')

    // Click the authenticate button ("Autenticar Agente")
    const authBtn = loginDialog.locator('button:has-text("Autenticar Agente")')
    await authBtn.click()

    // ── Step 7: Verify agent info appears after login ───────────────
    // After login, the header should show the agent's avatar badge with
    // display name and balance. The login dialog may stay open briefly for
    // new-user bonus display, so we wait for the agent badge in the header.
    const agentBadge = page.locator('button:has-text("E2E Tester")')
    await agentBadge.waitFor({ state: 'visible', timeout: 15_000 })

    // Also verify balance (sats) is displayed in the header agent badge
    await expect(page.locator('text=sats').first()).toBeVisible({ timeout: 10_000 })

    // Close the login dialog if it's still open (new-user bonus display)
    if (await page.locator('[role="dialog"]').isVisible()) {
      const dialogCloseBtn = page.locator('[role="dialog"]').locator('button[aria-label="Close"]')
      if (await dialogCloseBtn.isVisible()) {
        await dialogCloseBtn.click()
      } else {
        await page.keyboard.press('Escape')
      }
    }

    // ── Step 8: Add a product to the cart ───────────────────────────
    // Re-locate a product card (page may have re-rendered after login)
    const productCard = page.locator('[class*="card-glow-hover"]').first()
    await productCard.waitFor({ state: 'visible', timeout: 10_000 })

    // Click the "Adicionar" button inside the product card
    const addBtn = productCard.locator('button:has-text("Adicionar")')
    await addBtn.waitFor({ state: 'visible', timeout: 5_000 })
    await addBtn.click()

    // ── Step 9: Verify toast notification confirming the addition ───
    // The app uses Sonner (toast) — toasts appear inside [data-sonner-toaster]
    // and contain "Adicionado" text
    const toastContainer = page.locator('[data-sonner-toaster]')
    await expect(toastContainer.locator('text=Adicionado').first()).toBeVisible({
      timeout: 10_000,
    })

    // ── Step 10: Open the cart panel ────────────────────────────────
    // The cart is a floating action button (FAB) at the bottom-right with
    // a ShoppingCart icon. It's a plain <button>, not a standard header button.
    const cartFab = page.locator('button').filter({ has: page.locator('svg.lucide-shopping-cart, svg[class*="shopping-cart"]') })
    await cartFab.waitFor({ state: 'visible', timeout: 10_000 })
    await cartFab.click()

    // The cart panel opens as a Radix Sheet (side panel)
    const cartSheet = page.locator('[role="dialog"]').last()
    await cartSheet.waitFor({ state: 'visible', timeout: 10_000 })

    // ── Step 11: Verify the cart shows the added product ────────────
    // The cart title contains "Carrinho"
    await expect(cartSheet.locator('text=Carrinho').first()).toBeVisible()

    // The cart should no longer show "Carrinho vazio" (empty cart message)
    await expect(cartSheet.locator('text=Carrinho vazio')).not.toBeVisible()

    // ── Step 12: Click the purchase / checkout button ────────────────
    // For new users, the first 3 purchases are free, so the button says
    // "Resgatar Grátis". Otherwise it shows "Pagar X BAIT".
    const checkoutBtn = cartSheet.locator('button:has-text("Resgatar Grátis"), button:has-text("Pagar")')
    await checkoutBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await checkoutBtn.click()

    // ── Step 13: Verify success state ───────────────────────────────
    // After a successful purchase, the cart panel shows "Transação Confirmada"
    // with a CheckCircle2 icon, along with a TX hash.
    await expect(cartSheet.locator('text=Transação Confirmada")).toBeVisible({
      timeout: 15_000,
    })

    // Also verify a TX ID is displayed (starts with "TX:")
    await expect(cartSheet.locator('text=TX:').first()).toBeVisible()
  })
})
