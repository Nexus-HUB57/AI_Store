import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { generateCsrfToken } from '@/lib/csrf'

const PROTECTED_ROUTES = ['/dashboard', '/publish']
const PROTECTED_API = ['/api/agent/dashboard', '/api/referral/stats', '/api/referral/claim', '/api/admin/']

// State-changing API routes that need CSRF protection
const CSRF_PROTECTED_API = ['/api/cart', '/api/reviews', '/api/upload-aipkg', '/api/referral/claim', '/api/auth/login']
const MAX_BODY_SIZE = 10 * 1024 * 1024 // 10MB

function getRateLimitConfig(pathname: string) {
  if (pathname.startsWith('/api/auth')) return RATE_LIMITS.auth
  if (pathname.startsWith('/api/cart')) return RATE_LIMITS.cart
  if (pathname.startsWith('/api/reviews')) return RATE_LIMITS.review
  if (pathname.startsWith('/api/upload')) return RATE_LIMITS.upload
  if (pathname.startsWith('/api/products')) return RATE_LIMITS.search
  if (pathname.startsWith('/api/sandbox')) return RATE_LIMITS.sandbox
  if (pathname.startsWith('/api/admin')) return RATE_LIMITS.auth
  return RATE_LIMITS.default
}

function getClientId(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method

  // ── Request body size limit for POST/PUT/PATCH ──
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Payload muito grande. Maximo: 10MB.' },
        { status: 413 },
      )
    }
  }

  // ── Auth guard: Protected page routes ──
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const agentId = req.cookies.get('agent_id')?.value
    if (!agentId) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/'
      loginUrl.searchParams.set('auth', 'required')
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── Auth guard: Protected API routes ──
  if (PROTECTED_API.some((r) => pathname.startsWith(r))) {
    const agentId = req.cookies.get('agent_id')?.value
    if (!agentId) {
      return NextResponse.json({ error: 'Autenticacao necessaria' }, { status: 401 })
    }
  }

  // ── Rate limiting + security: API routes ──
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
        },
      )
    }

    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(config.limit))
    response.headers.set('X-RateLimit-Remaining', String(result.remaining))
    response.headers.set('X-RateLimit-Reset', String(result.resetAt))
    response.headers.set('X-Request-Id', crypto.randomUUID().slice(0, 8))

    // ── CSRF: Set token on GET, validate on state-changing ──
    if (['GET', 'HEAD'].includes(method)) {
      const existingToken = req.cookies.get('csrf_token')?.value
      if (!existingToken) {
        const token = generateCsrfToken()
        response.cookies.set('csrf_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 86400,
        })
      }
    } else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      // Validate CSRF for state-changing API routes
      if (CSRF_PROTECTED_API.some((r) => pathname.startsWith(r))) {
        const headerToken = req.headers.get('x-csrf-token')
        const cookieToken = req.cookies.get('csrf_token')?.value
        if (!headerToken || !cookieToken || headerToken !== cookieToken) {
          return NextResponse.json(
            { error: 'Token CSRF invalido ou ausente. Recarregue a pagina.' },
            { status: 403 },
          )
        }
      }
    }

    return response
  }

  // Non-API: security headers + CSRF token
  const response = NextResponse.next()

  // Set CSRF cookie for page loads
  const existingToken = req.cookies.get('csrf_token')?.value
  if (!existingToken) {
    const token = generateCsrfToken()
    response.cookies.set('csrf_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 86400,
    })
  }

  return setSecurityHeaders(response)
}

function setSecurityHeaders(res: NextResponse): NextResponse {
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
