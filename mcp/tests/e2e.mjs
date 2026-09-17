#!/usr/bin/env node
/**
 * End-to-end test for the MCP stack.
 *
 *   1. Spawns mcp-catalog via stdio
 *   2. Initializes (initialize → notifications/initialized)
 *   3. Lists tools
 *   4. Calls search_products
 *   5. Calls list_categories
 *   6. Calls recommend_for_agent
 *   7. Validates resource read
 *
 * Pass criterion: all 5 calls return ok=true.
 *
 * Usage:
 *   bun run mcp/tests/e2e.mjs
 */

import { McpClient } from "../src/lib/mcp/client.ts";
import { AipkgMcpManifest } from "../src/lib/mcp/types.ts";

const manifest: AipkgMcpManifest = {
  aipkg: "1.0",
  kind: "mcp",
  name: "mcp-catalog",
  version: "1.0.0",
  displayName: "Catalog Canary",
  description: "End-to-end MCP for the AI Store catalog",
  author: { agentId: "@nexus-genesis", verified: true },
  category: "catalog",
  mcp: {
    transport: "stdio",
    command: "bun",
    args: ["run", "src/servers/catalog/server.ts"],
    capabilities: { tools: true, resources: true, prompts: false, logging: true, sampling: false },
    minProtocolVersion: "2024-11-05",
  },
  pricing: { model: "free" },
};

async function main() {
  const client = new McpClient({
    command: manifest.mcp.command,
    args: manifest.mcp.args,
    clientInfo: { name: "e2e-test", version: "1.0.0" },
  });

  console.log("▶ spawning mcp-catalog...");
  await client.start();
  console.log(`  ✓ initialized: ${client.info?.name} v${client.info?.version}`);
  console.log(`  ✓ caps: ${JSON.stringify(client.caps)}`);

  console.log("▶ tools/list...");
  const tools = await client.listTools();
  console.log(`  ✓ ${tools.length} tools:`, tools.map(t => t.name).join(", "));

  if (!tools.find(t => t.name === "search_products")) throw new Error("missing tool");

  console.log("▶ tools/call search_products...");
  const r1 = await client.callTool("search_products", { limit: 5, segmento: "Agent Apps" });
  console.log(`  ✓ result isError=${r1.isError} contentLen=${JSON.stringify(r1.content).length}`);
  if (r1.isError) throw new Error("search_products failed");

  console.log("▶ tools/call list_categories...");
  const r2 = await client.callTool("list_categories", {});
  if (r2.isError) throw new Error("list_categories failed");
  console.log("  ✓ categories listed");

  console.log("▶ tools/call recommend_for_agent...");
  const r3 = await client.callTool("recommend_for_agent", {
    capabilities: ["ML_INFERENCE", "DEFI_TRADING"],
    role: "buyer",
    limit: 3,
  });
  if (r3.isError) throw new Error("recommend_for_agent failed");
  console.log("  ✓ recommended");

  console.log("▶ resources/read catalog://stats...");
  const r4 = await client.readResource("catalog://stats");
  if (!r4.contents[0]) throw new Error("resource read empty");
  console.log("  ✓ stats resource read");

  await client.stop();
  console.log("\n✅ END-TO-END OK — MCP pipeline working.");
}

main().catch((e) => {
  console.error("❌ E2E FAILED:", e);
  process.exit(1);
});