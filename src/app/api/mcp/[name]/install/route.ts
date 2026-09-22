/**
 * POST   /api/mcp/[name]/install    — agent acquires an MCP (creates McpInstall + spawns server)
 * DELETE /api/mcp/[name]/install    — agent releases an MCP (removes McpInstall)
 *
 * Wire format:
 *   POST { agentId?: string, envOverrides?: Record<string,string> }
 *   → { ok: true, installId, spawned: bool }
 *
 *   DELETE { agentId?: string }
 *   → { ok: true }
 *
 * Notes:
 *  - When `agentId` is null the install is system-wide (McpInstall.agentId = null).
 *  - The orchestrator keeps the MCP subprocess alive; self-heal restarts it on
 *    consecutive failures.
 *  - Idempotent: re-installing an already-installed MCP just refreshes enabled=true
 *    and bumps the spawn. Safe to call from the UI on every page load.
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getOrchestrator } from "@/lib/mcp/runtime";

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  const agentId: string | null = body?.agentId ?? null;
  const envOverrides: Record<string, string> = body?.envOverrides ?? {};

  const pkg = await prisma.mcpPackage.findUnique({ where: { name } });
  if (!pkg) {
    return NextResponse.json({ error: "not_found", name }, { status: 404 });
  }

  // Ensure McpInstall record (upsert by packageId+agentId)
  const install = await prisma.mcpInstall.upsert({
    where: { packageId_agentId: { packageId: pkg.id, agentId: agentId ?? null as any } },
    create: {
      packageId: pkg.id,
      agentId,
      version: pkg.version,
      enabled: true,
      envOverrides: JSON.stringify(envOverrides),
    },
    update: {
      enabled: true,
      version: pkg.version,
      envOverrides: JSON.stringify(envOverrides),
      updatedAt: new Date(),
    },
  });

  // Spawn the MCP via orchestrator (idempotent)
  let spawned = true;
  let spawnError: string | undefined;
  try {
    const orch = getOrchestrator();
    const manifest = JSON.parse(pkg.manifestJson);
    if (!orch.listRunning().some((r) => r.name === name)) {
      await orch.install(manifest);
    }
  } catch (e: any) {
    spawned = false;
    spawnError = e?.message ?? String(e);
  }

  // Bump download counter (best-effort, fire-and-forget)
  prisma.mcpPackage.update({
    where: { id: pkg.id },
    data: { downloads: { increment: 1 } },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    installId: install.id,
    spawned,
    spawnError,
    name: pkg.name,
    version: pkg.version,
    ts: Date.now(),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  let body: any = {};
  try { body = await req.json(); } catch { /* ok */ }
  const agentId: string | null = body?.agentId ?? null;

  const pkg = await prisma.mcpPackage.findUnique({ where: { name } });
  if (!pkg) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Remove the install row
  await prisma.mcpInstall.deleteMany({
    where: { packageId: pkg.id, agentId: agentId ?? null as any },
  });

  // If no other agent has this MCP installed, stop the subprocess
  const remaining = await prisma.mcpInstall.count({ where: { packageId: pkg.id, enabled: true } });
  if (remaining === 0) {
    try {
      const orch = getOrchestrator();
      await orch.stop(name);
    } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true, remainingInstalls: remaining });
}