import { test, expect } from '@playwright/test'

/*
 * E2E test that verifies the /api/health endpoint returns the expected shape.
 * This is a lightweight API-level check — no browser rendering needed.
 */

test.describe('Health API', () => {

  test('GET /api/health returns ok status with services', async ({ request }) => {
    const response = await request.get('/api/health')

    // Status should be 200
    expect(response.status()).toBe(200)

    const body = await response.json()

    // Verify top-level status field
    expect(body).toHaveProperty('status', 'ok')

    // Verify version exists and is a non-empty string
    expect(body).toHaveProperty('version')
    expect(typeof body.version).toBe('string')
    expect(body.version.length).toBeGreaterThan(0)

    // Verify services object exists and has database: 'connected'
    expect(body).toHaveProperty('services')
    expect(typeof body.services).toBe('object')
    expect(body.services).toHaveProperty('database', 'connected')
  })
})
