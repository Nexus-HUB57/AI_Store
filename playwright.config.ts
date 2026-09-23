import { defineConfig, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Playwright E2E — dual target + Node env loader
 *
 * Env load order (file values do not override existing process.env):
 *   1. .env.e2e
 *   2. .env.local
 *   3. .env
 *
 * Projects:
 *   chromium      → local (http://localhost:3000) + webServer
 *   chromium-prod → production (https://www.mybait.org/aistore)
 *
 * Usage:
 *   cp .env.e2e.example .env.e2e
 *   npm run e2e
 *   npm run e2e:prod
 *   BASE_URL=https://www.mybait.org/aistore npm run e2e:prod
 */

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = val
    }
  }
}

const root = process.cwd()
loadEnvFile(path.join(root, '.env.e2e'))
loadEnvFile(path.join(root, '.env.local'))
loadEnvFile(path.join(root, '.env'))

const PROD_BASE = 'https://www.mybait.org/aistore'
const LOCAL_BASE = 'http://localhost:3000'

const isProdProject =
  process.env.PLAYWRIGHT_PROJECT === 'chromium-prod' ||
  process.argv.includes('--project=chromium-prod') ||
  process.argv.includes('chromium-prod')

const localBase = process.env.BASE_URL_LOCAL || LOCAL_BASE
const prodBase = process.env.BASE_URL_PROD || PROD_BASE

const baseURL =
  process.env.BASE_URL || (isProdProject ? prodBase : localBase)

const timeout = Number(process.env.PLAYWRIGHT_TIMEOUT || 45_000)
const expectTimeout = Number(process.env.PLAYWRIGHT_EXPECT_TIMEOUT || 15_000)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout,
  expect: {
    timeout: expectTimeout,
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
        baseURL: process.env.BASE_URL || localBase,
      },
    },
    {
      name: 'chromium-prod',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL || prodBase,
      },
    },
  ],

  // Local only: start Next.js with the same env (SESSION_SECRET, DATABASE_URL, …)
  webServer: isProdProject
    ? undefined
    : {
        command: 'npm run dev',
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 90_000,
        env: {
          ...process.env,
          SESSION_SECRET:
            process.env.SESSION_SECRET ||
            'local-e2e-session-secret-min-16-chars',
          DATABASE_URL: process.env.DATABASE_URL || 'file:./db/custom.db',
          NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || '/aistore',
          NODE_ENV: process.env.NODE_ENV || 'development',
        },
      },
})
