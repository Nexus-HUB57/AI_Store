// ─── Technical Metrics Endpoint ───
// Provides function calling success rates and platform reliability metrics.
// Uses in-memory tracking — for production, swap to a time-series DB.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeReputation, type ReputationFactors } from '@/lib/reputation-engine'

// ── In-memory metrics store ──

interface CallRecord {
  endpoint: string
  method: string
  statusCode: number
  latencyMs: number
  agentId?: string
  timestamp: number
  errorCode?: string
}

const callLog: CallRecord[] = []
const MAX_LOG_SIZE = 10000
let totalRequestsAllTime = 0
let totalErrorsAllTime = 0
const startTime = Date.now()

/**
 * Record an API call for metrics tracking.
 * Call this from route handlers or middleware.
 */
export function recordCall(params: {
  endpoint: string
  method: string
  statusCode: number
  latencyMs: number
  agentId?: string
  errorCode?: string
}): void {
  totalRequestsAllTime++
  if (params.statusCode >= 400) totalErrorsAllTime++

  callLog.push({
    ...params,
    timestamp: Date.now(),
  })

  // Trim to prevent unbounded growth
  if (callLog.length > MAX_LOG_SIZE) {
    callLog.splice(0, callLog.length - MAX_LOG_SIZE)
  }
}

type Period = '1h' | '24h' | '7d' | '30d'

