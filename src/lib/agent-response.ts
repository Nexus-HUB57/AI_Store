/**
 * Agent Response Helpers
 *
 * Standardizes all API responses for AI agent consumption:
 * - Adds X-Response-Time header
 * - Adds Cache-Control for GET endpoints
 * - Records call metrics for /api/agent/metrics
 * - Provides consistent error wrapping
 */

import { NextResponse } from 'next/server'
import { recordCall } from '@/app/api/agent/metrics/route'

type CachePolicy =
  | 'no-cache'
  | 'private'
  | `public, max-age=${number}`
  | `public, max-age=${number}, s-maxage=${number}`

interface AgentResponseOptions {
  /** Cache-Control header value. Default: 'no-cache' */
  cache?: CachePolicy
  /** Custom headers to add */
  headers?: Record<string, string>
  /** Disable metrics recording (default: false) */
  noMetrics?: boolean
  /** Request start time (Date.now() before handler). Auto-set by withAgentHandler. */
  startTime?: number
  /** Endpoint path for metrics (auto-set by withAgentHandler) */
  endpoint?: string
  /** HTTP method for metrics (auto-set by withAgentHandler) */
  method?: string
}

/**
 * Create an agent-friendly JSON response with standard headers.
 */
export function agentResponse(
  data: unknown,
  opts: AgentResponseOptions = {},
): NextResponse {
  const latencyMs = opts.startTime ? Date.now() - opts.startTime : 0
  const headers: Record<string, string> = {
    'X-Response-Time': `${latencyMs}ms`,
    ...opts.headers,
  }

  // Cache-Control
  if (opts.cache) {
    headers['Cache-Control'] = opts.cache
  }

  // Record metrics (non-blocking, fire-and-forget)
  if (!opts.noMetrics && opts.endpoint && opts.method) {
    try {
      recordCall({
        endpoint: opts.endpoint,
        method: opts.method,
        statusCode: 200,
        latencyMs,
      })
    } catch {
      // Metrics should never break the response
    }
  }

  return NextResponse.json(data, { headers })
}

/**
 * Create an agent-friendly error response with resolution hints.
 * Wraps agentErrorResponse from error-resolver.ts for consistency.
 */
export function agentError(
  endpoint: string,
  error: unknown,
  statusCode: number,
  opts: Omit<AgentResponseOptions, 'cache'> = {},
): NextResponse {
  const latencyMs = opts.startTime ? Date.now() - opts.startTime : 0
  const errMsg = error instanceof Error ? error.message : String(error)

  // Record error metrics
  if (!opts.noMetrics && opts.method) {
    try {
      recordCall({
        endpoint,
        method: opts.method,
        statusCode,
        latencyMs,
        errorCode: `${statusCode}`,
      })
    } catch {
      // non-blocking
    }
  }

  return NextResponse.json(
    {
      error: errMsg,
      timestamp: new Date().toISOString(),
      documentation: `${process.env.NEXT_PUBLIC_BASE_URL || '/aistore'}/api/agent/openapi-spec`,
    },
    {
      status: statusCode,
      headers: {
        'X-Response-Time': `${latencyMs}ms`,
        ...opts.headers,
      },
    },
  )
}

// Cache policy presets for common patterns
export const CACHE = {
  /** No caching (default for dynamic data) */
  dynamic: 'no-cache' as CachePolicy,
  /** Short cache for real-time data */
  realtime: 'public, max-age=5' as CachePolicy,
  /** Medium cache for semi-static data */
  short: 'public, max-age=60' as CachePolicy,
  /** Long cache for rarely-changing data */
  long: 'public, max-age=300, s-maxage=300' as CachePolicy,
} as const
