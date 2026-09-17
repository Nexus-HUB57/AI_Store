#!/usr/bin/env node
/** Generate the AI Store's 1,200-entry MCP catalog.
 * The first entries are the 17 canonical MCP packages; remaining entries are
 * catalog-only listings with explicit executionMode metadata. No executable
 * server is fabricated and no database/network action occurs in this command.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "data", "mcp-catalog-1200.json");
const target = 1200;
const categories = ["catalog", "publisher", "pulsar", "reviews", "referral", "agent-auth", "oracle", "defi", "bridge", "telemetry", "rag-upgrader", "self-heal"];
const templates = ["semantic-search", "workflow-router", "policy-checker", "schema-mapper", "agent-observer", "context-indexer", "quality-evaluator", "data-normalizer", "task-planner", "retrieval-ranker"];
const canonical = [
  ["mcp-catalog", "catalog"], ["mcp-publisher", "publisher"], ["mcp-pulsar", "pulsar"],
  ["mcp-reviews", "reviews"], ["mcp-referral", "referral"], ["mcp-agent-auth", "agent-auth"],
  ["mcp-oracle", "oracle"], ["mcp-defi", "defi"], ["mcp-bridge", "bridge"],
  ["mcp-faucet", "faucet"], ["mcp-agent-registry", "agent-registry"], ["mcp-marketplace", "marketplace"],
  ["mcp-telemetry", "telemetry"], ["mcp-rag-upgrader", "rag-upgrader"], ["mcp-skill-evolver", "skill-evolver"],
  ["mcp-self-heal", "self-heal"], ["mcp-agentic-awareness", "agentic-awareness"],
];

const manifestEntries = [];
for (const [name, category] of canonical) {
  const local = name === "mcp-agent-auth" ? "agent_auth" : name.replace(/^mcp-/, "");
  const file = path.join(root, "mcp", "src", "servers", local, "manifest.json");
  try {
    const manifest = JSON.parse(await readFile(file, "utf8"));
    manifestEntries.push({
      name: manifest.name, version: manifest.version, displayName: manifest.displayName,
      description: manifest.description, category: manifest.category, tags: manifest.tags ?? [],
      authorAgent: manifest.author?.agentId ?? "@nexus-genesis", executionMode: "executable",
      packagePath: `mcp/src/servers/${local}`, source: "canonical",
      tools: (manifest.tools ?? []).map((tool) => tool.name), pricingModel: manifest.pricing?.model ?? "free",
    });
  } catch {
    manifestEntries.push({ name, version: "1.0.0", displayName: name, description: `Canonical ${category} MCP`, category, tags: [category], authorAgent: "@baitcoin-core", executionMode: "declared", source: "canonical", tools: [] });
  }
}

const catalog = [...manifestEntries];
for (let index = catalog.length; index < target; index += 1) {
  const n = index + 1;
  const category = categories[index % categories.length];
  const template = templates[index % templates.length];
  const name = `mcp-${category}-${template}-${String(n).padStart(4, "0")}`;
  catalog.push({
    name, version: "1.0.0", displayName: `MCP ${category} ${template} ${String(n).padStart(4, "0")}`,
    description: `Catalog listing for an agent ${template} capability in the ${category} segment.`,
    category, tags: ["catalog-only", category, template], authorAgent: "@nexus-catalog",
    executionMode: "catalog-only", packagePath: null, source: "synthetic-catalog",
    tools: [`${template.replaceAll("-", "_")}`], pricingModel: index % 3 === 0 ? "free" : "per-call",
    priceSats: index % 3 === 0 ? 0 : 100 + (index % 10) * 25,
  });
}

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ schema: "ai-store-mcp-catalog/v1", generatedAt: "deterministic", target, executablePackages: manifestEntries.length, catalogOnlyListings: target - manifestEntries.length, entries: catalog }, null, 2)}\n`);
console.log(`Generated ${catalog.length} MCP catalog entries: ${manifestEntries.length} executable/canonical and ${target - manifestEntries.length} catalog-only.`);
console.log(output);
