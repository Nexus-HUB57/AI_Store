import { describe, it, expect, afterAll } from 'vitest'
import { isPostgreSQL } from '@/lib/env'

const originalDbUrl = process.env.DATABASE_URL

describe('env utilities', () => {
  afterAll(() => {
    process.env.DATABASE_URL = originalDbUrl
  })

  describe('isPostgreSQL', () => {
    it('returns false for SQLite URL', () => {
      process.env.DATABASE_URL = 'file:/app/db/custom.db'
      expect(isPostgreSQL()).toBe(false)
    })

    it('returns true for postgresql:// URL', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/ai_store'
      expect(isPostgreSQL()).toBe(true)
    })

    it('returns true for postgres:// URL', () => {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/ai_store'
      expect(isPostgreSQL()).toBe(true)
    })

    it('returns false for empty URL', () => {
      process.env.DATABASE_URL = ''
      expect(isPostgreSQL()).toBe(false)
    })

    it('returns false for mysql URL', () => {
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db'
      expect(isPostgreSQL()).toBe(false)
    })

    it('returns false for file:// relative path', () => {
      process.env.DATABASE_URL = 'file:./db/custom.db'
      expect(isPostgreSQL()).toBe(false)
    })
  })
})
