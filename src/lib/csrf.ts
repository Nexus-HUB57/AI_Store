/**
 * CSRF utilities — Edge Runtime compatible.
 * Used by middleware (Edge) and API routes (Node.js).
 */

const CSRF_HEADER = 'x-csrf-token'
const CSRF_COOKIE = 'csrf_token'

/**
 * Generate a CSRF token using crypto.randomUUID (Edge-compatible).
 */
export function generateCsrfToken(): string {
  // Generate 2 UUIDs for 64 hex chars (equivalent to 32 bytes)
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
}

/**
 * Simple constant-time string comparison.
 * Not cryptographic, but sufficient for CSRF tokens
 * which are bound to httpOnly cookies.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
   let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Validate CSRF token from header against cookie.
 * Returns true for safe methods (GET/HEAD/OPTIONS).
 * Edge Runtime compatible.
 */
export function validateCsrf(req: { method: string; headers: { get(k: string): string | null }; cookies: { get(k: string): { value: string } | undefined } }): boolean {
  const method = req.method
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true

  const headerToken = req.headers.get(CSRF_HEADER)
  if (!headerToken) return false

  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value
  if (!cookieToken) return false

  return safeEqual(headerToken, cookieToken)
}

/**
 * Create a CSRF validation result.
 * Returns null if valid, or an error message if invalid.
 * For use in API routes (not middleware).
 */
export function csrfCheck(req: { method: string; headers: { get(k: string): string | null }; cookies: { get(k: string): { value: string } | undefined } }): string | null {
  if (!validateCsrf(req)) {
    return 'Token CSRF invalido ou ausente. Recarregue a pagina e tente novamente.'
  }
  return null
}
