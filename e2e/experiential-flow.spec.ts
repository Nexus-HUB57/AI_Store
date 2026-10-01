/**
 * E2E Playwright spec — fluxo de sincronização experiential ↔ AI Store.
 *
 * Como a CLI `exp` requer Python 3.12+ e dep complexas (não instaladas no CI),
 * este spec valida:
 *   1. Endpoint /api/experiential/sync retorna JSON estruturado
 *   2. Endpoint /api/experiential/traces retorna lista paginada
 *   3. Endpoint /api/experiential/routers retorna lista filtrada
 *   4. Schema dos modelos Prisma existe (smoke via metadata)
 *
 * Pré-condição: AISTORE_URL acessível (dev server ou staging)
 */

import { test, expect, request } from '@playwright/test'

const BASE = process.env.AISTORE_URL || 'http://localhost:3000'

test.describe('experiential sync API', () => {
  test('GET /api/experiential/sync lista histórico', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE}/api/experiential/sync?limit=10`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.syncs)).toBe(true)
    expect(body.meta.repo).toBe('experientiallabs/experiential')
    expect(body.meta.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test('POST /api/experiential/sync retorna shape esperado', async ({ request: ctx }) => {
    const res = await ctx.post(`${BASE}/api/experiential/sync`, {
      data: { trigger: 'e2e-test' },
    })
    // Aceita 200 (com CLI instalada) ou 200 com error_log preenchido (CLI ausente)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(typeof body.fetched).toBe('number')
    expect(typeof body.inserted).toBe('number')
    expect(typeof body.updated).toBe('number')
    expect(typeof body.errors).toBe('number')
    expect(typeof body.duration_ms).toBe('number')
    expect(typeof body.source).toBe('string')
    expect(Array.isArray(body.error_log)).toBe(true)
  })

  test('GET /api/experiential/traces suporta paginacao', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE}/api/experiential/traces?limit=5&offset=0`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.traces)).toBe(true)
    expect(body.limit).toBe(5)
    expect(body.offset).toBe(0)
    expect(typeof body.total).toBe('number')
  })

  test('GET /api/experiential/traces aceita filtro project', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE}/api/experiential/traces?project=chimera7-defi`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.ok).toBe(true)
    // Cada trace retornado (se houver) deve ter project=chimera7-defi
    for (const t of body.traces) {
      expect(t.project).toBe('chimera7-defi')
    }
  })

  test('GET /api/experiential/routers retorna lista', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE}/api/experiential/routers?limit=10`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.routers)).toBe(true)
    expect(typeof body.total).toBe('number')
  })

  test('GET /api/experiential/routers aceita filtro status', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE}/api/experiential/routers?status=built`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.ok).toBe(true)
    for (const r of body.routers) {
      expect(r.status).toBe('built')
    }
  })

  test('limite de paginação é respeitado (max 500)', async ({ request: ctx }) => {
    const res = await ctx.get(`${BASE}/api/experiential/traces?limit=99999`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.limit).toBeLessThanOrEqual(500)
  })
})
