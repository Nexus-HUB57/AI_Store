import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

function getRateLimitConfig(pathname: string) {
  if (pathname.startsWith('/api/auth')) return RATE_LIMITS.auth
  if (pathname.startsWith('/api/cart')) return RATE_LIMITS.cart
  if (pathname.startsWith('/api/reviews')) return RATE_LIMITS.review
  if (pathname.startsWith('/api/upload')) return RATE_LIMITS.upload
  if (pathname.startsWith('/api/products')) return RATE_LIMITS.search
  return RATE_LIMITS.default
}

function getClientId(req: NextRequest): string {
  // Use x-forwarded-for in production, fallback to IP
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const config = getRateLimitConfig(pathname)
    const clientId = getClientId(req)
    const result = rateLimit({ key: `${clientId}:${pathname}`, ...config })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetAt: new Date(result.resetAt).toISOString() },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(config.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(result.resetAt),
          },
        }
      )
    }

    // Clone response to add rate limit headers
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(config.limit))
    response.headers.set('X-RateLimit-Remaining', String(result.remaining))
    response.headers.set('X-RateLimit-Reset', String(result.resetAt))
    return response
  }

  // Non-API: just set security headers
  const response = NextResponse.next()
  return setSecurityHeaders(response)
}

function setSecurityHeaders(res: NextResponse): NextResponse {
  // Content Security Policy
  res.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://z-cdn.chatglm.cn",
    "connect-src 'self' wss: https:",
    "frame-ancestors 'none'",
  ].join('; '))

  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set('X-DNS-Prefetch-Control', 'on')
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
