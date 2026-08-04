import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 chars').optional().default('nexus-aistore-session-secret-change-in-production'),
  NEXT_PUBLIC_BASE_PATH: z.string().optional().default('/aistore'),
  NEXT_PUBLIC_BASE_URL: z.string().url().optional().default('https://www.mybait.org/aistore'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  BAIT_PER_SAT: z.coerce.number().int().positive().optional().default(100),
  SIGNUP_BONUS_BAIT: z.coerce.number().int().positive().optional().default(100),
  REFERRAL_BONUS_BAIT: z.coerce.number().int().positive().optional().default(25),
  PULSAR_INTERVAL_MS: z.coerce.number().int().positive().optional().default(3000),
  PULSAR_BATCH_SIZE: z.coerce.number().int().positive().optional().default(5),
  PRODUCTS_PER_PAGE: z.coerce.number().int().positive().optional().default(12),
  SESSION_MAX_AGE_DAYS: z.coerce.number().int().positive().optional().default(30),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

export function getEnv(): Env {
  if (_env) return _env
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`))
    throw new Error('Invalid environment variables. See server logs for details.')
  }
  _env = parsed.data
  return _env
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function isPostgreSQL(): boolean {
  const url = process.env.DATABASE_URL || ''
  return url.startsWith('postgresql://') || url.startsWith('postgres://')
}
