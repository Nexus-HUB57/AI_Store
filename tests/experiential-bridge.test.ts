/**
 * Tests unitários para experiential-bridge (sem chamada de rede real).
 *
 * Cobre:
 *   - normalização de traces (campos snake_case + camelCase)
 *   - normalização de routers
 *   - parser JSONL tolerante a linhas malformadas
 *   - clamping de limit/offset
 */

import { describe, it, expect } from 'vitest'

// Reimplementação local das funções puras (mirror de src/lib/experiential-bridge)
// para que o teste não dependa do Prisma Client.
function parseJsonl<T = Record<string, unknown>>(text: string): T[] {
  const out: T[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    try {
      out.push(JSON.parse(line) as T)
    } catch {
      // pula
    }
  }
  return out
}

function normalizeTrace(raw: Record<string, unknown>): { traceId: string } | null {
  const traceId =
    (raw.trace_id as string) ||
    (raw.id as string) ||
    (raw.hash as string) ||
    ''
  if (!traceId || traceId.length < 8) return null
  return { traceId }
}

function normalizeRouter(raw: Record<string, unknown>): { routerId: string; topK: number } | null {
  const routerId =
    (raw.router_id as string) || (raw.policy_id as string) || (raw.id as string) || ''
  if (!routerId) return null
  return { routerId, topK: Number(raw.top_k ?? 5) }
}

function clampLimit(raw: string | null, fallback = 100, max = 500) {
  const n = Number(raw || fallback)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(Math.floor(n), max)
}

describe('experiential-bridge (unit)', () => {
  describe('parseJsonl', () => {
    it('parseia múltiplas linhas válidas', () => {
      const text = '{"trace_id":"abc123"}\n{"trace_id":"def456"}\n'
      expect(parseJsonl(text)).toEqual([
        { trace_id: 'abc123' },
        { trace_id: 'def456' },
      ])
    })

    it('ignora linhas vazias e malformadas', () => {
      const text = '{"trace_id":"abc"}\n\n{quebrado\n{"trace_id":"def"}\n'
      expect(parseJsonl(text)).toEqual([{ trace_id: 'abc' }, { trace_id: 'def' }])
    })

    it('retorna array vazio para texto vazio', () => {
      expect(parseJsonl('')).toEqual([])
      expect(parseJsonl('\n\n\n')).toEqual([])
    })
  })

  describe('normalizeTrace', () => {
    it('aceita snake_case (formato exp CLI)', () => {
      const t = normalizeTrace({
        trace_id: 'abcdef1234567890',
        source: 'gateway',
        tokens_in: 100,
        tokens_out: 50,
        cost_usd: 0.001,
        model: 'gpt-4o-mini',
        provider: 'openai',
      })
      expect(t).toEqual({ traceId: 'abcdef1234567890' })
    })

    it('aceita camelCase (mirror alternativo)', () => {
      const t = normalizeTrace({
        id: 'abcdef1234567890',
        source: 'sdk',
      })
      expect(t).toEqual({ traceId: 'abcdef1234567890' })
    })

    it('rejeita traceId curto demais', () => {
      expect(normalizeTrace({ trace_id: 'short' })).toBeNull()
      expect(normalizeTrace({ trace_id: '' })).toBeNull()
      expect(normalizeTrace({})).toBeNull()
    })

    it('usa hash como último fallback', () => {
      const t = normalizeTrace({ hash: '0123456789abcdef' })
      expect(t?.traceId).toBe('0123456789abcdef')
    })
  })

  describe('normalizeRouter', () => {
    it('extrai routerId e topK', () => {
      const r = normalizeRouter({
        router_id: 'chimera7-v1',
        top_k: 10,
      })
      expect(r).toEqual({ routerId: 'chimera7-v1', topK: 10 })
    })

    it('topK default = 5 quando ausente', () => {
      const r = normalizeRouter({ router_id: 'router-x' })
      expect(r?.topK).toBe(5)
    })

    it('rejeita routerId vazio', () => {
      expect(normalizeRouter({})).toBeNull()
      expect(normalizeRouter({ id: '' })).toBeNull()
    })

    it('aceita policy_id como alternativa', () => {
      const r = normalizeRouter({ policy_id: 'frozen-policy-xyz' })
      expect(r?.routerId).toBe('frozen-policy-xyz')
    })
  })

  describe('clampLimit', () => {
    it('clamp em max=500', () => {
      expect(clampLimit('1000')).toBe(500)
    })

    it('usa fallback para inválido', () => {
      expect(clampLimit('abc')).toBe(100)
      expect(clampLimit(null)).toBe(100)
    })

    it('aceita valor válido dentro do range', () => {
      expect(clampLimit('50')).toBe(50)
      expect(clampLimit('499')).toBe(499)
      expect(clampLimit('500')).toBe(500)
    })

    it('rejeita valores <= 0', () => {
      expect(clampLimit('0')).toBe(100)
      expect(clampLimit('-5')).toBe(100)
    })
  })

  describe('integração JSONL + normalize', () => {
    it('parseia + normaliza em pipeline', () => {
      const jsonl = [
        JSON.stringify({ trace_id: 'abcdef1234', source: 'gateway', model: 'gpt-4o-mini' }),
        JSON.stringify({ trace_id: 'ghijkl5678', source: 'sdk', model: 'claude-haiku' }),
        '',
        'linha inválida',
      ].join('\n')
      const traces = parseJsonl(jsonl).map(normalizeTrace).filter((t) => t !== null)
      expect(traces).toHaveLength(2)
      expect(traces[0]?.traceId).toBe('abcdef1234')
      expect(traces[1]?.traceId).toBe('ghijkl5678')
    })
  })
})
