import { NextResponse } from 'next/server'

const VERSION_INFO = {
  version: '0.3.0-beta',
  name: 'AI Store Nexus AI-OS',
  commit: process.env.GITHUB_SHA?.slice(0, 8) || 'dev',
  node: process.version,
  next: '16.x',
  bait_sdk: 'v1-simulated',
  baitcoin_network: 'bAI-mainnet',
  protocol: 'A2A-RPC/v1',
  build_time: new Date().toISOString(),
}

export async function GET() {
  return NextResponse.json(VERSION_INFO, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}
