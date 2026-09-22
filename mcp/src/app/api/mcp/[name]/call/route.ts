/**
 * POST /api/mcp/[name]/call
 *
 * Body: { tool: string, arguments?: Record<string, unknown>, callerAgent?: string }
 *
 * Routes a tool call through the live orchestrator. If the MCP isn't spawned
 * yet, the orchestrator boots it from the persisted manifest.
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getOrchestrator } from "@/lib/mcp/runtime";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: { name: string } },
) {
  const body = await req.json();
  const { tool, arguments: args = {}, callerAgent } = body;

  if (!tool) {
    return NextResponse.json({ error: "missing_tool" }, { status: 400 });
  }

  const pkg = await prisma.mcpPackage.findUnique({ where: { name: params.name } });
  if (!pkg) {
    return NextResponse.json({ error: "not_found", name: params.name }, { status: 404 });
  }

  const orch = getOrchestrator();
  try {
    const result = await orch.callTool(pkg.name, tool, args, { callerAgent });
    return NextResponse.json({ ok: true, tool, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, tool, error: e.message ?? String(e) }, { status: 502 });
  }
}