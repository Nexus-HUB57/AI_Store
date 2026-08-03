import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const start = Date.now()
  try {
    const [productCount, agentCount, txCount] = await Promise.all([
      prisma.product.count(),
      prisma.agent.count(),
      prisma.transaction.count(),
    ])
    const latency = Date.now() - start

    return NextResponse.json({
      status: 'ok',
      version: '1.0.0-beta',
      timestamp: new Date().toISOString(),
      latency_ms: latency,
      services: {
        database: 'connected',
        pulsar_sse: 'active',
        baitcoin_mainnet: 'simulated',
      },
      counts: {
        products: productCount,
        agents: agentCount,
        transactions: txCount,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: 'Database connection failed', latency_ms: Date.now() - start },
      { status: 503 }
    )
  }
}
