/**
 * GET /api/mcp/[name]/tools   — list discovered tools
 * POST /api/mcp/[name]/tools  — register a discovered tool (called by orchestrator)
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(_req: NextRequest, { params }: { params: { name: string } }) {
  const pkg = await prisma.mcpPackage.findUnique({
    where: { name: params.name },
    include: { tools: { orderBy: { callCount: "desc" } } },
  });
  if (!pkg) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ tools: pkg.tools });
}

export async function POST(req: NextRequest, { params }: { params: { name: string } }) {
  const body = await req.json();
  const pkg = await prisma.mcpPackage.findUnique({ where: { name: params.name } });
  if (!pkg) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const tool = await prisma.mcpTool.upsert({
    where: { packageId_name: { packageId: pkg.id, name: body.name } },
    create: {
      packageId: pkg.id,
      name: body.name,
      description: body.description ?? "",
      category: body.category ?? "",
      inputSchema: JSON.stringify(body.inputSchema ?? {}),
    },
    update: {
      description: body.description ?? "",
      category: body.category ?? "",
      inputSchema: JSON.stringify(body.inputSchema ?? {}),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, tool });
}