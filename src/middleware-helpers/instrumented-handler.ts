/**
 * Instrumented API route handler — wraps Next.js route handlers with
 * structured logging, error handling, and request timing.
 * 
 * Usage:
 *   export const GET = instrumentedHandler('products.list', async (req) => {
 *     // ... your handler logic
 *   })
 */
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

type HandlerFn = (req: NextRequest) => Promise<NextResponse>

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export function instrumentedHandler(
  routeName: string,
  handler: HandlerFn,
  method: Method = 'GET',
): HandlerFn {
  return async (req: NextRequest) => {
    const start = Date.now()
    const requestId = crypto.randomUUID().slice(0, 8)

    try {
      const response = await handler(req)
      const duration = Date.now() - start
      const status = response.status

      logger.info(routeName, {
        method,
        status,
        duration_ms: duration,
        request_id: requestId,
        path: req.nextUrl.pathname,
      })

      // Append timing header
      response.headers.set('X-Response-Time', `${duration}ms`)
      return response
    } catch (error) {
      const duration = Date.now() - start
      logger.error(`${routeName}_error`, {
        method,
        duration_ms: duration,
        request_id: requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      return NextResponse.json(
        {
          error: 'Internal server error',
          request_id: requestId,
          route: routeName,
        },
        { status: 500 },
      )
    }
  }
}
