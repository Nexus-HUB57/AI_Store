import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET() {
  const start = Date.now()
  try {
    const [productCount, agentCount, txCount] = await Promise.all([
      db.product.count(),
      db.agent.count(),
      db.transaction.count(),
    ])
    const latency = Date.now() - start

    logger.info('health_check', { latency_ms: latency, products: productCount, agents: agentCount })

    return NextResponse.json({
      status: 'ok',
      version: '0.7.0-alpha',
      timestamp: new Date().toISOString(),
      latency_ms: latency,
      uptime_s: process.uptime(),
      services: {
        database: 'connected',
        pulsar_sse: 'active',
        baitcoin_mainnet: 'simulated',
        bait_sdk: 'v1-simulated',
        sandbox: 'active',
        reputation_engine: 'active',
        error_resolver: 'active',
        agent_metrics: 'active',
        api_discovery: 'active',
      },
      counts: {
        products: productCount,
        agents: agentCount,
        transactions: txCount,
      },
    })
  } catch (error) {
    logger.error('health_check_failed', { latency_ms: Date.now() - start, error: String(error) })
    return NextResponse.json(
      { status: 'error', error: 'Database connection failed', latency_ms: Date.now() - start },
      { status: 503 }
    )
  }
}
