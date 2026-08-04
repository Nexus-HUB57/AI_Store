import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET() {
  logger.info('sandbox:status polled')

  return NextResponse.json({
    sandbox: {
      status: 'active',
      runtime: 'wasm-v0.1.0-simulated',
      max_trials_per_agent: 10,
      max_trials_per_hour: 30,
      supported_formats: ['text', 'json', 'code'],
      isolation_level: 'process',
      average_trial_latency_ms: 38,
      total_trials_today: 0,
      success_rate: 0.0,
    },
  })
}
