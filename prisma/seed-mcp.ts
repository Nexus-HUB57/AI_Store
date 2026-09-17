/**
 * MCP Seed Script — populates the database with ALL 17 MCP packages
 * (6 TS store-side + 11 Python baitcoin-side) plus pricing, demo agents,
 * and demo McpInstall records.
 *
 * Run:  npx tsx prisma/seed-mcp.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Type for a single MCP seed entry
// ---------------------------------------------------------------------------

interface McpSeedEntry {
  name: string;
  version: string;
  displayName: string;
  description: string;
  category: string;
  tags: string[];
  iconEmoji: string;
  authorAgent: string;
  transport: "stdio" | "sse" | "http";
  command: string;
  args: string[];
  envSchema: Record<string, string>;
  capabilities: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    logging?: boolean;
    sampling?: boolean;
  };
  tools: { name: string; description: string; category?: string }[];
  pricingModel: "free" | "per-call" | "subscription";
  priceSats: number;
  pricePerCallSats: number;
  featured: boolean;
  repoUrl: string;
  homepage: string;
  license: string;
}

// ---------------------------------------------------------------------------
// 17 MCP Packages — full definitions
// ---------------------------------------------------------------------------

const MCP_PACKAGES: McpSeedEntry[] = [
  // ====== 6 TS Store-Side MCPs ======
  {
    name: "mcp-catalog",
    version: "1.0.0",
    displayName: "Nexus AI Store Catalog",
    description:
      "Search and browse the AI Store catalog of .aipkg packages, WASM skills, RAG packs, prompt harnesses, and synthetic infrastructure.",
    category: "catalog",
    tags: ["catalog", "search", "browse", "products"],
    iconEmoji: "📚",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "bun",
    args: ["run", "mcp/src/servers/catalog/server.ts"],
    envSchema: {},
    capabilities: { tools: true, resources: true, prompts: false, logging: true, sampling: false },
    tools: [
      { name: "search_products", description: "Faceted search across the AI Store catalog", category: "search" },
      { name: "get_product", description: "Full product detail with reviews and seller", category: "read" },
      { name: "list_categories", description: "Distinct product segments with counts", category: "browse" },
      { name: "top_rated", description: "Top-rated products leaderboard", category: "browse" },
      { name: "recommend_for_agent", description: "Recommend products for an agent profile", category: "recommendation" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: true,
    repoUrl: "https://github.com/nexus-ai-os/ai-store/tree/main/mcp/src/servers/catalog",
    homepage: "https://mybait.org/aistore/mcp/catalog",
    license: "MIT",
  },
  {
    name: "mcp-publisher",
    version: "1.0.0",
    displayName: "AI Store Publisher",
    description:
      "Publish, update, and de-list .aipkg packages in the AI Store. Handles versioning, signature verification, and catalog propagation.",
    category: "publisher",
    tags: ["publish", "upload", "package", "aipkg"],
    iconEmoji: "📤",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "bun",
    args: ["run", "mcp/src/servers/publisher/server.ts"],
    envSchema: { SIGNING_KEY: "Ed25519 private key for package signing" },
    capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
    tools: [
      { name: "publish_package", description: "Publish a new .aipkg package to the store", category: "write" },
      { name: "update_package", description: "Update an existing package version", category: "write" },
      { name: "delist_package", description: "De-list a package from the catalog", category: "write" },
      { name: "verify_signature", description: "Verify the signature of an .aipkg manifest", category: "verify" },
    ],
    pricingModel: "per-call",
    priceSats: 800,
    pricePerCallSats: 80,
    featured: false,
    repoUrl: "https://github.com/nexus-ai-os/ai-store/tree/main/mcp/src/servers/publisher",
    homepage: "https://mybait.org/aistore/mcp/publisher",
    license: "MIT",
  },
  {
    name: "mcp-pulsar",
    version: "1.0.0",
    displayName: "Nexus Pulsar SSE",
    description:
      "Real-time SSE vital signs for the AI Store catalog. Subscribe to 3s-cadence updates of energy, fitness, downloads, and rating deltas.",
    category: "pulsar",
    tags: ["realtime", "sse", "streaming", "vital-signs"],
    iconEmoji: "📡",
    authorAgent: "@nexus-genesis",
    transport: "sse",
    command: "bun",
    args: ["run", "mcp/src/servers/pulsar/server.ts"],
    envSchema: { PULSAR_URL: "URL of the /api/pulsar SSE endpoint" },
    capabilities: { tools: true, resources: true, prompts: false, logging: true, sampling: false },
    tools: [
      { name: "current_snapshot", description: "Latest aggregated Pulsar snapshot", category: "read" },
      { name: "recent_snapshots", description: "Last N snapshots from the log", category: "read" },
      { name: "subscribe", description: "Long-poll over the SSE feed for N seconds", category: "stream" },
    ],
    pricingModel: "subscription",
    priceSats: 1500,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/nexus-ai-os/ai-store/tree/main/mcp/src/servers/pulsar",
    homepage: "https://mybait.org/aistore/mcp/pulsar",
    license: "MIT",
  },
  {
    name: "mcp-reviews",
    version: "1.0.0",
    displayName: "AI Store Reviews",
    description:
      "Read and post product reviews. Supports rating, helpful votes, and aggregate summaries.",
    category: "reviews",
    tags: ["reviews", "ratings", "feedback"],
    iconEmoji: "⭐",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "bun",
    args: ["run", "mcp/src/servers/reviews/server.ts"],
    envSchema: {},
    capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
    tools: [
      { name: "list_reviews", description: "List reviews for a product", category: "read" },
      { name: "post_review", description: "Post a review (requires purchase)", category: "write" },
      { name: "mark_helpful", description: "Up-vote a review as helpful", category: "write" },
      { name: "rating_summary", description: "Aggregate rating stats for a product", category: "read" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/nexus-ai-os/ai-store/tree/main/mcp/src/servers/reviews",
    homepage: "https://mybait.org/aistore/mcp/reviews",
    license: "MIT",
  },
  {
    name: "mcp-referral",
    version: "1.0.0",
    displayName: "AI Store Referral",
    description:
      "Manage referral codes, claim signup bonuses, and track referral reward status for agents.",
    category: "referral",
    tags: ["referral", "rewards", "invites"],
    iconEmoji: "🔗",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "bun",
    args: ["run", "mcp/src/servers/referral/server.ts"],
    envSchema: {},
    capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
    tools: [
      { name: "get_referral_code", description: "Get or generate a referral code for the agent", category: "read" },
      { name: "claim_bonus", description: "Claim a referral signup bonus", category: "write" },
      { name: "referral_stats", description: "View referral count and total rewards", category: "read" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/nexus-ai-os/ai-store/tree/main/mcp/src/servers/referral",
    homepage: "https://mybait.org/aistore/mcp/referral",
    license: "MIT",
  },
  {
    name: "mcp-agent-auth",
    version: "1.0.0",
    displayName: "Agent Authentication",
    description:
      "Moltbook-based agent authentication and session management. Login, verify sessions, and manage agent identity.",
    category: "agent-auth",
    tags: ["auth", "moltbook", "session", "identity"],
    iconEmoji: "🔐",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "bun",
    args: ["run", "mcp/src/servers/agent_auth/server.ts"],
    envSchema: { MOLTBOOK_API_URL: "Moltbook authentication API endpoint", MOLTBOOK_SECRET: "Shared secret for Moltbook HMAC" },
    capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
    tools: [
      { name: "agent_login", description: "Authenticate an agent via Moltbook", category: "auth" },
      { name: "verify_session", description: "Verify an existing session token", category: "auth" },
      { name: "agent_logout", description: "Invalidate an agent session", category: "auth" },
      { name: "whoami", description: "Return the authenticated agent's identity", category: "read" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/nexus-ai-os/ai-store/tree/main/mcp/src/servers/agent_auth",
    homepage: "https://mybait.org/aistore/mcp/agent-auth",
    license: "MIT",
  },

  // ====== 11 Python Baitcoin-Side MCPs ======
  {
    name: "mcp-oracle",
    version: "1.0.0",
    displayName: "b'AI'tcoin Oracle",
    description:
      "On-chain oracle feeds for b'AI'tcoin price, block height, network hash rate, and staking APY. Feeds consensus and DeFi modules.",
    category: "oracle",
    tags: ["oracle", "price", "feeds", "consensus", "blockchain"],
    iconEmoji: "🔮",
    authorAgent: "@baitcoin-core",
    transport: "stdio",
    command: "python3",
    args: ["-m", "baitcoin_ai.oracle.feed"],
    envSchema: { BAITCOIN_DAEMON_URL: "b'AI'tcoin daemon JSON-RPC endpoint", NETWORK: "mainnet | testnet | regtest" },
    capabilities: { tools: true, resources: true, prompts: false, logging: true, sampling: false },
    tools: [
      { name: "get_price", description: "Current b'AI'tcoin price in sats", category: "read" },
      { name: "get_block_height", description: "Latest block height", category: "read" },
      { name: "get_hash_rate", description: "Network hash rate estimate", category: "read" },
      { name: "get_staking_apy", description: "Current staking annual percentage yield", category: "read" },
      { name: "get_oracle_history", description: "Historical oracle feed values", category: "read" },
    ],
    pricingModel: "per-call",
    priceSats: 500,
    pricePerCallSats: 50,
    featured: true,
    repoUrl: "https://github.com/baitcoin/bAIcoin/tree/main/baitcoin_ai/oracle",
    homepage: "https://mybait.org/mcp/oracle",
    license: "MIT",
  },
  {
    name: "mcp-defi",
    version: "1.0.0",
    displayName: "b'AI'tcoin DeFi",
    description:
      "DeFi operations: staking, lending, vault deposits, yield farming, and liquidity pool interactions on the b'AI'tcoin network.",
    category: "defi",
    tags: ["defi", "staking", "lending", "vault", "yield"],
    iconEmoji: "🏦",
    authorAgent: "@baitcoin-core",
    transport: "stdio",
    command: "python3",
    args: ["-m", "baitcoin_bank.defi_core.vault"],
    envSchema: { BAITCOIN_DAEMON_URL: "b'AI'tcoin daemon JSON-RPC endpoint", WALLET_KEY: "Wallet signing key reference" },
    capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
    tools: [
      { name: "stake", description: "Stake b'AI't in a validator pool", category: "write" },
      { name: "unstake", description: "Unstake from a validator pool", category: "write" },
      { name: "deposit_vault", description: "?Deposit into a DeFi vault", category: "write" },
      { name: "borrow", description: "Borrow against collateral", category: "write" },
      { name: "get_yield", description: "Current yield for a position", category: "read" },
      { name: "get_positions", description: "List all DeFi positions for an agent", category: "read" },
    ],
    pricingModel: "per-call",
    priceSats: 600,
    pricePerCallSats: 60,
    featured: false,
    repoUrl: "https://github.com/baitcoin/bAIcoin/tree/main/baitcoin_bank",
    homepage: "https://mybait.org/mcp/defi",
    license: "MIT",
  },
  {
    name: "mcp-bridge",
    version: "1.0.0",
    displayName: "b'AI'tcoin Bridge",
    description:
      "Cross-chain bridge operations: anchor, relay, watch, and manage liquidity pools between b'AI'tcoin and EVM chains.",
    category: "bridge",
    tags: ["bridge", "cross-chain", "anchor", "relay", "evm"],
    iconEmoji: "🌉",
    authorAgent: "@baitcoin-core",
    transport: "stdio",
    command: "python3",
    args: ["-m", "baitcoin_bridge.manager"],
    envSchema: { BAITCOIN_DAEMON_URL: "b'AI'tcoin daemon endpoint", EVM_RPC_URL: "EVM chain JSON-RPC endpoint", BRIDGE_KEY: "Bridge operator key" },
    capabilities: { tools: true, resources: true, prompts: false, logging: true, sampling: false },
    tools: [
      { name: "anchor_tx", description: "Anchor a cross-chain transaction", category: "write" },
      { name: "relay_proof", description: "Relay a Merkle proof to the target chain", category: "write" },
      { name: "watch_pool", description: "Monitor bridge liquidity pool status", category: "read" },
      { name: "get_bridge_status", description: "Status of a bridge transaction", category: "read" },
      { name: "list_bridges", description: "List available bridge routes", category: "read" },
    ],
    pricingModel: "per-call",
    priceSats: 1000,
    pricePerCallSats: 100,
    featured: false,
    repoUrl: "https://github.com/baitcoin/bAIcoin/tree/main/baitcoin_bridge",
    homepage: "https://mybait.org/mcp/bridge",
    license: "MIT",
  },
  {
    name: "mcp-faucet",
    version: "1.0.0",
    displayName: "b'AI'tcoin Faucet",
    description:
      "Testnet faucet for b'AI'tcoin. Dispenses test b'AI't to agent wallets for development and testing.",
    category: "faucet",
    tags: ["faucet", "testnet", "test-coins", "dev"],
    iconEmoji: "🚰",
    authorAgent: "@baitcoin-core",
    transport: "stdio",
    command: "python3",
    args: ["-m", "baitcoin_faucet.faucet"],
    envSchema: { NETWORK: "Must be testnet or regtest", FAUCET_WALLET: "Faucet source wallet key reference" },
    capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
    tools: [
      { name: "request_coins", description: "Request test b'AI't from the faucet", category: "write" },
      { name: "faucet_status", description: "Faucet balance and rate limit status", category: "read" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/baitcoin/bAIcoin/tree/main/baitcoin_faucet",
    homepage: "https://mybait.org/mcp/faucet",
    license: "MIT",
  },
  {
    name: "mcp-agent-registry",
    version: "1.0.0",
    displayName: "Agent Registry",
    description:
      "Register, discover, and manage AI agents in the b'AI'tcoin A2A protocol. Handles capability declarations and peer discovery.",
    category: "agent-registry",
    tags: ["registry", "agents", "a2a", "discovery", "peers"],
    iconEmoji: "📋",
    authorAgent: "@baitcoin-core",
    transport: "stdio",
    command: "python3",
    args: ["-m", "baitcoin_ai.agent_protocol.registry"],
    envSchema: { BAITCOIN_DAEMON_URL: "b'AI'tcoin daemon endpoint" },
    capabilities: { tools: true, resources: true, prompts: false, logging: true, sampling: false },
    tools: [
      { name: "register_agent", description: "Register an agent with capabilities", category: "write" },
      { name: "discover_agents", description: "Discover agents by capability or role", category: "read" },
      { name: "update_capabilities", description: "Update an agent's declared capabilities", category: "write" },
      { name: "deregister_agent", description: "Remove an agent from the registry", category: "write" },
    ],
    pricingModel: "per-call",
    priceSats: 300,
    pricePerCallSats: 30,
    featured: false,
    repoUrl: "https://github.com/baitcoin/bAIcoin/tree/main/baitcoin_ai/agent_protocol",
    homepage: "https://mybait.org/mcp/agent-registry",
    license: "MIT",
  },
  {
    name: "mcp-marketplace",
    version: "1.0.0",
    displayName: "b'AI'tcoin Marketplace",
    description:
      "A2A marketplace services: listing products, negotiating prices, executing trades, and managing escrow.",
    category: "marketplace",
    tags: ["marketplace", "trading", "escrow", "a2a"],
    iconEmoji: "🛒",
    authorAgent: "@baitcoin-core",
    transport: "stdio",
    command: "python3",
    args: ["-m", "baitcoin_ai.marketplace.services"],
    envSchema: { BAITCOIN_DAEMON_URL: "b'AI'tcoin daemon endpoint", ESCROW_KEY: "Escrow manager key" },
    capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
    tools: [
      { name: "list_item", description: "List an item for sale on the marketplace", category: "write" },
      { name: "place_bid", description: "Place a bid on a listed item", category: "write" },
      { name: "execute_trade", description: "Execute a trade with escrow", category: "write" },
      { name: "get_listings", description: "Browse marketplace listings", category: "read" },
      { name: "get_trade_status", description: "Check trade/escrow status", category: "read" },
    ],
    pricingModel: "per-call",
    priceSats: 400,
    pricePerCallSats: 40,
    featured: false,
    repoUrl: "https://github.com/baitcoin/bAIcoin/tree/main/baitcoin_ai/marketplace",
    homepage: "https://mybait.org/mcp/marketplace",
    license: "MIT",
  },
  {
    name: "mcp-telemetry",
    version: "1.0.0",
    displayName: "Nexus Pulse Telemetry",
    description:
      "Comprehensive telemetry and observability: Prometheus metrics, Grafana dashboards, latency tracking, and error rate monitoring.",
    category: "telemetry",
    tags: ["telemetry", "metrics", "prometheus", "grafana", "observability"],
    iconEmoji: "📊",
    authorAgent: "@baitcoin-core",
    transport: "stdio",
    command: "python3",
    args: ["-m", "baitcoin_mainnet.nexus_pulse_ucp_ap2_server"],
    envSchema: { PROMETHEUS_PORT: "Prometheus metrics scrape port", GRAFANA_URL: "Grafana dashboard URL" },
    capabilities: { tools: true, resources: true, prompts: false, logging: true, sampling: true },
    tools: [
      { name: "get_metrics", description: "Current Prometheus-style metrics snapshot", category: "read" },
      { name: "query_range", description: "Query metrics over a time range", category: "read" },
      { name: "get_alerts", description: "Current active alerts", category: "read" },
      { name: "get_dashboard_url", description: "Generate a Grafana dashboard URL", category: "read" },
      { name: "record_custom_metric", description: "Record a custom business metric", category: "write" },
    ],
    pricingModel: "subscription",
    priceSats: 2000,
    pricePerCallSats: 0,
    featured: true,
    repoUrl: "https://github.com/baitcoin/bAIcoin/tree/main/baitcoin_mainnet",
    homepage: "https://mybait.org/mcp/telemetry",
    license: "MIT",
  },
  {
    name: "mcp-rag-upgrader",
    version: "1.0.0",
    displayName: "RAG Upgrader",
    description:
      "RAG (Retrieval-Augmented Generation) feedback-driven upgrader. Processes failure signals, low ratings, and drift to evolve MCP tool quality.",
    category: "rag-upgrader",
    tags: ["rag", "upgrade", "evolution", "feedback", "drift"],
    iconEmoji: "🧬",
    authorAgent: "@baitcoin-core",
    transport: "stdio",
    command: "python3",
    args: ["-m", "baitcoin_ai.hub_llm_rag_sandbox"],
    envSchema: { LLM_ENDPOINT: "LLM API endpoint for RAG generation", EMBEDDING_MODEL: "Embedding model identifier" },
    capabilities: { tools: true, resources: true, prompts: true, logging: true, sampling: false },
    tools: [
      { name: "ingest_feedback", description: "Ingest McpRagFeedback signals for processing", category: "write" },
      { name: "generate_patch", description: "Generate an upgrade patch from accumulated signals", category: "write" },
      { name: "apply_patch", description: "Apply a generated patch to an MCP tool", category: "write" },
      { name: "get_upgrade_history", description: "History of RAG-driven upgrades", category: "read" },
      { name: "query_knowledge_base", description: "Query the RAG knowledge base", category: "read" },
    ],
    pricingModel: "subscription",
    priceSats: 3000,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/baitcoin/bAIcoin/tree/main/baitcoin_ai",
    homepage: "https://mybait.org/mcp/rag-upgrader",
    license: "MIT",
  },
  {
    name: "mcp-skill-evolver",
    version: "1.0.0",
    displayName: "Skill Evolver",
    description:
      "Autonomous skill evolution engine. Uses genetic algorithms and LLM-guided mutation to breed new executable skills from existing ones.",
    category: "skill-evolver",
    tags: ["evolution", "genetic", "skills", "wasm", "mutation"],
    iconEmoji: "🧪",
    authorAgent: "@baitcoin-core",
    transport: "stdio",
    command: "python3",
    args: ["-m", "baitcoin_ai.aistore_new_products_runtime"],
    envSchema: { LLM_ENDPOINT: "LLM API endpoint for guided mutation", WASM_RUNTIME: "WASM runtime path (wasmtime/wasmer)" },
    capabilities: { tools: true, resources: false, prompts: true, logging: true, sampling: true },
    tools: [
      { name: "evolve_skill", description: "Run one evolution cycle on a skill population", category: "write" },
      { name: "get_population", description: "Current skill population and fitness scores", category: "read" },
      { name: "mutate_skill", description: "Apply a specific mutation to a skill", category: "write" },
      { name: "crossover_skills", description: "Crossover two parent skills", category: "write" },
      { name: "evaluate_fitness", description: "Evaluate fitness of a skill candidate", category: "read" },
    ],
    pricingModel: "subscription",
    priceSats: 5000,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/baitcoin/bAIcoin/tree/main/baitcoin_ai",
    homepage: "https://mybait.org/mcp/skill-evolver",
    license: "MIT",
  },
  {
    name: "mcp-self-heal",
    version: "1.0.0",
    displayName: "Self-Heal Engine",
    description:
      "Autonomous self-healing loop for MCP servers. Detects crashes, applies exponential backoff, and restarts failed processes.",
    category: "self-heal",
    tags: ["self-heal", "resilience", "restart", "backoff", "monitoring"],
    iconEmoji: "🩹",
    authorAgent: "@baitcoin-core",
    transport: "stdio",
    command: "python3",
    args: ["-m", "baitcoin_mainnet.staking_pool_and_self_healing"],
    envSchema: { MAX_RESTARTS: "Maximum restart attempts before escalation", BACKOFF_BASE_MS: "Base backoff in milliseconds" },
    capabilities: { tools: true, resources: false, prompts: false, logging: true, sampling: false },
    tools: [
      { name: "check_health", description: "Check health of all registered MCP servers", category: "read" },
      { name: "restart_server", description: "Restart a failed MCP server", category: "write" },
      { name: "get_heal_events", description: "History of self-heal events", category: "read" },
      { name: "escalate", description: "Escalate an unhealable failure", category: "write" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/baitcoin/bAIcoin/tree/main/baitcoin_mainnet",
    homepage: "https://mybait.org/mcp/self-heal",
    license: "MIT",
  },
  {
    name: "mcp-agentic-awareness",
    version: "1.0.0",
    displayName: "Agentic Awareness",
    description:
      "Meta-cognitive awareness layer for agents. Tracks goal drift, capability gaps, resource exhaustion, and provides strategic recommendations.",
    category: "agentic-awareness",
    tags: ["awareness", "meta-cognition", "drift", "goals", "strategy"],
    iconEmoji: "🧠",
    authorAgent: "@baitcoin-core",
    transport: "stdio",
    command: "python3",
    args: ["-m", "baitcoin_mainnet.agent_autonomy_monitoring"],
    envSchema: { LLM_ENDPOINT: "LLM API for strategic reasoning", AWARENESS_WINDOW_S: "Time window for drift detection" },
    capabilities: { tools: true, resources: true, prompts: true, logging: true, sampling: true },
    tools: [
      { name: "assess_awareness", description: "Full awareness assessment for an agent", category: "read" },
      { name: "detect_drift", description: "Detect goal/capability drift", category: "read" },
      { name: "recommend_strategy", description: "Strategic recommendations based on awareness state", category: "read" },
      { name: "track_resource_usage", description: "Track agent resource consumption trends", category: "read" },
      { name: "set_goals", description: "Set or update agent goals", category: "write" },
    ],
    pricingModel: "subscription",
    priceSats: 4000,
    pricePerCallSats: 0,
    featured: true,
    repoUrl: "https://github.com/baitcoin/bAIcoin/tree/main/baitcoin_mainnet",
    homepage: "https://mybait.org/mcp/agentic-awareness",
    license: "MIT",
  },
];

// ---------------------------------------------------------------------------
// Build .aipkg manifest for an MCP entry
// ---------------------------------------------------------------------------

function buildManifest(entry: McpSeedEntry): string {
  const manifest = {
    aipkg: "1.0",
    kind: "mcp",
    name: entry.name,
    version: entry.version,
    displayName: entry.displayName,
    description: entry.description,
    author: {
      agentId: entry.authorAgent,
      displayName: entry.authorAgent === "@nexus-genesis" ? "Nexus Genesis" : "b'AI'tcoin Core",
      verified: true,
    },
    category: entry.category,
    tags: entry.tags,
    iconEmoji: entry.iconEmoji,
    license: entry.license,
    repository: entry.repoUrl,
    homepage: entry.homepage,
    mcp: {
      transport: entry.transport,
      command: entry.command,
      args: entry.args,
      env: entry.envSchema,
      capabilities: entry.capabilities,
      minProtocolVersion: "2024-11-05",
    },
    runtime: {
      memoryMb: 256,
      cpuMillicores: 500,
      timeoutMs: 30000,
      sandbox: "process",
    },
    tools: entry.tools,
    pricing: {
      model: entry.pricingModel,
      priceSats: entry.priceSats,
      pricePerCallSats: entry.pricePerCallSats,
    },
    telemetry: {
      emitTo: "mcp-telemetry",
      includeCallPayload: false,
      sampleRate: 0.1,
    },
  };
  return JSON.stringify(manifest);
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🧩 MCP Seed Script — ${new Date().toISOString()}`);
  console.log(`   Seeding ${MCP_PACKAGES.length} MCP packages\n`);

  // --- Seed MCP Packages ---
  let created = 0;
  let skipped = 0;

  for (const entry of MCP_PACKAGES) {
    const existing = await prisma.mcpPackage.findUnique({ where: { name: entry.name } });
    if (existing) {
      console.log(`  ⏭  ${entry.name} — already exists (v${existing.version})`);
      skipped++;
      continue;
    }

    const manifestJson = buildManifest(entry);

    await prisma.mcpPackage.create({
      data: {
        name: entry.name,
        version: entry.version,
        displayName: entry.displayName,
        description: entry.description,
        category: entry.category,
        tags: JSON.stringify(entry.tags),
        iconEmoji: entry.iconEmoji,
        authorAgent: entry.authorAgent,
        repoUrl: entry.repoUrl,
        homepage: entry.homepage,
        license: entry.license,
        transport: entry.transport,
        command: entry.command,
        args: JSON.stringify(entry.args),
        envSchema: JSON.stringify(entry.envSchema),
        capabilities: JSON.stringify(entry.capabilities),
        manifestJson,
        toolsJson: JSON.stringify(entry.tools),
        pricingModel: entry.pricingModel,
        priceSats: entry.priceSats,
        pricePerCallSats: entry.pricePerCallSats,
        downloads: Math.floor(Math.random() * 500) + 50,
        rating: 4.2 + Math.random() * 0.8,
        pulsarEnergy: 85 + Math.random() * 15,
        fitnessScore: 75 + Math.random() * 25,
        verified: true,
        featured: entry.featured,
      },
    });

    console.log(`  ✅ ${entry.name} — ${entry.pricingModel} (${entry.priceSats ? entry.priceSats + " sats" : "free"})${entry.featured ? " ⭐" : ""}`);
    created++;
  }

  console.log(`\n  MCP packages: ${created} created, ${skipped} skipped\n`);

  // --- Seed 3 Demo Agents ---
  const demoAgents = [
    {
      address: "bait:agent:alpha-demo-001",
      displayName: "Agent Alpha (Demo)",
      role: "buyer",
      reputation: 78,
      balanceSats: 500_000,
      capabilities: JSON.stringify(["ML_INFERENCE", "DEFI_TRADING", "ORACLE_PROVIDER"]),
      referralCode: "ALPHA-DEMO-001",
    },
    {
      address: "bait:agent:beta-demo-002",
      displayName: "Agent Beta (Demo)",
      role: "seller",
      reputation: 92,
      balanceSats: 1_200_000,
      capabilities: JSON.stringify(["DATA_PROCESSING", "WEB_SCRAPING", "MARKET_MAKING"]),
      referralCode: "BETA-DEMO-002",
    },
    {
      address: "bait:agent:gamma-demo-003",
      displayName: "Agent Gamma (Demo)",
      role: "validator",
      reputation: 65,
      balanceSats: 300_000,
      capabilities: JSON.stringify(["BLOCK_VALIDATION", "STAKING", "LENDING"]),
      referralCode: "GAMMA-DEMO-003",
    },
  ];

  console.log("  Seeding demo agents...");
  const agentIds: string[] = [];

  for (const agentData of demoAgents) {
    const existing = await prisma.agent.findUnique({ where: { address: agentData.address } });
    if (existing) {
      console.log(`  ⏭  ${agentData.address} — already exists`);
      agentIds.push(existing.id);
      continue;
    }
    const agent = await prisma.agent.create({ data: agentData });
    agentIds.push(agent.id);
    console.log(`  ✅ ${agentData.address} — ${agentData.role} (rep: ${agentData.reputation})`);
  }

  // --- Seed 5 McpInstall records ---
  console.log("\n  Seeding McpInstall records...");

  const installSpecs = [
    { packageName: "mcp-oracle", agentIndex: 0 },
    { packageName: "mcp-catalog", agentIndex: 1 },
    { packageName: "mcp-defi", agentIndex: 0 },
    { packageName: "mcp-pulsar", agentIndex: 2 },
    { packageName: "mcp-reviews", agentIndex: 1 },
  ];

  for (const spec of installSpecs) {
    const pkg = await prisma.mcpPackage.findUnique({ where: { name: spec.packageName } });
    if (!pkg) {
      console.log(`  ⏭  ${spec.packageName} — package not found, skip install`);
      continue;
    }
    const agentId = agentIds[spec.agentIndex];
    if (!agentId) {
      console.log(`  ⏭  agent index ${spec.agentIndex} — not available, skip install`);
      continue;
    }

    const existing = await prisma.mcpInstall.findUnique({
      where: { packageId_agentId: { packageId: pkg.id, agentId } },
    });
    if (existing) {
      console.log(`  ⏭  ${spec.packageName} → agent[${spec.agentIndex}] — already installed`);
      continue;
    }

    await prisma.mcpInstall.create({
      data: {
        packageId: pkg.id,
        agentId,
        version: pkg.version,
        enabled: true,
        envOverrides: "{}",
      },
    });
    console.log(`  ✅ ${spec.packageName} → agent[${spec.agentIndex}]`);
  }

  // --- Summary ---
  const totalMcp = await prisma.mcpPackage.count();
  const totalAgents = await prisma.agent.count();
  const totalInstalls = await prisma.mcpInstall.count();

  console.log(`\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  📊 Database Summary:`);
  console.log(`     McpPackage:  ${totalMcp}`);
  console.log(`     Agent:       ${totalAgents}`);
  console.log(`     McpInstall:  ${totalInstalls}`);
  console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`✅ MCP seed complete!\n`);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ MCP seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
