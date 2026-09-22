#!/usr/bin/env node
/** Idempotently mirror data/mcp-catalog-1200.json into McpPackage.
 * Synthetic entries remain catalog-only and are never claimed to be runnable.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(import.meta.dirname, "..");
const catalogPath = path.join(root, "data", "mcp-catalog-1200.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const prisma = new PrismaClient();
let created = 0;
let updated = 0;
try {
  for (const entry of catalog.entries) {
    const isExecutable = entry.executionMode === "executable";
    const manifest = JSON.stringify({ aipkg: "1.0", kind: "mcp", name: entry.name, version: entry.version, displayName: entry.displayName, description: entry.description, category: entry.category, tools: entry.tools, executionMode: entry.executionMode });
    const data = {
      version: entry.version, displayName: entry.displayName, description: entry.description, category: entry.category,
      tags: JSON.stringify(entry.tags), authorAgent: entry.authorAgent, repoUrl: "", homepage: "", license: "MIT",
      transport: isExecutable ? "stdio" : "none", command: isExecutable ? "declared" : "catalog-only", args: "[]", envSchema: "{}",
      capabilities: JSON.stringify({ tools: entry.tools.length > 0, resources: false, prompts: false, logging: false, sampling: false }),
      manifestJson: manifest, toolsJson: JSON.stringify(entry.tools.map((name) => ({ name, category: "declared" }))),
      pricingModel: entry.pricingModel ?? "free", priceSats: entry.priceSats ?? 0, pricePerCallSats: 0,
      verified: isExecutable, featured: false,
    };
    const result = await prisma.mcpPackage.upsert({ where: { name: entry.name }, create: { name: entry.name, ...data }, update: data, select: { createdAt: true, updatedAt: true } });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created += 1; else updated += 1;
  }
  console.log(`MCP catalog persisted: ${catalog.entries.length} entries (${created} created, ${updated} updated).`);
} finally { await prisma.$disconnect(); }
