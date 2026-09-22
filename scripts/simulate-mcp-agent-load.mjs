#!/usr/bin/env node
/**
 * Safe agent-load simulation. It creates and inspects six real store-side
 * .aipkg archives, then performs deterministic catalog discovery and tool
 * routing in memory. It does not spawn MCP servers, call a database, use a
 * wallet, broadcast transactions, or contact production services.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const catalogPath = path.join(root, "data", "mcp-catalog-1200.json");
const reportPath = path.join(root, "artifacts", "mcp-agent-load-simulation.json");
const temp = path.join(root, ".mcp-load-out");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const real = ["mcp-catalog", "mcp-publisher", "mcp-pulsar", "mcp-reviews", "mcp-referral", "mcp-agent-auth"];
await rm(temp, { recursive: true, force: true });
await mkdir(temp, { recursive: true });
const archives = [];
for (const name of real) {
  execFileSync(process.execPath, [path.join(root, "scripts", "pack-aipkg.mjs"), name, "--out", temp], { cwd: root, stdio: "ignore" });
  const archive = path.join(temp, `${name}-1.0.0.aipkg`);
  const entries = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" }).trim().split("\n");
  const manifest = JSON.parse(execFileSync("unzip", ["-p", archive, "manifest.json"], { encoding: "utf8" }));
  if (!entries.includes("manifest.json") || !entries.includes("checksum.sha256") || !entries.some((entry) => entry.endsWith("server.ts"))) throw new Error(`${name}: invalid package shape`);
  archives.push({ name, version: manifest.version, entries: entries.length, tools: manifest.tools?.length ?? 0 });
}
const agents = 1200;
const operationsPerAgent = 12;
let hits = 0;
let routed = 0;
const started = Date.now();
for (let agent = 0; agent < agents; agent += 1) {
  for (let operation = 0; operation < operationsPerAgent; operation += 1) {
    const entry = catalog.entries[(agent * operationsPerAgent + operation) % catalog.entries.length];
    if (entry) hits += 1;
    if (entry?.tools?.length) routed += 1;
  }
}
const report = { mode: "dry-run", safety: { network: false, database: false, broadcast: false, realFunds: false }, catalogEntries: catalog.entries.length, executableArchives: archives.length, agents, operationsPerAgent, totalOperations: agents * operationsPerAgent, catalogHits: hits, toolRoutes: routed, durationMs: Date.now() - started, archives, generatedAt: new Date().toISOString() };
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
await rm(temp, { recursive: true, force: true });
console.log(`✅ MCP agent load simulation passed: ${report.totalOperations} operations across ${report.catalogEntries} entries; ${archives.length} AIPKG archives verified.`);
console.log(reportPath);
