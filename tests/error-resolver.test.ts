import { describe, it, expect } from 'vitest'
import { resolveError, agentErrorResponse } from '@/lib/error-resolver'
import { z } from 'zod'

describe('Error Resolver', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().min(0),
    role: z.enum(['admin', 'user', 'guest']),
  })

  describe('resolveError', () => {
    it('should handle ZodError with missing field', () => {
      const result = testSchema.safeParse({ age: 25, role: 'user' })
      if (!result.success) {
        const resolution = resolveError('/api/cart', result.error)
        expect(resolution.code).toBe('MISSING_FIELD')
        expect(resolution.severity).toBe('error')
        expect(resolution.auto_fixable).toBe(true)
        expect(resolution.suggestion).toBeTruthy()
        expect(resolution.corrected_example).toBeTruthy()
      }
    })

    it('should handle ZodError with invalid type', () => {
      const result = testSchema.safeParse({ name: 123, age: 25, role: 'user' })
      if (!result.success) {
        const resolution = resolveError('/api/products', result.error)
        expect(['TYPE_MISMATCH', 'MISSING_FIELD', 'VALIDATION_ERROR']).toContain(resolution.code)
        expect(resolution.message).toBeTruthy()
      }
    })

    it('should handle ZodError with invalid enum', () => {
      const result = testSchema.safeParse({ name: 'test', age: 25, role: 'superadmin' })
      if (!result.success) {
        const resolution = resolveError('/api/reviews', result.error)
        expect(['INVALID_ENUM', 'VALIDATION_ERROR', 'TYPE_MISMATCH', 'MISSING_FIELD']).toContain(resolution.code)
      }
    })

    it('should handle generic Error objects', () => {
      const resolution = resolveError('/api/cart', new Error('Something went wrong'))
      expect(resolution.code).toContain('ERROR')
      expect(resolution.message).toBe('Something went wrong')
    })

    it('should handle string errors', () => {
      const resolution = resolveError('/api/products', 'raw string error')
      expect(resolution.code).toBe('UNKNOWN_ERROR')
      expect(resolution.message).toBe('raw string error')
    })

    it('should handle unknown errors', () => {
      const resolution = resolveError('/api/cart', null)
      expect(resolution.code).toBe('INTERNAL_ERROR')
      expect(resolution.message).toBeTruthy()
    })

    it('should provide endpoint-specific hints for /api/cart', () => {
      const resolution = resolveError('/api/cart', new Error('test'))
      expect(resolution.suggestion).toBeTruthy()
      expect(resolution.corrected_example).toBeTruthy()
    })

    it('should provide endpoint-specific hints for /api/products', () => {
      const resolution = resolveError('/api/products', new Error('test'))
      expect(resolution.suggestion).toBeTruthy()
    })

    it('should provide endpoint-specific hints for /api/reviews', () => {
      const resolution = resolveError('/api/reviews', new Error('test'))
      expect(resolution.suggestion).toBeTruthy()
    })

    it('should provide endpoint-specific hints for /api/sandbox/try', () => {
      const resolution = resolveError('/api/sandbox/try', new Error('test'))
      expect(resolution.suggestion).toBeTruthy()
    })

    it('should detect rate limit errors', () => {
      const rateErr = { status: 429, message: 'Rate limit exceeded' }
      const resolution = resolveError('/api/cart', rateErr)
      expect(resolution.code).toBe('RATE_LIMITED')
      expect(resolution.severity).toBe('warning')
      expect(resolution.suggestion).toContain('Retry')
    })

    it('should detect auth errors', () => {
      const authErr = { status: 401, message: 'Unauthorized' }
      const resolution = resolveError('/api/cart', authErr)
      expect(resolution.code).toBe('AUTH_REQUIRED')
      expect(resolution.suggestion).toContain('login')
    })

    it('should detect balance errors', () => {
      const balanceErr = { message: 'Saldo insuficiente', balance: 5000, required: 10000 }
      const resolution = resolveError('/api/cart', balanceErr)
      expect(resolution.code).toBe('INSUFFICIENT_BALANCE')
      expect(resolution.severity).toBe('warning')
    })

    it('should handle 404 errors', () => {
      const notFoundErr = { status: 404, message: 'Not found' }
      const resolution = resolveError('/api/products', notFoundErr)
      expect(resolution.code).toBe('NOT_FOUND')
    })

    it('should have correct severity levels', () => {
      const error5xx = resolveError('/api/cart', { status: 500, message: 'Server error' })
      expect(error5xx.severity).toBe('error')

      const error4xx = resolveError('/api/cart', { status: 400, message: 'Bad request' })
      expect(error4xx.severity).toBe('warning')
    })
  })

  describe('agentErrorResponse', () => {
    it('should return a Response with status code', () => {
      const response = agentErrorResponse('/api/cart', new Error('test'), 400)
      expect(response.status).toBe(400)
    })

    it('should include resolution object in body', async () => {
      const response = agentErrorResponse('/api/cart', new Error('test error'), 400)
      const body = await response.json()
      expect(body.error).toBeTruthy()
      expect(body.resolution).toBeDefined()
      expect(body.resolution.code).toBeTruthy()
      expect(body.resolution.suggestion).toBeTruthy()
      expect(body.resolution.severity).toBeTruthy()
      expect(typeof body.resolution.auto_fixable).toBe('boolean')
    })

    it('should set 500 status for server errors', () => {
      const response = agentErrorResponse('/api/products', new Error('internal'), 500)
      expect(response.status).toBe(500)
    })
  })
})
