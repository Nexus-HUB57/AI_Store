import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { checkBaitcoinHealth } from '@/lib/baitcoin-api'
import { agentResponse } from '@/lib/agent-response'
import { APP_VERSION, DEPLOYMENT_TARGET } from '@/lib/version'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  try {
    const [productCount, agentCount, txCount] = await Promise.all([
      db.product.count(),
      db.agent.count(),
      db.transaction.count(),
    ])

    // Check b'AI'tcoin daemon connectivity
    const baitHealth = await checkBaitcoinHealth()

    const latency = Date.now() - start

    logger.info('health_check', { latency_ms: latency, products: productCount, agents: agentCount, bait_online: baitHealth.online })

    return agentResponse({
      status: 'ok',
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      latency_ms: latency,
      uptime_s: process.uptime(),
      deployment: DEPLOYMENT_TARGET,
      services: {
        database: 'connected',
        pulsar_sse: 'active',
        baitcoin_daemon: baitHealth.online ? 'connected' : 'offline',
        baitcoin_latency_ms: baitHealth.latencyMs,
        bait_sdk: baitHealth.online ? 'v2-live' : 'v2-fallback-simulated',
        sandbox: 'active',
        reputation_engine: 'active',
        error_resolver: 'active',
        agent_metrics: 'active',
        api_discovery: 'active',
      },
      baitcoin: baitHealth.online ? {
        block_height: baitHealth.status?.block_height,
        agents_count: baitHealth.status?.agents_count,
        transactions_count: baitHealth.status?.transactions_count,
        network: baitHealth.status?.network,
      } : { status: 'offline', note: 'AI Store operates in simulated wallet mode' },
      counts: {
        products: productCount,
        agents: agentCount,
        transactions: txCount,
      },
    }, {
      cache: 'no-cache',
      endpoint: '/api/health',
      method: 'GET',
    })
  } catch (error) {
    logger.error('health_check_failed', { latency_ms: Date.now() - start, error: String(error) })
    return NextResponse.json(
      { status: 'error', error: 'Database connection failed', latency_ms: Date.now() - start },
      { status: 503 }
    )
  }
}
