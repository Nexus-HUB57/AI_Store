#!/usr/bin/env node
/**
 * generate-seed.mjs — Generates the seed JSON + SQL needed to populate the
 * AI Store's Prisma database with the entire b'AI'tcoin MCP portfolio.
 *
 * Reads:
 *   - dist/portfolio.json (from baitcoin/mcp)
 *
 * Produces:
 *   - scripts/mcp/seed/mcp_portfolio.json     (full JSON)
 *   - scripts/mcp/seed/populate.sql           (Prisma/SQLite INSERTs)
 *
 * Idempotent — uses `INSERT OR IGNORE` so it's safe to re-run.
 *
 * Usage:
 *   node scripts/mcp/generate-seed.mjs [--baitcoin-root ../b-AI-tcoin-AI-to-AI-]
 *
 * After generating:
 *   node scripts/mcp/install-portfolio.sh
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--baitcoin-root");
const baitcoinRoot = rootIdx >= 0 ? args[rootIdx + 1] : "../b-AI-tcoin-AI-to-AI-";

const portfolioPath = path.join(baitcoinRoot, "mcp", "dist", "portfolio.json");
const seedDir = path.join("scripts", "mcp", "seed");

console.log(`▶ reading ${portfolioPath}`);
const portfolio = JSON.parse(await readFile(portfolioPath, "utf-8"));

await mkdir(seedDir, { recursive: true });

// ────────────────────────── JSON seed ──────────────────────────
const seedJson = {
  generatedAt: new Date().toISOString(),
  source: "b'AI'tcoin MCP portfolio (Wave 1 + Wave 2)",
  totalServers: portfolio.count,
  publisher: portfolio.publisher,
  spec: "MCP 2024-11-05",
  packages: portfolio.servers.map((m) => ({
    name: m.name,
    version: m.version,
    displayName: m.displayName,
    description: m.description,
    category: m.category,
    tags: m.tags ?? [],
    iconEmoji: m.iconEmoji ?? "🧩",
    authorAgent: m.author?.agentId ?? "@nexus-genesis",
    repoUrl: m.repository ?? "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: m.homepage ?? "https://www.mybait.org/mcp",
    license: m.license ?? "MIT",
    transport: m.mcp?.transport ?? "stdio",
    command: m.mcp?.command,
    args: m.mcp?.args ?? [],
    envSchema: m.mcp?.env ?? {},
    capabilities: m.mcp?.capabilities ?? {},
    manifestJson: JSON.stringify(m),
    toolsJson: JSON.stringify(m.tools ?? []),
    pricingModel: m.pricing?.model ?? "free",
    priceSats: m.pricing?.priceSats ?? 0,
    pricePerCallSats: m.pricing?.pricePerCallSats ?? 0,
    verified: m.author?.verified ?? true,
    featured: ["oracle", "defi", "embeddings", "browser", "deploy"].includes(m.category),
    pulsarEnergy: 95.0,
    fitnessScore: 90.0,
  })),
  storeMcpServers: [
    // Also seed the 6 store-side MCPs (catalog, publisher, pulsar, reviews, referral, agent_auth)
    {
      name: "mcp-catalog",
      version: "1.0.0",
      displayName: "Nexus AI Store Catalog",
      description: "Search and browse the catalog of the Nexus AI-OS Store. Returns .aipkg packages, WASM skills, RAG packs, prompt harnesses, and synthetic infrastructure.",
      category: "catalog",
      tags: ["catalog", "search", "store", "faceted"],
      iconEmoji: "🔍",
      authorAgent: "@nexus-genesis",
      repoUrl: "https://github.com/Nexus-HUB57/AI_Store",
      homepage: "https://www.mybait.org/aistore/",
      license: "MIT",
      transport: "stdio",
      command: "bun run mcp/src/servers/catalog/server.ts",
      args: [],
      envSchema: {},
      capabilities: { tools: true, resources: true, prompts: false, logging: true, sampling: false },
      manifestJson: null,
      toolsJson: JSON.stringify([
        { name: "search_products", description: "Faceted search" },
        { name: "get_product", description: "Full product detail" },
        { name: "list_categories", description: "Distinct segments" },
        { name: "top_rated", description: "Top-rated products" },
        { name: "recommend_for_agent", description: "Agentic recommendation" },
      ]),
      pricingModel: "free",
      priceSats: 0,
      pricePerCallSats: 0,
      verified: true,
      featured: true,
      pulsarEnergy: 98.0,
      fitnessScore: 95.0,
    },
    {
      name: "mcp-publisher",
      version: "1.0.0",
      displayName: "AI Store Publisher",
      description: "Upload, version, and manage .aipkg listings in the AI Store.",
      category: "publisher",
      tags: ["publisher", "upload", "version"],
      iconEmoji: "🚀",
      authorAgent: "@nexus-genesis",
      repoUrl: "https://github.com/Nexus-HUB57/AI_Store",
      homepage: "https://www.mybait.org/aistore/",
      license: "MIT",
      transport: "stdio",
      command: "bun run mcp/src/servers/publisher/server.ts",
      args: [],
      envSchema: {},
      capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
      manifestJson: null,
      toolsJson: JSON.stringify([
        { name: "upload_aipkg", description: "Upload or update listing" },
        { name: "deprecate_listing", description: "Mark as deprecated" },
        { name: "bump_version", description: "Bump version" },
        { name: "listing_health", description: "Listing health metrics" },
      ]),
      pricingModel: "free",
      priceSats: 0,
      pricePerCallSats: 0,
      verified: true,
      featured: true,
      pulsarEnergy: 97.0,
      fitnessScore: 92.0,
    },
    {
      name: "mcp-pulsar",
      version: "1.0.0",
      displayName: "AI Store Pulsar",
      description: "Real-time SSE vital signs for the AI Store catalog (3s cadence).",
      category: "pulsar",
      tags: ["pulsar", "sse", "realtime", "telemetry"],
      iconEmoji: "⚡",
      authorAgent: "@nexus-genesis",
      repoUrl: "https://github.com/Nexus-HUB57/AI_Store",
      homepage: "https://www.mybait.org/aistore/",
      license: "MIT",
      transport: "stdio",
      command: "bun run mcp/src/servers/pulsar/server.ts",
      args: [],
      envSchema: {},
      capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
      manifestJson: null,
      toolsJson: JSON.stringify([
        { name: "current_snapshot", description: "Latest snapshot" },
        { name: "subscribe", description: "Subscribe to SSE feed" },
      ]),
      pricingModel: "free",
      priceSats: 0,
      pricePerCallSats: 0,
      verified: true,
      featured: false,
      pulsarEnergy: 96.0,
      fitnessScore: 88.0,
    },
    {
      name: "mcp-reviews",
      version: "1.0.0",
      displayName: "AI Store Reviews",
      description: "Read and post product reviews.",
      category: "reviews",
      tags: ["reviews", "ratings", "feedback"],
      iconEmoji: "⭐",
      authorAgent: "@nexus-genesis",
      repoUrl: "https://github.com/Nexus-HUB57/AI_Store",
      homepage: "https://www.mybait.org/aistore/",
      license: "MIT",
      transport: "stdio",
      command: "bun run mcp/src/servers/reviews/server.ts",
      args: [],
      envSchema: {},
      capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
      manifestJson: null,
      toolsJson: JSON.stringify([
        { name: "list_reviews", description: "List reviews for a product" },
        { name: "post_review", description: "Post a review" },
        { name: "mark_helpful", description: "Up-vote a review" },
        { name: "rating_summary", description: "Aggregate rating stats" },
      ]),
      pricingModel: "free",
      priceSats: 0,
      pricePerCallSats: 0,
      verified: true,
      featured: false,
      pulsarEnergy: 94.0,
      fitnessScore: 85.0,
    },
    {
      name: "mcp-referral",
      version: "1.0.0",
      displayName: "AI Store Referral",
      description: "Referral program and BAIT rewards.",
      category: "referral",
      tags: ["referral", "rewards", "bait"],
      iconEmoji: "🎁",
      authorAgent: "@nexus-genesis",
      repoUrl: "https://github.com/Nexus-HUB57/AI_Store",
      homepage: "https://www.mybait.org/aistore/",
      license: "MIT",
      transport: "stdio",
      command: "bun run mcp/src/servers/referral/server.ts",
      args: [],
      envSchema: {},
      capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
      manifestJson: null,
      toolsJson: JSON.stringify([
        { name: "lookup_by_code", description: "Lookup agent by code" },
        { name: "claim_reward", description: "Claim a referral reward" },
        { name: "pending_rewards", description: "List pending rewards" },
        { name: "register_referral", description: "Bind new agent" },
        { name: "leaderboard", description: "Top referrers" },
      ]),
      pricingModel: "free",
      priceSats: 0,
      pricePerCallSats: 0,
      verified: true,
      featured: false,
      pulsarEnergy: 92.0,
      fitnessScore: 84.0,
    },
    {
      name: "mcp-agent-auth",
      version: "1.0.0",
      displayName: "AI Store Agent Auth",
      description: "Sessions, identity, capability attestations.",
      category: "agent-auth",
      tags: ["auth", "sessions", "identity", "attestation"],
      iconEmoji: "🔐",
      authorAgent: "@nexus-genesis",
      repoUrl: "https://github.com/Nexus-HUB57/AI_Store",
      homepage: "https://www.mybait.org/aistore/",
      license: "MIT",
      transport: "stdio",
      command: "bun run mcp/src/servers/agent_auth/server.ts",
      args: [],
      envSchema: {},
      capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
      manifestJson: null,
      toolsJson: JSON.stringify([
        { name: "login", description: "Mint session token" },
        { name: "whoami", description: "Resolve token" },
        { name: "attest_capabilities", description: "Attach capability attestation" },
        { name: "logout", description: "Invalidate token" },
        { name: "reputation", description: "Public reputation lookup" },
      ]),
      pricingModel: "free",
      priceSats: 0,
      pricePerCallSats: 0,
      verified: true,
      featured: true,
      pulsarEnergy: 93.0,
      fitnessScore: 86.0,
    },
  ],
};

await writeFile(path.join(seedDir, "mcp_portfolio.json"), JSON.stringify(seedJson, null, 2));
console.log(`✓ wrote ${seedDir}/mcp_portfolio.json (${seedJson.totalServers} baitcoin + ${seedJson.storeMcpServers.length} store = ${seedJson.totalServers + seedJson.storeMcpServers.length} total)`);

// ────────────────────────── SQL seed ──────────────────────────
const escape = (s) => (s ?? "").replace(/'/g, "''");

// Build a complete .aipkg-compatible manifest from a seed row. This ensures
// every package — baitcoin-side or store-side — has a manifest with the same
// shape as a real `.aipkg` (including the `tools` array).
function buildFullManifest(p) {
  if (p.manifestJson) {
    try { return JSON.parse(p.manifestJson); } catch {}
  }
  const tools = (() => {
    try { return JSON.parse(p.toolsJson); } catch { return []; }
  })();
  return {
    aipkg: "1.0",
    kind: "mcp",
    name: p.name,
    version: p.version,
    displayName: p.displayName,
    description: p.description,
    author: { agentId: p.authorAgent, displayName: "Nexus Genesis", verified: !!p.verified },
    category: p.category,
    tags: p.tags ?? [],
    iconEmoji: p.iconEmoji,
    license: p.license,
    repository: p.repoUrl,
    homepage: p.homepage,
    mcp: {
      transport: p.transport,
      command: p.command,
      args: p.args ?? [],
      env: p.envSchema ?? {},
      capabilities: p.capabilities ?? {},
      minProtocolVersion: "2024-11-05",
    },
    runtime: { memoryMb: 256, cpuMillicores: 500, timeoutMs: 30000, sandbox: "process" },
    tools,
    pricing: { model: p.pricingModel, priceSats: p.priceSats, pricePerCallSats: p.pricePerCallSats },
    telemetry: { emitTo: "pulsar", includeCallPayload: false, sampleRate: 1.0 },
  };
}

let sql = "-- MCP Portfolio seed — generated by generate-seed.mjs\n";
sql += `-- Total: ${seedJson.totalServers + seedJson.storeMcpServers.length} MCPs\n`;
sql += `-- Generated: ${seedJson.generatedAt}\n\n`;

const allPackages = [...seedJson.packages, ...seedJson.storeMcpServers];
for (const p of allPackages) {
  const fullManifest = buildFullManifest(p);
  const manifestStr = JSON.stringify(fullManifest);

  sql += `INSERT OR IGNORE INTO McpPackage (\n`;
  sql += `  id, name, version, displayName, description, category, tags, iconEmoji,\n`;
  sql += `  authorAgent, repoUrl, homepage, license, transport, command, args,\n`;
  sql += `  envSchema, capabilities, manifestJson, toolsJson, pricingModel,\n`;
  sql += `  priceSats, pricePerCallSats, downloads, rating, pulsarEnergy,\n`;
  sql += `  fitnessScore, verified, featured, createdAt, updatedAt\n`;
  sql += `) VALUES (\n`;
  sql += `  '${escape(p.name)}', '${escape(p.name)}', '${escape(p.version)}',\n`;
  sql += `  '${escape(p.displayName)}', '${escape(p.description)}', '${escape(p.category)}',\n`;
  sql += `  '${escape(JSON.stringify(p.tags))}', '${escape(p.iconEmoji)}',\n`;
  sql += `  '${escape(p.authorAgent)}', '${escape(p.repoUrl)}', '${escape(p.homepage)}',\n`;
  sql += `  '${escape(p.license)}', '${escape(p.transport)}', '${escape(p.command)}',\n`;
  sql += `  '${escape(JSON.stringify(p.args))}', '${escape(JSON.stringify(p.envSchema))}',\n`;
  sql += `  '${escape(JSON.stringify(p.capabilities))}', '${escape(manifestStr)}',\n`;
  sql += `  '${escape(p.toolsJson)}', '${escape(p.pricingModel)}',\n`;
  sql += `  ${p.priceSats}, ${p.pricePerCallSats}, 0, 4.5, ${p.pulsarEnergy},\n`;
  sql += `  ${p.fitnessScore}, ${p.verified ? 1 : 0}, ${p.featured ? 1 : 0},\n`;
  sql += `  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP\n`;
  sql += `);\n\n`;

  // Also seed the discovered tools
  const tools = JSON.parse(p.toolsJson);
  for (const t of tools) {
    sql += `INSERT OR IGNORE INTO McpTool (\n`;
    sql += `  id, packageId, name, description, category, inputSchema, callCount,\n`;
    sql += `  okCount, errCount, avgDurationMs, discoveredAt, updatedAt\n`;
    sql += `) VALUES (\n`;
    sql += `  '${escape(p.name + "::" + t.name)}', '${escape(p.name)}',\n`;
    sql += `  '${escape(t.name)}', '${escape(t.description ?? "")}',\n`;
    sql += `  '${escape(t.category ?? "")}', '{}', 0, 0, 0, 0,\n`;
    sql += `  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;
  }
}

await writeFile(path.join(seedDir, "populate.sql"), sql);
console.log(`✓ wrote ${seedDir}/populate.sql (${allPackages.length} packages, ${allPackages.reduce((s, p) => s + JSON.parse(p.toolsJson).length, 0)} tools)`);

console.log("\n✅ done. Apply with:");
console.log("   npm run db:push && sqlite3 db/custom.db < scripts/mcp/seed/populate.sql");
console.log("   # or run:  bash scripts/mcp/install-portfolio.sh");