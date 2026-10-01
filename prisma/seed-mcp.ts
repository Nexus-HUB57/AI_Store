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

  // ====== 17 expanded b-AI-tcoin top-level MCPs ======

  {
    name: "mcp-attest",
    version: "1.0.0",
    displayName: "Capability Attestations",
    description: "Issue / verify / revoke capability attestations with HMAC-SHA256 signatures.",
    category: "attest",
    tags: ["attestation", "hmac", "capability", "receipt"],
    iconEmoji: "📜",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.attest.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "issue", description: "Issue a receipt", category: "attest" },
      { name: "verify", description: "Verify a receipt", category: "attest" },
      { name: "revoke", description: "Revoke a receipt", category: "attest" },
      { name: "list_for_agent", description: "List receipts for an agent", category: "attest" },
      { name: "capabilities_of", description: "Extract capabilities", category: "attest" },
      { name: "sign_payload", description: "Sign a payload", category: "sign" },
      { name: "verify_signature", description: "Verify a signature", category: "sign" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-browser",
    version: "1.0.0",
    displayName: "Browser Automation",
    description: "Headless browser automation with persistent CDP sessions — navigate, click, fill, screenshot.",
    category: "browser",
    tags: ["browser", "cdp", "automation", "headless"],
    iconEmoji: "🌐",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.browser.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "new_session", description: "Create a new browser session", category: "session" },
      { name: "navigate", description: "Navigate to URL", category: "session" },
      { name: "click", description: "Click element by selector", category: "session" },
      { name: "fill", description: "Fill an input", category: "session" },
      { name: "extract", description: "Extract text or attribute", category: "session" },
      { name: "screenshot", description: "Take screenshot", category: "session" },
      { name: "close_session", description: "Close session", category: "session" },
      { name: "list_sessions", description: "List active sessions", category: "session" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-deploy",
    version: "1.0.0",
    displayName: "Multi-Cloud Deploy",
    description: "Multi-cloud deploy orchestrator (Vercel, Fly, Railway, Kubernetes).",
    category: "deploy",
    tags: ["deploy", "vercel", "fly", "railway", "kubernetes"],
    iconEmoji: "🚀",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.deploy.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "deploy", description: "Deploy to a target", category: "deploy" },
      { name: "list_targets", description: "List deploy targets", category: "deploy" },
      { name: "deploy_status", description: "Deployment status", category: "deploy" },
      { name: "rollback", description: "Rollback deployment", category: "deploy" },
      { name: "list_services", description: "List services on target", category: "deploy" },
      { name: "scale", description: "Scale service", category: "deploy" },
      { name: "env_set", description: "Set env var", category: "deploy" },
      { name: "logs", description: "Tail logs", category: "deploy" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-embeddings",
    version: "1.0.0",
    displayName: "Vector Embeddings",
    description: "Embeddings and semantic search over collections. Supports vector upsert, cosine search, hybrid (vector + keyword) search.",
    category: "embeddings",
    tags: ["embeddings", "vector", "semantic-search", "rag"],
    iconEmoji: "🧬",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.embeddings.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "embed", description: "Embed a list of texts", category: "embedding" },
      { name: "embed_query", description: "Embed a query string", category: "embedding" },
      { name: "upsert", description: "Upsert a vector", category: "store" },
      { name: "search", description: "Cosine similarity search", category: "search" },
      { name: "delete", description: "Delete a vector", category: "store" },
      { name: "collection_stats", description: "Collection stats", category: "store" },
      { name: "hybrid_search", description: "Hybrid vector + keyword search", category: "search" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-encryption",
    version: "1.0.0",
    displayName: "Encryption Toolkit",
    description: "Symmetric/asymmetric helpers with hashing, HMAC, keypair generation, signatures.",
    category: "encryption",
    tags: ["encryption", "crypto", "hashing", "hmac"],
    iconEmoji: "🔒",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.encryption.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "encrypt", description: "Encrypt a plaintext", category: "crypto" },
      { name: "decrypt", description: "Decrypt a ciphertext", category: "crypto" },
      { name: "sign", description: "Sign a message", category: "sign" },
      { name: "verify", description: "Verify a signature", category: "sign" },
      { name: "hash", description: "Hash a message", category: "hash" },
      { name: "hmac_sign", description: "HMAC a message", category: "hmac" },
      { name: "generate_keypair", description: "Generate a keypair", category: "keys" },
      { name: "key_fingerprint", description: "Public key fingerprint", category: "keys" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-finetune",
    version: "1.0.0",
    displayName: "Fine-Tuning Pipeline",
    description: "LoRA/QLoRA fine-tuning job manager with hyperparameter recommendations and adapter export.",
    category: "finetune",
    tags: ["finetune", "lora", "qlora", "training"],
    iconEmoji: "🎛️",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.finetune.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "create_job", description: "Create a fine-tuning job", category: "job" },
      { name: "job_status", description: "Job status", category: "job" },
      { name: "list_jobs", description: "List jobs", category: "job" },
      { name: "cancel_job", description: "Cancel a job", category: "job" },
      { name: "export_adapter", description: "Export LoRA adapter", category: "export" },
      { name: "recommend_hyperparams", description: "Recommend LoRA hyperparameters", category: "recommend" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-git_ci",
    version: "1.0.0",
    displayName: "GitHub Actions Bridge",
    description: "GitHub Actions CI bridge — trigger workflows, fetch status/logs/artifacts.",
    category: "git-ci",
    tags: ["ci", "github-actions", "workflows", "artifacts"],
    iconEmoji: "🤖",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.git_ci.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "trigger_workflow", description: "Trigger a workflow", category: "ci" },
      { name: "workflow_status", description: "Workflow run status", category: "ci" },
      { name: "workflow_logs", description: "Job logs", category: "ci" },
      { name: "cancel_workflow", description: "Cancel run", category: "ci" },
      { name: "list_workflows", description: "List workflows in repo", category: "ci" },
      { name: "artifact_download", description: "Get artifact URL", category: "ci" },
      { name: "list_runs", description: "List recent runs", category: "ci" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-git_ops",
    version: "1.0.0",
    displayName: "Git Operations",
    description: "Local git operations — status, log, diff, branch, merge, stash, blame.",
    category: "git-ops",
    tags: ["git", "vcs", "branch", "merge"],
    iconEmoji: "🌿",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.git_ops.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "status", description: "Working tree status", category: "git" },
      { name: "log", description: "Recent commit log", category: "git" },
      { name: "diff", description: "Diff between refs", category: "git" },
      { name: "branch_list", description: "List branches", category: "git" },
      { name: "create_branch", description: "Create branch", category: "git" },
      { name: "merge", description: "Merge branches", category: "git" },
      { name: "stash", description: "Stash working tree", category: "git" },
      { name: "blame", description: "Blame authorship", category: "git" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-observability",
    version: "1.0.0",
    displayName: "Observability Bridge",
    description: "Prometheus / Loki / OpenTelemetry bridge for monitoring, alerting, traces.",
    category: "observability",
    tags: ["observability", "prometheus", "loki", "otel", "traces"],
    iconEmoji: "📊",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.observability.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "query_prom", description: "Query Prometheus", category: "metrics" },
      { name: "query_loki", description: "Query Loki logs", category: "logs" },
      { name: "list_metrics", description: "List metrics", category: "metrics" },
      { name: "alert_state", description: "Alert state", category: "alerts" },
      { name: "create_alert", description: "Create alert rule", category: "alerts" },
      { name: "trace_search", description: "Search OTEL traces", category: "traces" },
      { name: "service_health", description: "Service health", category: "health" },
      { name: "otel_ingest", description: "Ingest OTEL traces", category: "traces" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-rag_core",
    version: "1.0.0",
    displayName: "RAG Core",
    description: "Generic retrieval-augmented generation: ingest, chunk, retrieve, rerank with TF-IDF scoring.",
    category: "rag-core",
    tags: ["rag", "retrieval", "rerank", "knowledge"],
    iconEmoji: "🔎",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.rag_core.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "ingest_document", description: "Ingest a document", category: "ingest" },
      { name: "chunk", description: "Chunk a document by sliding window", category: "ingest" },
      { name: "retrieve", description: "Retrieve top-K chunks", category: "retrieve" },
      { name: "rerank", description: "Rerank candidates by overlap", category: "retrieve" },
      { name: "list_documents", description: "List ingested documents", category: "query" },
      { name: "document_summary", description: "Document stats", category: "query" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-rate_limit",
    version: "1.0.0",
    displayName: "Rate Limiter",
    description: "Sliding window rate limiter for agent APIs. Check / consume / reset / policy.",
    category: "rate-limit",
    tags: ["rate-limit", "throttling", "token-bucket", "sliding-window"],
    iconEmoji: "🚦",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.rate_limit.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "check", description: "Check if within limit", category: "rate-limit" },
      { name: "consume", description: "Consume cost", category: "rate-limit" },
      { name: "reset", description: "Reset key", category: "rate-limit" },
      { name: "status", description: "Key status", category: "rate-limit" },
      { name: "list_keys", description: "List tracked keys", category: "rate-limit" },
      { name: "set_policy", description: "Set default policy", category: "policy" },
      { name: "get_policy", description: "Get policy", category: "policy" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-scheduler",
    version: "1.0.0",
    displayName: "Task Scheduler",
    description: "Cron-style scheduler for agent tasks with retry policies and history tracking.",
    category: "scheduler",
    tags: ["scheduler", "cron", "jobs", "retries"],
    iconEmoji: "⏰",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.scheduler.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "schedule", description: "Schedule a recurring job", category: "job" },
      { name: "list_jobs", description: "List jobs", category: "job" },
      { name: "get_job", description: "Get a job", category: "job" },
      { name: "cancel_job", description: "Cancel a job", category: "job" },
      { name: "run_now", description: "Trigger immediate run", category: "job" },
      { name: "job_history", description: "Run history", category: "history" },
      { name: "next_run", description: "Compute next run time", category: "compute" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-scraper",
    version: "1.0.0",
    displayName: "Web Scraper",
    description: "Structured web scraping — HTML, Markdown, JSON-LD, OpenGraph, links, recursive crawl.",
    category: "scraper",
    tags: ["scraper", "html", "json-ld", "opengraph", "crawler"],
    iconEmoji: "🕸️",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.scraper.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "fetch", description: "Fetch URL in format", category: "fetch" },
      { name: "extract_structured", description: "Extract structured data", category: "extract" },
      { name: "crawl", description: "Crawl a site up to N pages", category: "crawl" },
      { name: "extract_links", description: "Extract links by pattern", category: "extract" },
      { name: "extract_jsonld", description: "Extract JSON-LD", category: "extract" },
      { name: "extract_opengraph", description: "Extract OpenGraph", category: "extract" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-search",
    version: "1.0.0",
    displayName: "Federated Web Search",
    description: "Multi-engine search (Brave + Tavily + Serper) with aggregation, news, image/video modes, suggestions, and answer synthesis.",
    category: "search",
    tags: ["search", "web", "federated", "rag"],
    iconEmoji: "🔍",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.search.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "search", description: "Search across multiple engines", category: "search" },
      { name: "news_search", description: "News-only search", category: "search" },
      { name: "image_search", description: "Image search", category: "search" },
      { name: "video_search", description: "Video search", category: "search" },
      { name: "suggest", description: "Autocomplete suggestions", category: "suggest" },
      { name: "answer", description: "Direct answer extraction", category: "answer" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-synthetic_data",
    version: "1.0.0",
    displayName: "Synthetic Data Generator",
    description: "Privacy-preserving synthetic tabular, text, and timeseries generation with differential-privacy noise utilities.",
    category: "synthetic-data",
    tags: ["synthetic", "privacy", "differential-privacy", "data"],
    iconEmoji: "🎲",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.synthetic_data.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "generate_tabular", description: "Generate synthetic tabular rows", category: "tabular" },
      { name: "generate_text", description: "Generate text samples from a template", category: "text" },
      { name: "generate_timeseries", description: "Generate synthetic timeseries", category: "timeseries" },
      { name: "privacy_budget", description: "Privacy budget interpretation", category: "privacy" },
      { name: "differential_noise", description: "Apply Laplace DP noise", category: "privacy" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-vault",
    version: "1.0.0",
    displayName: "Secrets Vault",
    description: "Secrets manager with versioning, rotation, and bulk fetch.",
    category: "vault",
    tags: ["vault", "secrets", "rotation", "kms"],
    iconEmoji: "🔐",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.vault.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "get_secret", description: "Get a secret", category: "vault" },
      { name: "set_secret", description: "Set a secret", category: "vault" },
      { name: "delete_secret", description: "Delete a secret", category: "vault" },
      { name: "list_keys", description: "List keys by prefix", category: "vault" },
      { name: "rotate_secret", description: "Rotate a secret", category: "vault" },
      { name: "secret_metadata", description: "Secret metadata", category: "vault" },
      { name: "bulk_get", description: "Bulk fetch", category: "vault" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
    license: "MIT",
  },
  {
    name: "mcp-vision",
    version: "1.0.0",
    displayName: "Vision & Audio AI",
    description: "Image classification, object detection, OCR, image captioning, audio transcription.",
    category: "vision",
    tags: ["vision", "image", "audio", "ocr", "multimodal"],
    iconEmoji: "👁️",
    authorAgent: "@nexus-genesis",
    transport: "stdio",
    command: "python -m servers.vision.server",
    args: [],
    envSchema: {},
    capabilities: {"tools": true, "resources": true, "prompts": false, "logging": true, "sampling": false},
    tools: [
      { name: "classify_image", description: "Classify an image", category: "vision" },
      { name: "detect_objects", description: "Detect objects", category: "vision" },
      { name: "transcribe_audio", description: "Transcribe audio", category: "audio" },
      { name: "describe_image", description: "Describe an image", category: "vision" },
      { name: "ocr", description: "OCR an image", category: "vision" },
      { name: "similarity", description: "Image similarity", category: "vision" },
    ],
    pricingModel: "free",
    priceSats: 0,
    pricePerCallSats: 0,
    featured: false,
    repoUrl: "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
    homepage: "https://www.mybait.org/mcp",
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