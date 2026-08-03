import { describe, it, expect, vi, afterAll } from 'vitest'
import { logger, logRequest } from '@/lib/logger'

const originalLogLevel = process.env.LOG_LEVEL

afterAll(() => {
  process.env.LOG_LEVEL = originalLogLevel
})

describe('logger', () => {
  it('logger has all 4 level methods', () => {
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
  })

  it('logger.debug accepts msg and data params', () => {
    expect(() => logger.debug('test', { key: 'val' })).not.toThrow()
  })

  it('logger.info accepts msg and data params', () => {
    expect(() => logger.info('test')).not.toThrow()
  })

  it('logger.error always logs regardless of level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('critical error', { code: 500 })
    expect(spy).toHaveBeenCalled()
    const output = JSON.parse(spy.mock.calls[0][0])
    expect(output.level).toBe('error')
    expect(output.msg).toBe('critical error')
    spy.mockRestore()
  })

  it('logger.warn accepts msg and data params', () => {
    expect(() => logger.warn('warning msg')).not.toThrow()
  })
})

describe('logRequest', () => {
  it('is a function with correct signature', () => {
    expect(typeof logRequest).toBe('function')
    expect(() => logRequest('GET', '/api/test', 200, 10)).not.toThrow()
    expect(() => logRequest('POST', '/api/cart', 500, 200)).not.toThrow()
    expect(() => logRequest('DELETE', '/api/item', 404, 5)).not.toThrow()
  })
})
