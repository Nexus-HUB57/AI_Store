/**
 * Singleton orchestrator wired into the Next.js process.
 *
 * Production: backed by PrismaMcpRegistry (loads McpPackage rows as manifests)
 * Dev:        backed by JsonFileMcpRegistry (./data/mcp-registry.json)
 */

import { PrismaClient } from "@prisma/client";
import { McpOrchestrator } from "./orchestrator";
import { JsonFileMcpRegistry } from "./registry";

let singleton: McpOrchestrator | null = null;

export function getOrchestrator(): McpOrchestrator {
  if (singleton) return singleton;

  const registry = new JsonFileMcpRegistry();

  singleton = new McpOrchestrator(registry, {
    telemetryLogPath: process.env.MCP_TELEMETRY_LOG ?? "./logs/mcp-telemetry.jsonl",
    pulsarUrl: process.env.PULSAR_URL,
    ragInbox: process.env.RAG_INBOX,
    maxConcurrentCalls: 32,
  });

  return singleton;
}

/**
 * Hydrate orchestrator with all enabled McpPackages from Prisma.
 * Call this once during Next.js startup or on first request.
 */
export async function hydrateFromPrisma(prisma: PrismaClient): Promise<number> {
  const orch = getOrchestrator();
  const pkgs = await prisma.mcpPackage.findMany();
  let n = 0;
  for (const p of pkgs) {
    try {
      const manifest = JSON.parse(p.manifestJson);
      await orch.install(manifest);
      n++;
    } catch (e: any) {
      // ignore single MCP failure, continue
    }
  }
  return n;
}