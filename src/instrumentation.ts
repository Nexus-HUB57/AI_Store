/**
 * Next.js instrumentation — runs once on server startup.
 *
 * Hydrates the McpOrchestrator with all `McpPackage` rows from Prisma so that
 * any agent install / tools/call request handled by /api/mcp has a warm pool
 * of MCP subprocesses ready to answer.
 *
 * Enable in next.config.ts:
 *   experimental: { instrumentationHook: true }
 *
 * Reference: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { PrismaClient } from "@prisma/client";

export async function register() {
  // Only run in the Node.js runtime (skip Edge / browser bundles).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    // Dynamic import so that the mcp runtime (which references Prisma + zod)
    // is only loaded on the server and never bundled into the client.
    const { hydrateFromPrisma } = await import("../mcp/src/lib/mcp/runtime");
    const prisma = new PrismaClient();
    const n = await hydrateFromPrisma(prisma);
    // eslint-disable-next-line no-console
    console.log(`[instrumentation] MCP orchestrator hydrated with ${n} packages`);
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error("[instrumentation] MCP hydration failed:", e?.message ?? e);
  }
}