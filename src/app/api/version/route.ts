import { NextResponse } from 'next/server'
import { agentResponse } from '@/lib/agent-response'
import { APP_VERSION, APP_NAME, DEPLOYMENT_TARGET, PROTOCOL_VERSION, BAIT_SDK_VERSION } from '@/lib/version'

export const dynamic = 'force-dynamic'

export async function GET() {
  return agentResponse({
    name: APP_NAME,
    version: APP_VERSION,
    deployment: DEPLOYMENT_TARGET,
    bait_sdk: BAIT_SDK_VERSION,
    protocol: PROTOCOL_VERSION,
    node: process.version,
    platform: process.platform,
    uptime_s: Math.floor(process.uptime()),
    build_time: process.env.BUILD_TIME || new Date().toISOString(),
  }, {
    cache: 'no-cache',
    endpoint: '/api/version',
    method: 'GET',
  })
}