function getPeriodMs(period: Period): number {
  switch (period) {
    case '1h': return 60 * 60 * 1000
    case '24h': return 24 * 60 * 60 * 1000
    case '7d': return 7 * 24 * 60 * 60 * 1000
    case '30d': return 30 * 24 * 60 * 60 * 1000
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function filterByPeriod(records: CallRecord[], period: Period): CallRecord[] {
  const cutoff = Date.now() - getPeriodMs(period)
  return records.filter(r => r.timestamp >= cutoff)
}

function filterByAgent(records: CallRecord[], agentId: string): CallRecord[] {
  return records.filter(r => r.agentId === agentId)
}

// ── Known endpoints for reliability catalog ──
const KNOWN_ENDPOINTS = [
  'GET /api/products',
  'GET /api/products/compact',
  'POST /api/cart',
  'GET /api/cart',
  'POST /api/reviews',
  'GET /api/reviews',
  'POST /api/sandbox/try',
  'GET /api/sandbox/quick',
  'POST /api/auth/login',
  'GET /api/agent/dashboard',
  'GET /api/agent/discover',
  'GET /api/agent/metrics',
  'GET /api/health',
  'GET /api/stats',
] as const

/**
 * Compute per-endpoint success rate metrics.
 */
function computeEndpointMetrics(
  records: CallRecord[],
  agentId?: string,
): {
  endpoint: string
  calls: number
  success_rate: number
  avg_latency_ms: number
  p50_latency_ms: number
  p95_latency_ms: number
  error_count: number
  last_error_code?: string
}[] {
  const filtered = agentId ? filterByAgent(records, agentId) : records

  // Group by endpoint:method
  const groups = new Map<string, CallRecord[]>()
  for (const r of filtered) {
    const key = `${r.method} ${r.endpoint}`
    const group = groups.get(key) ?? []
    group.push(r)
    groups.set(key, group)
  }

  const result = []
  for (const [key, group] of groups) {
    const successes = group.filter(r => r.statusCode < 400)
    const errors = group.filter(r => r.statusCode >= 400)
    const latencies = group.map(r => r.latencyMs).sort((a, b) => a - b)
    const lastError = errors.length > 0 ? errors[errors.length - 1] : undefined

    result.push({
      endpoint: key,
      calls: group.length,
      success_rate: group.length > 0
        ? Math.round((successes.length / group.length) * 1000) / 10
        : 100,
      avg_latency_ms: latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0,
      p50_latency_ms: percentile(latencies, 50),
      p95_latency_ms: percentile(latencies, 95),
      error_count: errors.length,
      last_error_code: lastError?.errorCode,
    })
  }

  // Sort by calls descending
  result.sort((a, b) => b.calls - a.calls)
  return result
}

/**
 * Compute error breakdown by code.
 */
function computeErrorBreakdown(
  records: CallRecord[],
  agentId?: string,
): { code: string; count: number; percentage: number; last_seen: string }[] {
  const filtered = agentId ? filterByAgent(records, agentId) : records
  const errors = filtered.filter(r => r.statusCode >= 400)
  const total = errors.length
  if (total === 0) return []

  const codeMap = new Map<string, { count: number; lastSeen: number }>()
  for (const e of errors) {
    const code = e.errorCode || `${e.statusCode}`
    const entry = codeMap.get(code) ?? { count: 0, lastSeen: 0 }
    entry.count++
    if (e.timestamp > entry.lastSeen) entry.lastSeen = e.timestamp
    codeMap.set(code, entry)
  }

  return Array.from(codeMap.entries())
    .map(([code, { count, lastSeen }]) => ({
      code,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
      last_seen: new Date(lastSeen).toISOString(),
    }))
    .sort((a, b) => b.count - a.count)
}

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId') || undefined
  const period = (req.nextUrl.searchParams.get('period') || '24h') as Period

  // Validate period
  const validPeriods: Period[] = ['1h', '24h', '7d', '30d']
  if (!validPeriods.includes(period)) {
    return NextResponse.json(
      { error: `Invalid period. Use one of: ${validPeriods.join(', ')}` },
      { status: 400 },
    )
  }

  const periodRecords = filterByPeriod(callLog, period)
  const filteredRecords = agentId ? filterByAgent(periodRecords, agentId) : periodRecords

  // Platform uptime
  const uptimeMs = Date.now() - startTime
  const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60))

  // Core reliability numbers
  const totalCalls = filteredRecords.length
  const successCalls = filteredRecords.filter(r => r.statusCode < 400).length
  const errorCalls = totalCalls - successCalls
  const overallSuccessRate = totalCalls > 0
    ? Math.round((successCalls / totalCalls) * 1000) / 10
    : 100
  const latencies = filteredRecords.map(r => r.latencyMs).sort((a, b) => a - b)

  // ── Agent-specific additions ──
  let reputation: ReputationFactors | null = null
  if (agentId) {
    try {
      const agent = await db.agent.findUnique({ where: { id: agentId } })
      if (agent) {
        // Gather additional data for reputation computation
        const buyerTxs = await db.transaction.findMany({
          where: { buyerId: agentId },
          select: { status: true },
        })
        const reviews = await db.review.findMany({
          where: { agentId },
          select: { rating: true },
        })
        const referralCount = await db.referralReward.count({
          where: { referrerId: agentId, claimed: true },
        })
        const successfulTxs = buyerTxs.filter(t => t.status === 'confirmed').length
        const reviewAvg = reviews.length > 0
          ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
          : undefined

        reputation = computeReputation({
          purchaseCount: agent.purchaseCount,
          reputation: agent.reputation,
          balanceSats: agent.balanceSats,
          createdAt: agent.createdAt,
          referrals: referralCount,
          reviewAvgRating: reviewAvg,
          successfulTxs,
          totalTxs: buyerTxs.length,
        })
      }
    } catch {
      // Non-fatal: reputation is best-effort
    }
  }

  // Build response
  const response: Record<string, unknown> = {
    meta: {
      period,
      generated_at: new Date().toISOString(),
      platform_uptime_hours: uptimeHours,
      tracked_endpoints: KNOWN_ENDPOINTS.length,
    },
    reliability: {
      total_calls: totalCalls,
      successful_calls: successCalls,
      error_calls: errorCalls,
      overall_success_rate: overallSuccessRate,
      avg_latency_ms: latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0,
      p50_latency_ms: percentile(latencies, 50),
      p95_latency_ms: percentile(latencies, 95),
      p99_latency_ms: percentile(latencies, 99),
    },
    endpoints: computeEndpointMetrics(periodRecords, agentId),
    error_breakdown: computeErrorBreakdown(periodRecords, agentId),
  }

  if (agentId) {
    response.agent_id = agentId
    if (reputation) {
      response.reputation = reputation
    }
  }

  // All-time aggregate
  if (!agentId) {
    response.all_time = {
      total_requests: totalRequestsAllTime,
      total_errors: totalErrorsAllTime,
      lifetime_success_rate: totalRequestsAllTime > 0
        ? Math.round(((totalRequestsAllTime - totalErrorsAllTime) / totalRequestsAllTime) * 1000) / 10
        : 100,
    }
  }

  return NextResponse.json(response)
}
