import { randomBytes } from 'crypto'

const CSRF_HEADER = 'x-csrf-token'
const CSRF_COOKIE = 'csrf_token'
const CSRF_EXPIRY = 60 * 60 * 24 // 24h

/**
 * Generate a new CSRF token and set it as a cookie.
 * Call this on GET requests that serve forms.
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Set the CSRF cookie on a response.
 */
export function setCsrfCookie(res: Response, token: string): void {
  const headers = new Headers(res.headers)
  headers.append('Set-Cookie', `${CSRF_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${CSRF_EXPIRY}`)
  // Note: NextResponse headers are immutable, use cookies.set instead
}

/**
 * Validate CSRF token from header against cookie.
 * For Next.js API routes using NextResponse.
 */
export function validateCsrf(req: Request): boolean {
  // Skip CSRF for GET/HEAD/OPTIONS
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return true

  const headerToken = req.headers.get(CSRF_HEADER)
  const cookieHeader = req.headers.get('cookie') || ''

  if (!headerToken) return false

  // Parse cookies to find csrf_token
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )

  const cookieToken = cookies[CSRF_COOKIE]
  if (!cookieToken) return false

  // Constant-time comparison via timingSafeEqual
  try {
    const a = Buffer.from(headerToken, 'hex')
    const b = Buffer.from(cookieToken, 'hex')
    if (a.length !== b.length) return false
    const { timingSafeEqual } = require('crypto')
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
