#!/usr/bin/env node
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { McpOrchestrator } from "../src/lib/mcp/orchestrator.ts";
import { JsonFileMcpRegistry } from "../src/lib/mcp/registry.ts";
import { inspectAipkg } from "../src/lib/mcp/aipkg.ts";

process.env.DATABASE_URL ??= "file:./db/custom.db";

const root = process.cwd();
const servers = [
  ["catalog", "mcp-catalog", "list_categories", {}],
  ["publisher", "mcp-publisher", "listing_health", { slug: "integration-fixture-not-found" }, true],
  ["pulsar", "mcp-pulsar", "current_snapshot", {}],
  ["reviews", "mcp-reviews", "rating_summary", { slug: "integration-fixture-not-found" }, true],
  ["referral", "mcp-referral", "leaderboard", {}],
  ["agent_auth", "mcp-agent-auth", "reputation", { agentAddress: "integration-fixture-not-found" }, true],
];

const temp = await mkdtemp(path.join(tmpdir(), "ai-store-mcp-runtime-"));
const pulsarServer = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ status: "ok", source: "integration-fixture", timestamp: "deterministic" }));
});
await new Promise((resolve) => pulsarServer.listen(0, "127.0.0.1", resolve));
const pulsarAddress = pulsarServer.address();
process.env.PULSAR_URL = `http://127.0.0.1:${pulsarAddress.port}`;
const registry = new JsonFileMcpRegistry(path.join(temp, "registry.json"));
const orchestrator = new McpOrchestrator(registry, { telemetryLogPath: path.join(temp, "telemetry.jsonl") });
const results = [];

try {
  for (const [directory, name, tool, args, expectedError = false] of servers) {
    const manifestPath = path.join(root, "mcp", "src", "servers", directory, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const artifact = path.join(root, "packages", "mcp-1200", `${name}-1.0.0.aipkg`);
    const inspected = inspectAipkg(artifact);
    if (inspected.manifest.package_id !== name) throw new Error(`${name}: archive manifest mismatch`);
    manifest.mcp.command = "node_modules/.bin/tsx";
    manifest.mcp.args = [path.join("mcp", "src", "servers", directory, "server.ts")];
    await orchestrator.install(manifest);
    const tools = await orchestrator.listTools(name);
    if (!tools.some((item) => item.name === tool)) throw new Error(`${name}: missing integration tool ${tool}`);
    const response = await orchestrator.callTool(name, tool, args, { callerAgent: "@integration-test" });
    if (response?.isError && !expectedError) throw new Error(`${name}: tool returned isError`);
    if (expectedError && !response?.isError) throw new Error(`${name}: expected functional error response`);
    results.push({ name, tool, discoveredTools: tools.length, ok: true, expectedError });
  }
  console.log(JSON.stringify({ ok: true, packages: results }, null, 2));
} finally {
  await orchestrator.shutdownAll();
  pulsarServer.close();
}
