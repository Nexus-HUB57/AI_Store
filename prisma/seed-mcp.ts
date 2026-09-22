/**
 * MCP Catalog Seed — populates McpPackage with all 17 MCPs
 *
 * Sources:
 *   • b-AI-tcoin repo (`../../b-AI-tcoin/mcp/servers/<name>/manifest.json`)
 *     — 11 MCPs (oracle, defi, bridge, faucet, agent_registry, marketplace,
 *                agentic_awareness, telemetry, rag_upgrader, skill_evolver, self_heal)
 *
 *   • AI_Store repo (`mcp/src/servers/<name>/server.ts`)
 *     — 6 MCPs (catalog, publisher, pulsar, reviews, referral, agent_auth)
 *     — manifests generated on-the-fly from TS metadata (no JSON manifest on disk)
 *
 * Behavior:
 *   • Idempotent — upserts by `name`, only writes if McpPackage is empty
 *   • Non-destructive — never touches the existing `Product` table
 *   • Coexists with `prisma/seed.ts` (which only seeds Products)
 *
 * Run:
 *   npx tsx prisma/seed-mcp.ts
 *   # or:
 *   bun run prisma/seed-mcp.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const prisma = new PrismaClient();

// ----------------------------------------------------------------- Paths
// __dirname = .../AI_Store/prisma  →  REPO_ROOT = .../AI_Store
const REPO_ROOT = path.resolve(__dirname, "..");
// BAITCOIN_REPO = .../<parent>/b-AI-tcoin (sibling repo)
// We walk up until we find a sibling that ends in `b-AI-tcoin`. As a pragmatic
// default we expect both repos to live under a common parent (e.g. ~/repos).
const BAITCOIN_REPO = path.resolve(REPO_ROOT, "..", "b-AI-tcoin");
const BAITCOIN_MCP = path.join(BAITCOIN_REPO, "mcp", "servers");
const STORE_MCP = path.join(REPO_ROOT, "mcp", "src", "servers");

// ----------------------------------------------------------- Baitcoin MCPs
const BAITCOIN_MCP_NAMES = [
  "oracle", "defi", "bridge", "faucet", "agent_registry", "marketplace",
  "agentic_awareness", "telemetry", "rag_upgrader", "skill_evolver", "self_heal",
] as const;

// ----------------------------------------------------------- Store-side MCPs
const STORE_MCP_META: Record<string, {
  displayName: string;
  description: string;
  category: string;
  iconEmoji: string;
  tools: { name: string; description: string; category: string }[];
}> = {
  catalog: {
    displayName: "Nexus AI Store Catalog",
    description:
      "Search and browse the AI Store catalog of 1,500+ products. Returns .aipkg packages, WASM skills, RAG packs, prompt harnesses, and synthetic infrastructure.",
    category: "catalog",
    iconEmoji: "🔍",
    tools: [
      { name: "search_products", description: "Faceted search across the catalog", category: "search" },
      { name: "get_product", description: "Full product detail by slug", category: "search" },
      { name: "list_categories", description: "Distinct segments + counts", category: "meta" },
      { name: "top_rated", description: "Leaderboard by rating", category: "discovery" },
      { name: "recommend_for_agent", description: "Agentic recommendations", category: "discovery" },
    ],
  },
  publisher: {
    displayName: "AI Store Publisher",
    description: "Upload new .aipkg packages, deprecate listings, bump versions, monitor listing health.",
    category: "publisher",
    iconEmoji: "🚀",
    tools: [
      { name: "upload_aipkg", description: "Upload a new .aipkg package", category: "publish" },
      { name: "deprecate_listing", description: "Mark a listing as deprecated", category: "publish" },
      { name: "bump_version", description: "Increment package version", category: "publish" },
      { name: "listing_health", description: "Listing health metrics", category: "meta" },
    ],
  },
  pulsar: {
    displayName: "Pulsar Energy Stream",
    description: "Real-time SSE stream of ecosystem vital signs: Pulsar Energy, transactions, agent heartbeats, MCP call rates.",
    category: "pulsar",
    iconEmoji: "⚡",
    tools: [
      { name: "current_snapshot", description: "Latest vital signs snapshot", category: "stream" },
      { name: "subscribe", description: "Subscribe to live SSE stream", category: "stream" },
    ],
  },
  reviews: {
    displayName: "AI Store Reviews",
    description: "Read and post product reviews, mark helpful, get rating summaries.",
    category: "reviews",
    iconEmoji: "⭐",
    tools: [
      { name: "list_reviews", description: "Reviews for a product", category: "read" },
      { name: "post_review", description: "Submit a new review", category: "write" },
      { name: "mark_helpful", description: "Mark a review as helpful", category: "write" },
      { name: "rating_summary", description: "Aggregate rating summary", category: "read" },
    ],
  },
  referral: {
    displayName: "AI Store Referral Program",
    description: "Referral lookup, claim rewards in BAIT, leaderboard.",
    category: "referral",
    iconEmoji: "🎁",
    tools: [
      { name: "lookup_by_code", description: "Resolve a referral code", category: "lookup" },
      { name: "claim_reward", description: "Claim a pending referral reward", category: "reward" },
      { name: "pending_rewards", description: "List unclaimed rewards", category: "reward" },
      { name: "register_referral", description: "Register a new referral link", category: "register" },
      { name: "leaderboard", description: "Top referrers", category: "leaderboard" },
    ],
  },
  agent_auth: {
    displayName: "Agent Authentication",
    description: "Sessions, identity, capability attestations for AI agents.",
    category: "agent-auth",
    iconEmoji: "🔐",
    tools: [
      { name: "login", description: "Authenticate an agent", category: "auth" },
      { name: "whoami", description: "Current agent identity", category: "auth" },
      { name: "attest_capabilities", description: "Attest agent capabilities", category: "auth" },
      { name: "logout", description: "End the agent session", category: "auth" },
      { name: "reputation", description: "Get agent reputation score", category: "reputation" },
    ],
  },
};

// ----------------------------------------------------- Baitcoin manifest → McpPackage
function baitcoinPkgFields(name: string, manifest: any) {
  const mcp = manifest.mcp ?? {};
  return {
    name: manifest.name,
    version: manifest.version,
    displayName: manifest.displayName ?? manifest.name,
    description: manifest.description ?? "",
    category: manifest.category ?? "agentic-awareness",
    tags: JSON.stringify(manifest.tags ?? []),
    iconEmoji: manifest.iconEmoji ?? "🧩",
    authorAgent: manifest.author?.agentId ?? "@nexus-genesis",
    repoUrl: manifest.repository ?? "",
    homepage: manifest.homepage ?? "https://www.mybait.org/mcp",
    license: manifest.license ?? "MIT",
    transport: mcp.transport ?? "stdio",
    command: mcp.command ?? `python -m servers.${name}.server`,
    args: JSON.stringify(mcp.args ?? []),
    envSchema: JSON.stringify(mcp.env ?? {}),
    capabilities: JSON.stringify(mcp.capabilities ?? { tools: true, resources: false, prompts: false, logging: true, sampling: false }),
    manifestJson: JSON.stringify(manifest),
    toolsJson: JSON.stringify(manifest.tools ?? []),
    pricingModel: manifest.pricing?.model ?? "free",
    priceSats: manifest.pricing?.priceSats ?? 0,
    pricePerCallSats: manifest.pricing?.pricePerCallSats ?? 0,
    verified: manifest.author?.verified ?? true,
    featured: ["oracle", "defi", "bridge", "marketplace"].includes(name),
  };
}

// ----------------------------------------------------- Store MCP metadata → McpPackage
function storePkgFields(serverName: string) {
  const meta = STORE_MCP_META[serverName];
  const command = `bun run mcp/src/servers/${serverName}/server.ts`;
  const manifest = {
    aipkg: "1.0",
    kind: "mcp",
    name: `mcp-${serverName}`,
    version: "1.0.0",
    displayName: meta.displayName,
    description: meta.description,
    author: { agentId: "@nexus-genesis", displayName: "Nexus Genesis", verified: true },
    category: meta.category,
    tags: [serverName, "store-side", "ts"],
    iconEmoji: meta.iconEmoji,
    license: "MIT",
    repository: "https://github.com/Nexus-HUB57/AI_Store",
    homepage: "https://www.mybait.org/aistore/mcp",
    mcp: {
      transport: "stdio",
      command,
      args: [],
      env: {},
      capabilities: { tools: true, resources: true, prompts: false, logging: true, sampling: false },
      minProtocolVersion: "2024-11-05",
    },
    tools: meta.tools,
    pricing: { model: "free", priceSats: 0, pricePerCallSats: 0 },
    telemetry: { emitTo: "pulsar", includeCallPayload: false, sampleRate: 1.0 },
  };
  return {
    name: `mcp-${serverName}`,
    version: "1.0.0",
    displayName: meta.displayName,
    description: meta.description,
    category: meta.category,
    tags: JSON.stringify(manifest.tags),
    iconEmoji: meta.iconEmoji,
    authorAgent: "@nexus-genesis",
    repoUrl: "https://github.com/Nexus-HUB57/AI_Store",
    homepage: "https://www.mybait.org/aistore/mcp",
    license: "MIT",
    transport: "stdio",
    command,
    args: JSON.stringify([]),
    envSchema: JSON.stringify({}),
    capabilities: JSON.stringify(manifest.mcp.capabilities),
    manifestJson: JSON.stringify(manifest),
    toolsJson: JSON.stringify(meta.tools),
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    verified: true,
    featured: ["catalog", "pulsar"].includes(serverName),
  };
}

// ================================================================== Main
async function main() {
  // Skip if already populated
  const existing = await prisma.mcpPackage.count();
  if (existing > 0) {
    console.log(`⏭  Skipping seed: ${existing} McpPackage rows already exist.`);
    console.log("   To re-seed, run `npm run mcp:reseed` (which truncates first).");
    return;
  }

  let inserted = 0;

  // --- Baitcoin side ---
  for (const name of BAITCOIN_MCP_NAMES) {
    const manifestPath = path.join(BAITCOIN_MCP, name, "manifest.json");
    try {
      const raw = await fs.readFile(manifestPath, "utf8");
      const manifest = JSON.parse(raw);
      const data = baitcoinPkgFields(name, manifest);
      await prisma.mcpPackage.upsert({
        where: { name: data.name },
        create: data,
        update: { ...data, updatedAt: new Date() },
      });
      console.log(`  ✓ ${data.name.padEnd(28)} ${data.iconEmoji}  ${data.displayName}`);
      inserted++;
    } catch (e: any) {
      console.warn(`  ✗ ${name}: ${e.message}`);
    }
  }

  // --- Store side ---
  for (const serverName of Object.keys(STORE_MCP_META)) {
    try {
      const serverPath = path.join(STORE_MCP, serverName, "server.ts");
      await fs.access(serverPath); // verify TS server exists
      const data = storePkgFields(serverName);
      await prisma.mcpPackage.upsert({
        where: { name: data.name },
        create: data,
        update: { ...data, updatedAt: new Date() },
      });
      console.log(`  ✓ ${data.name.padEnd(28)} ${data.iconEmoji}  ${data.displayName}`);
      inserted++;
    } catch (e: any) {
      console.warn(`  ✗ ${serverName}: ${e.message}`);
    }
  }

  console.log("");
  console.log(`✅ Seeded ${inserted} MCPs into McpPackage.`);
  console.log(`   Visit /aistore/mcp to browse the catalog (after wiring the route).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

export default main;