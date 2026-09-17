/**
 * MCP API: Health Check
 * GET /api/mcp/health
 */

import { NextResponse } from 'next/server'
import { getRuntimeHealth } from '../../lib/mcp/runtime'

export async function GET() {
  try {
    const health = getRuntimeHealth()
    return NextResponse.json(health)
  } catch (err) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
