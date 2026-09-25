/**
 * GET /api/sdk-manifest — Compatibility alias for /api/version
 *
 * Created 2026-09-25: legacy SDK auto-discovery referenced /api/sdk-manifest
 * which returned 404. The canonical endpoint is /api/version. This wrapper
 * adds the SDK's expected `endpoints` index so old SDK clients can boot
 * without code changes.
 *
 * See scripts/mcp/API_HEALTH_AUDIT_2026-09-25.md.
 */

import { NextResponse } from 'next/server'

const ENDPOINTS_INDEX = {
  health: '/api/health',
  products: '/api/products',
  products_compact: '/api/products/compact',
  mcp: '/api/mcp',
  mcp_catalog: '/api/mcp/catalog',
  mcp_health: '/api/mcp/health',
  pulsar: '/api/pulsar',
  stats: '/api/stats',
  version: '/api/version',
  agents: '/api/agents',
  reputation: '/api/reputation',
  discovery: '/api/discovery',
  transactions: '/api/transactions',
  upload: '/api/upload-aipkg',
}

export async function GET() {
  return NextResponse.json({
    name: 'AI Store Nexus AI-OS',
    apiVersion: '2.0.0',
    a2aProtocol: 'A2A-RPC/v1',
    endpoints: ENDPOINTS_INDEX,
    note: 'Compatibility wrapper. Canonical source: /api/version',
  })
}