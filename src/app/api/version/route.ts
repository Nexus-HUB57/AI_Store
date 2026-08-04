import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    name: 'AI Store Nexus AI-OS',
    version: '0.8.0-alpha',
    deployment: 'hostgator-cgi',
    bait_sdk: 'v2-hybrid',
    protocol: 'A2A-RPC/v1',
    node: process.version,
    platform: process.platform,
    uptime_s: Math.floor(process.uptime()),
    build_time: process.env.BUILD_TIME || new Date().toISOString(),
  })
}