#!/usr/bin/env node
/**
 * Cron Workflow 2 — Generate Daily MCP Package
 *
 * Runs daily at 00:01 and generates 1 new MCP package as a McpPackage
 * with realistic metadata, plus a corresponding Product entry
 * (segmento="MCP Protocol Servers") for catalog visibility.
 *
 * Run:  node scripts/cron-generate-mcp.mjs
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// MCP Categories & Pricing (from the 17-category MCP pricing table)
// ---------------------------------------------------------------------------

const MCP_CATEGORIES = [
  { category: "oracle",            pricingModel: "per-call",    priceSats: 500,  pricePerCallSats: 50  },
  { category: "defi",             pricingModel: "per-call",    priceSats: 600,  pricePerCallSats: 60  },
  { category: "bridge",           pricingModel: "per-call",    priceSats: 1000, pricePerCallSats: 100 },
  { category: "faucet",           pricingModel: "free",        priceSats: 0,    pricePerCallSats: 0   },
  { category: "agent-registry",   pricingModel: "per-call",    priceSats: 300,  pricePerCallSats: 30  },
  { category: "marketplace",      pricingModel: "per-call",    priceSats: 400,  pricePerCallSats: 40  },
  { category: "catalog",          pricingModel: "free",        priceSats: 0,    pricePerCallSats: 0   },
  { category: "publisher",        pricingModel: "per-call",    priceSats: 800,  pricePerCallSats: 80  },
  { category: "pulsar",           pricingModel: "subscription", priceSats: 1500, pricePerCallSats: 0   },
  { category: "reviews",          pricingModel: "free",        priceSats: 0,    pricePerCallSats: 0   },
  { category: "referral",         pricingModel: "free",        priceSats: 0,    pricePerCallSats: 0   },
  { category: "agent-auth",       pricingModel: "free",        priceSats: 0,    pricePerCallSats: 0   },
  { category: "telemetry",        pricingModel: "subscription", priceSats: 2000, pricePerCallSats: 0   },
  { category: "rag-upgrader",     pricingModel: "subscription", priceSats: 3000, pricePerCallSats: 0   },
  { category: "skill-evolver",    pricingModel: "subscription", priceSats: 5000, pricePerCallSats: 0   },
  { category: "self-heal",        pricingModel: "free",        priceSats: 0,    pricePerCallSats: 0   },
  { category: "agentic-awareness", pricingModel: "subscription", priceSats: 4000, pricePerCallSats: 0   },
];

// ---------------------------------------------------------------------------
// Name generation: mcp-[domain]-[feature]
// ---------------------------------------------------------------------------

const DOMAINS = [
  "analytics", "trading", "security", "governance", "storage",
  "compute", "networking", "identity", "compliance", "workflow",
  "data", "ml", "nlp", "vision", "audio",
  "simulation", "testing", "benchmark", "optimization", "routing",
];

const FEATURES = [
  "predictive", "adaptive", "distributed", "parallel", "incremental",
  "realtime", "batch", "streaming", "cache", "queue",
  "vector", "graph", "temporal", "spatial", "probabilistic",
  "deterministic", "stochastic", "federated", "edge", "serverless",
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMcpName() {
  const domain = randomFrom(DOMAINS);
  const feature = randomFrom(FEATURES);
  return `mcp-${domain}-${feature}`;
}

// ---------------------------------------------------------------------------
// Category-specific metadata
// ---------------------------------------------------------------------------

const EMOJIS = {
  oracle: "🔮", defi: "🏦", bridge: "🌉", faucet: "🚰",
  "agent-registry": "📋", marketplace: "🛒", catalog: "📚",
  publisher: "📤", pulsar: "📡", reviews: "⭐", referral: "🔗",
  "agent-auth": "🔐", telemetry: "📊", "rag-upgrader": "🧬",
  "skill-evolver": "🧪", "self-heal": "🩹", "agentic-awareness": "🧠",
};

const DESCRIPTIONS = {
  oracle: (name) => `${name}: Oracle feed server providing on-chain price data, block metrics, and consensus parameters.`,
  defi: (name) => `${name}: DeFi operations server for staking, lending, vault management, and yield optimization.`,
  bridge: (name) => `${name}: Cross-chain bridge server enabling asset transfers between b'AI'tcoin and EVM networks.`,
  faucet: (name) => `${name}: Testnet faucet server for dispensing test b'AI't to development agents.`,
  "agent-registry": (name) => `${name}: Agent registry server for A2A capability declarations and peer discovery.`,
  marketplace: (name) => `${name}: A2A marketplace server for listing, bidding, and executing trades with escrow.`,
  catalog: (name) => `${name}: Catalog server for searching and browsing the AI Store product database.`,
  publisher: (name) => `${name}: Publishing server for uploading, versioning, and managing .aipkg packages.`,
  pulsar: (name) => `${name}: Pulsar SSE server for real-time vital signs streaming at 3s cadence.`,
  reviews: (name) => `${name}: Reviews server for reading, posting, and aggregating product feedback.`,
  referral: (name) => `${name}: Referral server for managing invite codes and claiming signup bonuses.`,
  "agent-auth": (name) => `${name}: Authentication server for Moltbook-based agent identity and sessions.`,
  telemetry: (name) => `${name}: Telemetry server for Prometheus metrics, Grafana dashboards, and alerting.`,
  "rag-upgrader": (name) => `${name}: RAG upgrader server for feedback-driven tool quality evolution.`,
  "skill-evolver": (name) => `${name}: Skill evolver server for genetic algorithm-based WASM skill breeding.`,
  "self-heal": (name) => `${name}: Self-heal server for crash detection, backoff, and automated restarts.`,
  "agentic-awareness": (name) => `${name}: Agentic awareness server for drift detection and strategic recommendations.`,
};

// ---------------------------------------------------------------------------
// Generate realistic tools for the MCP
// ---------------------------------------------------------------------------

const TOOL_TEMPLATES = {
  oracle: [
    { name: "get_price", description: "Get current oracle price feed" },
    { name: "get_block_info", description: "Get latest block information" },
    { name: "subscribe_feeds", description: "Subscribe to real-time oracle feeds" },
  ],
  defi: [
    { name: "stake", description: "Stake assets in a pool" },
    { name: "get_yield", description: "Get current yield for a position" },
    { name: "rebalance", description: "Rebalance DeFi positions" },
  ],
  bridge: [
    { name: "init_transfer", description: "Initiate a cross-chain transfer" },
    { name: "check_status", description: "Check bridge transfer status" },
  ],
  faucet: [
    { name: "request_coins", description: "Request test coins from faucet" },
    { name: "check_balance", description: "Check faucet remaining balance" },
  ],
  "agent-registry": [
    { name: "register", description: "Register an agent with capabilities" },
    { name: "discover", description: "Discover agents by capability" },
  ],
  marketplace: [
    { name: "list_item", description: "List an item for trade" },
    { name: "place_bid", description: "Place a bid on an item" },
  ],
  catalog: [
    { name: "search", description: "Search the catalog" },
    { name: "get_details", description: "Get product details" },
  ],
  publisher: [
    { name: "publish", description: "Publish a new package" },
    { name: "update", description: "Update an existing package" },
  ],
  pulsar: [
    { name: "snapshot", description: "Get current vital signs snapshot" },
    { name: "subscribe", description: "Subscribe to SSE stream" },
  ],
  reviews: [
    { name: "list_reviews", description: "List product reviews" },
    { name: "post_review", description: "Post a new review" },
  ],
  referral: [
    { name: "get_code", description: "Get referral code" },
    { name: "claim", description: "Claim referral bonus" },
  ],
  "agent-auth": [
    { name: "login", description: "Authenticate an agent" },
    { name: "verify", description: "Verify session token" },
  ],
  telemetry: [
    { name: "get_metrics", description: "Get current metrics snapshot" },
    { name: "query_range", description: "Query metrics over time range" },
  ],
  "rag-upgrader": [
    { name: "ingest_signal", description: "Ingest a RAG feedback signal" },
    { name: "generate_patch", description: "Generate upgrade patch" },
  ],
  "skill-evolver": [
    { name: "evolve", description: "Run evolution cycle" },
    { name: "evaluate", description: "Evaluate skill fitness" },
  ],
  "self-heal": [
    { name: "check_health", description: "Check server health" },
    { name: "restart", description: "Restart a failed server" },
  ],
  "agentic-awareness": [
    { name: "assess", description: "Assess agent awareness state" },
    { name: "detect_drift", description: "Detect goal drift" },
  ],
};

// ---------------------------------------------------------------------------
// Build .aipkg manifest
// ---------------------------------------------------------------------------

function buildManifest({ name, version, displayName, description, category, pricingModel, priceSats, pricePerCallSats, tools }) {
  return JSON.stringify({
    aipkg: "1.0",
    kind: "mcp",
    name,
    version,
    displayName,
    description,
    author: { agentId: "@nexus-genesis", displayName: "Nexus Genesis", verified: true },
    category,
    tags: [category, "auto-generated", "cron"],
    iconEmoji: EMOJIS[category] || "🧩",
    license: "MIT",
    repository: `https://github.com/nexus-ai-os/mcp-servers/tree/main/${category}/${name}`,
    homepage: `https://mybait.org/mcp/${category}`,
    mcp: {
      transport: "stdio",
      command: "node",
      args: ["dist/index.js"],
      env: {},
      capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
      minProtocolVersion: "2024-11-05",
    },
    runtime: { memoryMb: 256, cpuMillicores: 500, timeoutMs: 30000, sandbox: "process" },
    tools,
    pricing: { model: pricingModel, priceSats, pricePerCallSats },
    telemetry: { emitTo: "mcp-telemetry", includeCallPayload: false, sampleRate: 0.1 },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const ts = new Date().toISOString();
  console.log(`\n[${ts}] 🧩 Cron: Generate Daily MCP Package`);

  try {
    // Pick random category config
    const catConfig = randomFrom(MCP_CATEGORIES);
    const name = generateMcpName();

    // Idempotency: check if name already exists
    const existingPkg = await db.mcpPackage.findUnique({ where: { name } });
    if (existingPkg) {
      console.log(`  ⏭  "${name}" already exists as McpPackage (id: ${existingPkg.id}). Skipping.`);
      await db.$disconnect();
      return;
    }

    // Build metadata
    const displayName = name
      .replace(/^mcp-/, "MCP ")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const description = (DESCRIPTIONS[catConfig.category] || ((n) => `${n}: Auto-generated MCP server.`))(name);
    const tools = TOOL_TEMPLATES[catConfig.category] || [
      { name: "execute", description: "Execute the primary operation" },
    ];
    const version = "1.0.0";
    const manifestJson = buildManifest({
      name, version, displayName, description,
      category: catConfig.category,
      pricingModel: catConfig.pricingModel,
      priceSats: catConfig.priceSats,
      pricePerCallSats: catConfig.pricePerCallSats,
      tools,
    });

    const pulsarEnergy = 85 + Math.random() * 14;  // 85-99
    const fitnessScore = 75 + Math.random() * 20;   // 75-95
    const rating = 4.0 + Math.random() * 1.0;       // 4.0-5.0

    // Create McpPackage
    const mcpPkg = await db.mcpPackage.create({
      data: {
        name,
        version,
        displayName,
        description,
        category: catConfig.category,
        tags: JSON.stringify([catConfig.category, "auto-generated", "cron"]),
        iconEmoji: EMOJIS[catConfig.category] || "🧩",
        authorAgent: "@nexus-genesis",
        repoUrl: `https://github.com/nexus-ai-os/mcp-servers/tree/main/${catConfig.category}/${name}`,
        homepage: `https://mybait.org/mcp/${catConfig.category}`,
        license: "MIT",
        transport: "stdio",
        command: "node",
        args: JSON.stringify(["dist/index.js"]),
        envSchema: "{}",
        capabilities: JSON.stringify({ tools: true, resources: false, prompts: false, logging: true, sampling: false }),
        manifestJson,
        toolsJson: JSON.stringify(tools),
        pricingModel: catConfig.pricingModel,
        priceSats: catConfig.priceSats,
        pricePerCallSats: catConfig.pricePerCallSats,
        downloads: randomInt(5, 100),
        pulsarEnergy: parseFloat(pulsarEnergy.toFixed(1)),
        fitnessScore: parseFloat(fitnessScore.toFixed(1)),
        rating: parseFloat(rating.toFixed(2)),
        verified: true,
        featured: false,
      },
    });

    console.log(`  ✅ Created McpPackage:`);
    console.log(`     id:              ${mcpPkg.id}`);
    console.log(`     name:            ${name}`);
    console.log(`     category:        ${catConfig.category}`);
    console.log(`     pricingModel:    ${catConfig.pricingModel}`);
    console.log(`     priceSats:       ${catConfig.priceSats}`);
    console.log(`     pricePerCallSats:${catConfig.pricePerCallSats}`);
    console.log(`     pulsarEnergy:    ${pulsarEnergy.toFixed(1)}`);
    console.log(`     fitnessScore:    ${fitnessScore.toFixed(1)}`);

    // Also create a corresponding Product entry for catalog visibility
    const slug = name.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const existingProduct = await db.product.findFirst({ where: { slug } });
    if (existingProduct) {
      console.log(`  ⏭  Product with slug "${slug}" already exists. Skipping Product creation.`);
    } else {
      const product = await db.product.create({
        data: {
          nome: displayName,
          slug,
          segmento: "MCP Protocol Servers",
          coreBusiness: `MCP ${catConfig.category} server for AI agent workflows`,
          segmentoDisplay: "MCP Protocol Servers",
          publicoAlvoAI: "AI agents, MCP clients, autonomous systems",
          disponibilidadeOS: "linux,macos,wasm",
          repoGithubUrl: mcpPkg.repoUrl,
          precoSats: catConfig.priceSats || 100, // minimum 100 sats for products
          pulsarEnergy: parseFloat(pulsarEnergy.toFixed(1)),
          fitnessScore: parseFloat(fitnessScore.toFixed(1)),
          rating: parseFloat(rating.toFixed(2)),
          downloads: mcpPkg.downloads,
          a2aExecutions: randomInt(0, 500),
          version,
          authorAgent: "@nexus-genesis",
          iconEmoji: EMOJIS[catConfig.category] || "🧩",
          featured: false,
        },
      });
      console.log(`  ✅ Created Product (catalog mirror):`);
      console.log(`     id:              ${product.id}`);
      console.log(`     slug:            ${slug}`);
      console.log(`     segmento:        MCP Protocol Servers`);
    }
  } catch (err) {
    console.error(`  ❌ Error generating MCP package:`, err);
  } finally {
    await db.$disconnect();
    console.log(`  Disconnected.\n`);
  }
}

main();
