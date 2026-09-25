/**
 * GET /api/mcp                 — list MCP packages (with optional filters)
 * POST /api/mcp                — install an MCP from a manifest
 *
 * Refactored 2026-09-25 to use the @/lib/db singleton instead of a local
 * PrismaClient. The local instance failed to resolve DATABASE_URL in the
 * Next.js standalone build, while the root src/app/api/mcp/route.ts (which
 * uses @/lib/db) works correctly. See scripts/mcp/API_HEALTH_AUDIT_2026-09-25.md.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const featured = url.searchParams.get("featured") === "1";
    const search = url.searchParams.get("q");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (featured) where.featured = true;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { displayName: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const items = await db.mcpPackage.findMany({
      where,
      orderBy: [{ verified: "desc" }, { featured: "desc" }, { pulsarEnergy: "desc" }],
      take: limit,
    });

    return NextResponse.json({ total: items.length, items });
  } catch (error) {
    console.error("[/api/mcp GET]", error);
    return NextResponse.json({ error: "Failed to list MCPs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const manifest = body.manifest ?? body;

    if (!manifest?.name || !manifest?.version || !manifest?.mcp?.command) {
      return NextResponse.json({ error: "invalid_manifest", required: ["name", "version", "mcp.command"] }, { status: 400 });
    }

    const pkg = await db.mcpPackage.upsert({
      where: { name: manifest.name },
      create: {
        name: manifest.name,
        version: manifest.version,
        displayName: manifest.displayName ?? manifest.name,
        description: manifest.description ?? "",
        category: manifest.category ?? "agentic-awareness",
        tags: JSON.stringify(manifest.tags ?? []),
        iconEmoji: manifest.iconEmoji ?? "🧩",
        authorAgent: manifest.author?.agentId ?? "@unknown",
        repoUrl: manifest.repository ?? "",
        homepage: manifest.homepage ?? "",
        license: manifest.license ?? "MIT",
        transport: manifest.mcp?.transport ?? "stdio",
        command: manifest.mcp?.command,
        args: JSON.stringify(manifest.mcp?.args ?? []),
        envSchema: JSON.stringify(manifest.mcp?.env ?? {}),
        capabilities: JSON.stringify(manifest.mcp?.capabilities ?? {}),
        manifestJson: JSON.stringify(manifest),
        toolsJson: JSON.stringify(manifest.tools ?? []),
        pricingModel: manifest.pricing?.model ?? "free",
        priceSats: manifest.pricing?.priceSats ?? 0,
        pricePerCallSats: manifest.pricing?.pricePerCallSats ?? 0,
        verified: manifest.author?.verified ?? false,
        featured: manifest.featured ?? false,
      },
      update: {
        version: manifest.version,
        description: manifest.description ?? "",
        category: manifest.category ?? "agentic-awareness",
        manifestJson: JSON.stringify(manifest),
        toolsJson: JSON.stringify(manifest.tools ?? []),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, id: pkg.id, name: pkg.name, version: pkg.version });
  } catch (error) {
    console.error("[/api/mcp POST]", error);
    return NextResponse.json({ error: "Failed to install MCP" }, { status: 500 });
  }
}