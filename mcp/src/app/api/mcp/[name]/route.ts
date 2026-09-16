/**
 * GET    /api/mcp/[name]      — full package detail
 * DELETE /api/mcp/[name]      — uninstall
 * PATCH  /api/mcp/[name]      — toggle enabled / update
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getOrchestrator } from "@/lib/mcp/runtime";

const prisma = new PrismaClient();

export async function GET(_req: NextRequest, { params }: { params: { name: string } }) {
  const pkg = await prisma.mcpPackage.findUnique({
    where: { name: params.name },
    include: {
      tools: { orderBy: { callCount: "desc" } },
      _count: { select: { installs: true, calls: true, ragSignals: true } },
    },
  });
  if (!pkg) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const orch = getOrchestrator();
  const running = orch.listRunning().find((r) => r.name === params.name);

  return NextResponse.json({
    ...pkg,
    tags: JSON.parse(pkg.tags),
    args: JSON.parse(pkg.args),
    envSchema: JSON.parse(pkg.envSchema),
    capabilities: JSON.parse(pkg.capabilities),
    manifest: JSON.parse(pkg.manifestJson),
    runtime: running ?? null,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { name: string } }) {
  const orch = getOrchestrator();
  await orch.uninstall(params.name);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { name: string } }) {
  const body = await req.json();
  const pkg = await prisma.mcpPackage.update({
    where: { name: params.name },
    data: {
      enabled: body.enabled ?? undefined,
      featured: body.featured ?? undefined,
      verified: body.verified ?? undefined,
    },
  });
  return NextResponse.json({ ok: true, pkg: { id: pkg.id, name: pkg.name } });
}