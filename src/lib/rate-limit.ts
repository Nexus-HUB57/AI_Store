// In-memory sliding-window rate limiter
// For production: swap to Redis-backed store

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 60s
setInterval(() => {
  const now = Date.now()
  const windowMs = 60000
  for (const [key, entry] of store) {
    // Remove timestamps outside the sliding window
    entry.timestamps = entry.timestamps.filter(t => now - t < windowMs)
    if (entry.timestamps.length === 0) store.delete(key)
  }
}, 60000)

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

export function rateLimit({
  key,
  limit = 60,
  windowMs = 60000,
}: {
  key: string
  limit?: number
  windowMs?: number
}): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Sliding window: remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(t => t > windowStart)

  const remaining = Math.max(0, limit - entry.timestamps.length)
  const resetAt = entry.timestamps.length > 0
    ? entry.timestamps[0] + windowMs
    : now + windowMs

  if (entry.timestamps.length >= limit) {
    return { success: false, limit, remaining: 0, resetAt }
  }

  entry.timestamps.push(now)
  return { success: true, limit, remaining: remaining - 1, resetAt }
}

// Stricter limits for sensitive endpoints
export const RATE_LIMITS = {
  default: { limit: 120, windowMs: 60000 },       // 120 req/min
  auth: { limit: 10, windowMs: 60000 },          // 10 req/min
  cart: { limit: 20, windowMs: 60000 },          // 20 req/min
  review: { limit: 15, windowMs: 60000 },        // 15 req/min
  upload: { limit: 5, windowMs: 60000 },         // 5 req/min
  search: { limit: 60, windowMs: 60000 },        // 60 req/min
  sandbox: { limit: 10, windowMs: 60000 },       // 10 req/min
} as const
