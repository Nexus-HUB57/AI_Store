import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration for AI Store Nexus.
 *
 * - Chromium only (fastest, most common).
 * - Runs against the Next.js dev server on port 3000.
 * - Reuses an existing dev server if one is already running.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: 'html',
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
