import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration for AI Store Nexus — dual target.
 *
 * Projects:
 *   chromium      → local dev (http://localhost:3000) + auto webServer
 *   chromium-prod → production (https://www.mybait.org/aistore)
 *
 * Override either base with env BASE_URL.
 *
 * Usage:
 *   npx playwright test                         # local (chromium)
 *   npx playwright test --project=chromium-prod # production
 *   npm run e2e:prod
 */

const PROD_BASE = 'https://www.mybait.org/aistore'
const LOCAL_BASE = 'http://localhost:3000'

const isProdProject = process.env.PLAYWRIGHT_PROJECT === 'chromium-prod'
  || process.argv.includes('--project=chromium-prod')
  || process.argv.includes('chromium-prod')

const baseURL = process.env.BASE_URL
  || (isProdProject ? PROD_BASE : LOCAL_BASE)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 45_000,
  expect: {
    timeout: 15_000,
  },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL || LOCAL_BASE,
      },
    },
    {
      name: 'chromium-prod',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL || PROD_BASE,
      },
    },
  ],

  // webServer only for local project — ignored when running chromium-prod
  webServer: isProdProject
    ? undefined
    : {
        command: 'npm run dev',
        port: 3000,
        reuseExistingServer: true,
        timeout: 90_000,
      },
})
