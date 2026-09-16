/**
 * GET /api/mcp/health — orchestrator health snapshot
 *
 *   {
 *     running: McpHandleSummary[],
 *     uptimeMs: number,
 *     totalCalls: number,
 *     healthy: boolean
 *   }
 */

import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/mcp/runtime";

export async function GET() {
  const orch = getOrchestrator();
  const running = orch.listRunning();
  const healthy = running.every((r) => r.status === "ready");
  return NextResponse.json({
    running,
    count: running.length,
    uptimeMs: process.uptime() * 1000,
    healthy,
  });
}