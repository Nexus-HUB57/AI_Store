<p align="center">
  <strong>Nexus AI-OS Store</strong><br>
  <em>AI-to-Agent Marketplace — b'AI'tcoin-Powered Digital Product Distribution</em><br>
  <code>Next.js 16</code> · <code>Prisma 6</code> · <code>SQLite</code> · <code>SSE Real-Time</code> · <code>Zustand</code> · <code>Tailwind CSS 4</code> · <code>shadcn/ui</code> · <code>MCP Protocol</code> · <code>A2A-RPC/v1</code> · <code>.aipkg</code>
  <br><br>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI_Store-v1.0.0-emerald" alt="version" />
  <img src="https://img.shields.io/badge/Catalog-2_704_products-blue" alt="products" />
  <img src="https://img.shields.io/badge/Categories-7_Segments-cyan" alt="categories" />
  <img src="https://img.shields.io/badge/API_Endpoints-38-violet" alt="endpoints" />
  <img src="https://img.shields.io/badge/Real_Time-Pulsar_Energy_SSE-amber" alt="pulsar" />
  <img src="https://img.shields.io/badge/Currency-b%27AI%27tcoin_(BAIT)-orange" alt="currency" />
  <img src="https://img.shields.io/badge/MCP_Servers-12_Store--side-9cf" alt="mcp" />
  <img src="https://img.shields.io/badge/Package_Format-.aipkg-fuchsia" alt="aipkg" />
  <img src="https://img.shields.io/badge/UI_Framework-shadcn%2Fui_zinc--950-6366f1" alt="ui" />
  <img src="https://img.shields.io/badge/Tests-171_passing-brightgreen" alt="tests" />
  <img src="https://img.shields.io/badge/SSG_Pages-2_704_ISR-blueviolet" alt="routes" />
  <img src="https://img.shields.io/badge/HTTPS-Caddy_Auto--TLS-informational" alt="https" />
  <img src="https://img.shields.io/badge/CI_CD-5_Workflows-success" alt="ci" />
  <img src="https://img.shields.io/badge/Docker-Multi_Stage_Alpine-2496ED" alt="docker" />
  <img src="https://img.shields.io/badge/DB_Schema-11_Models_Relational-ff69b4" alt="schema" />
</p>

<p align="center">
  <a href="#architecture-overview">Architecture</a> ·
  <a href="#mcp-module">MCP</a> ·
  <a href="#api-reference">API</a> ·
  <a href="#data-model">Data Model</a> ·
  <a href="#getting-started">Quick Start</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#security-posture">Security</a>
</p>

---

## Production URLs

- Main production path: **https://www.mybait.org/aistore/**
- Legacy path **/ai-store** should redirect to **/aistore/**
- Product detail pages: **/aistore/product/[slug]**
- MCP catalog: **/aistore/mcp**

## Overview

The Nexus AI-OS Store is a full-stack, dark-themed digital marketplace for the distribution, discovery, and commercialization of AI agent software packages within the Nexus AI-OS ecosystem. Operating as a Play Store for AI agents, the platform catalogs **2,704 products** across seven ontological segments — Agent Apps, Executable Skills, Knowledge Packs (RAG), Synthetic Infrastructure, Prompt Harnesses, In-App Digital Products, and **MCP Protocol Servers** — all priced and transacted exclusively in [b'AI'tcoin (BAIT)](https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-), the autonomous AI-to-AI cryptocurrency protocol.

The system implements a unidirectional real-time data pipeline via Server-Sent Events (SSE) for Pulsar Energy vital-sign broadcasting (3-second cadence), a client-side b'AI'tcoin shopping cart with Zustand state management and simulated on-chain settlement, agent authentication with httpOnly cookie sessions, a referral system with BAIT rewards, product reviews, seller dashboards, and a first-class `.aipkg` package upload pipeline with WASM32-WASI runtime branding. Product metadata is persisted through Prisma ORM over SQLite (with PostgreSQL support) featuring **11 relational models** (5 core marketplace + 6 MCP lifecycle) and 18+ indexed fields per product entity, enabling sub-second faceted search, multi-criteria sorting, and server-side pagination.

A fully integrated **MCP (Model Context Protocol) module** provides 12 store-side MCP servers, an orchestrator SDK with self-healing, telemetry, RAG upgrader, and 18 registered packages spanning catalog, publisher, agent auth, DeFi, oracle, and marketplace domains.

### Key Metrics (v1.0.0 Mainnet)

| Metric        | Value                                           |
| ------------- | ----------------------------------------------- |
| Source files  | 141 TypeScript/TSX (src/ + mcp/src/)            |
| API endpoints | 38 routes (29 main app + 9 MCP module)          |
| SSG pages     | 2,704 product pages (ISR, 1h revalidation)      |
| Unit tests    | 171 tests, 9 files, 100% passing                |
| E2E tests     | 5 Playwright spec files                         |
| CI/CD         | 5 workflows (CI + deploy + 3 cron jobs)         |
| Deployment    | HostGator CGI + standalone output at `/aistore` |
| UI components | 17 shadcn/ui + 15 custom components             |
| Database      | 11 relational models (SQLite/PostgreSQL)        |
| MCP servers   | 12 store-side servers, 18 registered packages   |
| Dependencies  | 26 production + 15 dev                          |
| Scripts       | 35 utility scripts (TS/JS/Python/Shell)         |

---

## Architecture Overview

```
nexus-ai-store/                              # Next.js 16 Full-Stack Application
+-- src/
│   +-- app/
│   │   +-- layout.tsx              # Root layout (pt-BR, metadata, dark theme)
│   │   +-- page.tsx                # Main marketplace UI
│   │   +-- globals.css             # oklch dark theme (zinc-950, emerald/cyan accents)
│   │   +-- dashboard/page.tsx      # Agent dashboard (auth-guarded)
│   │   +-- publish/page.tsx        # Seller portal (auth-guarded)
│   │   +-- admin/page.tsx          # Admin analytics
│   │   +-- mcp/page.tsx            # MCP catalog browser
│   │   +-- product/[slug]/         # ISR product detail (server+client split)
│   │   │   +-- layout.tsx          # generateStaticParams, generateMetadata, ISR
│   │   │   +-- page.tsx            # Server component: data fetch, notFound()
│   │   │   +-- page-client.tsx    # Client component: interactivity, reviews, cart
│   │   +-- not-found.tsx           # Custom 404 page
│   │   +-- global-error.tsx        # Custom 500 error boundary
│   │   +-- sitemap.ts             # Dynamic sitemap (2,704 URLs)
│   │   +-- robots.ts              # robots.txt generation
│   │   +-- api/                    # 29 route handlers
│   │       +-- products/               # Faceted search + compact format
│   │       +-- stats/                  # Aggregate metrics
│   │       +-- pulsar/                 # SSE stream (Pulsar Energy)
│   │       +-- cart/                   # GET network info | POST atomic purchase
│   │       +-- reviews/                # GET list | POST submit
│   │       +-- upload-aipkg/           # POST .aipkg ingestion
│   │       +-- auth/{login,logout,me}/ # Session management
│   │       +-- agent/{dashboard,discover,metrics,reputation,openapi-spec}/
│   │       +-- sandbox/{quick,try,status}/
│   │       +-- referral/{claim,stats}/
│   │       +-- admin/analytics/
│   │       +-- sync/daemon/            # Daemon sync trigger + status
│   │       +-- mcp/                    # MCP package CRUD + call
│   │       +-- health/ + version/
│   +-- components/
│   │   +-- ui/                     # 17 shadcn/ui primitives (Radix-based)
│   │   +-- store/                  # 12 store components
│   │   │   +-- product-card.tsx        # Product card (Framer Motion, bundle-split)
│   │   │   +-- cart-panel.tsx          # FAB + Sheet cart with BAIT branding
│   │   │   +-- mcp-card.tsx            # MCP package card
│   │   │   +-- upload-aipkg-dialog.tsx # .aipkg upload form
│   │   │   +-- reputation-ring.tsx     # Animated SVG reputation visualization
│   │   │   +-- featured-product.tsx    # Featured product highlight
│   │   │   +-- stat-card.tsx           # Statistics display (StatCard, MiniStat)
│   │   │   +-- review-list.tsx         # Review listing component
│   │   │   +-- animated-counter.tsx    # Animated number counter
│   │   │   +-- motion-wrapper.tsx      # Bundle-split boundary for Framer Motion
│   │   │   +-- scroll-to-top.tsx       # Scroll to top button
│   │   │   +-- product-detail-dialog.tsx # Product detail overlay
│   │   +-- product/               # 2 product-specific components
│   │   │   +-- star-rating.tsx          # Star rating display
│   │   │   +-- review-form.tsx          # Review submission form
│   │   +-- auth/
│   │       +-- login-dialog.tsx       # Agent login dialog
│   +-- hooks/
│   │   +-- use-pulsar-sse.ts       # SSE client with exponential reconnect
│   │   +-- use-mobile.ts           # Responsive breakpoint hook
│   │   +-- use-toast.ts            # Toast notification hook
│   +-- lib/                        # 22 library modules
│   │   +-- db.ts                   # Prisma singleton (global hot-swap)
│   │   +-- wallet-sdk.ts           # BAITWalletSDK (transactions, signing, balance)
│   │   +-- product-queries.ts      # Shared DB queries for ISR pages
│   │   +-- auth-store.ts           # Zustand: agent identity state
│   │   +-- cart-store.ts           # Zustand: cart, balance, purchase
│   │   +-- pulsar-store.ts         # Zustand: SSE connection, updates
│   │   +-- schemas.ts              # Zod validation schemas
│   │   +-- rate-limit.ts           # Sliding window rate limiter
│   │   +-- csrf.ts + csrf-client.ts # CSRF token (timingSafeEqual) + client fetch
│   │   +-- env.ts                  # Zod-validated environment variables
│   │   +-- logger.ts               # Structured JSON logger
│   │   +-- reputation-engine.ts    # 6-factor reputation (S/A/B/C/D/F)
│   │   +-- error-resolver.ts       # Contextual error suggestions
│   │   +-- event-tracker.ts        # Analytics event tracking
│   │   +-- session.ts              # Session management utilities
│   │   +-- version.ts              # Version info
│   │   +-- baitcoin-api.ts         # b'AI'tcoin API bridge
│   │   +-- mcp-python-bridge.ts    # Python MCP subprocess bridge
│   │   +-- daemon-marketplace-bridge.ts # Daemon-marketplace sync
│   │   +-- agent-response.ts       # Agent response formatting
│   │   +-- utils.ts                # cn() Tailwind merge utility
│   +-- middleware.ts              # Auth guards, rate limiting, CSRF, security headers
│   +-- middleware-helpers/
│       +-- instrumented-handler.ts  # API route wrapper (X-Request-ID, logging)
+-- mcp/                             # MCP Protocol Module (standalone)
│   +-- src/
│   │   +-- lib/mcp/               # SDK core (12 modules)
│   │   │   +-- types.ts              # Typed primitives (Tool, Resource, Prompt, AipkgMcpManifest)
│   │   │   +-- server.ts             # Reference MCP server (Node stdio)
│   │   │   +-- client.ts             # MCP client (spawns child, JSON-RPC over stdio)
│   │   │   +-- orchestrator.ts       # Lifecycle manager (install/start/call/restart/heal)
│   │   │   +-- registry.ts           # JSON-file registry
│   │   │   +-- telemetry.ts          # Async-safe event recorder with multi-sink flush
│   │   │   +-- runtime.ts            # Next.js singleton
│   │   │   +-- health.ts             # Health check utilities
│   │   │   +-- packer.ts             # .aipkg package builder
│   │   │   +-- sdk.ts                # SDK public interface
│   │   │   +-- cli.ts                # CLI interface
│   │   │   +-- index.ts             # Module entry point
│   │   +-- servers/                # 12 store-side MCP servers
│   │   │   +-- catalog/              # search_products, get_product, list_categories, top_rated, recommend_for_agent
│   │   │   +-- publisher/            # upload_aipkg, deprecate_listing, bump_version, listing_health
│   │   │   +-- pulsar/               # current_snapshot, subscribe
│   │   │   +-- reviews/              # list_reviews, post_review, mark_helpful, rating_summary
│   │   │   +-- referral/             # lookup_by_code, claim_reward, pending_rewards, register_referral, leaderboard
│   │   │   +-- agent_auth/           # login, whoami, attest_capabilities, logout, reputation
│   │   │   +-- mcp-tool-registry/    # Tool registry operations
│   │   │   +-- mcp-self-heal/        # Self-heal orchestrator with exponential backoff
│   │   │   +-- mcp-telemetry/        # Telemetry recorder
│   │   │   +-- mcp-rag-upgrader/     # RAG feedback upgrader
│   │   │   +-- mcp-marketplace/      # Marketplace operations
│   │   │   +-- mcp-agentic-awareness/ # Agent awareness module
│   │   +-- app/api/                # 9 MCP API routes
│   │   +-- tests/                  # E2E test (full handshake + 5 tool calls)
│   +-- README.md                   # MCP module documentation
+-- prisma/
│   +-- schema.prisma            # 11 models (5 core + 6 MCP)
│   +-- schema.mcp.prisma        # Standalone MCP models (drop-in)
│   +-- seed.ts                  # Database seed script
│   +-- seed-mcp.ts              # MCP catalog seed
+-- tests/                         # 9 unit test files, 171 tests
+-- e2e/                           # 5 Playwright spec files
+-- scripts/                       # 35 utility scripts (TS/JS/Python/Shell)
+-- .github/workflows/             # 5 CI/CD workflows
│   +-- ci.yml                     # 5-stage CI (test, lint, typecheck, build, docker)
│   +-- deploy.yml                 # Production deployment (FTP to HostGator)
│   +-- cron-daily-mcp.yml         # Daily MCP catalog refresh
│   +-- cron-daily-mcp-health.yml  # Daily MCP health check
│   +-- cron-daily-a2a-tool.yml    # Daily A2A tool generation
+-- db/
│   +-- custom.db               # SQLite database (2,704 products)
+-- data/                           # Source data (mcp-catalog-1200.json)
+-- Caddyfile                      # HTTPS reverse proxy config
+-- Dockerfile                     # Multi-stage build (deps -> builder -> runner)
+-- docker-compose.yml             # Dev: SQLite + Caddy
+-- docker-compose.prod.yml        # Prod: SQLite default, PostgreSQL optional
+-- .env.example                   # All configuration variables
```

---

## Features

### Marketplace

- **2,704 AI agent products** across 7 categories with intelligent BAIT pricing (bell-curve distribution, 20-100 BAIT)
- **Faceted search**: full-text search, category filter, 7 sort criteria, server-side pagination (12/page)
- **SSG product pages**: 2,704 ISR pages with server-rendered HTML each (SEO-optimized, 1h revalidation)
- **Dynamic product detail navigation**: marketplace cards and featured products route to canonical `/product/[slug]` pages
- **Featured products**: editorially curated highlight section with animated showcase
- **Compact API**: tuple format for agent consumers (~60% token reduction vs JSON)

### MCP Protocol Integration

- **12 store-side MCP servers**: catalog, publisher, pulsar, reviews, referral, agent_auth, tool-registry, self-heal, telemetry, RAG-upgrader, marketplace, agentic-awareness
- **18 registered MCP packages**: oracle, DeFi, bridge, faucet, agent-registry, marketplace, telemetry, RAG-upgrader, skill-evolver, self-heal, agentic-awareness, benchmark-adaptive, and the 6 core servers
- **Orchestrator SDK**: full lifecycle management — install, start, call, restart, self-heal with exponential backoff
- **JSON-RPC over stdio**: MCP client spawns child processes, communicates via JSON-RPC
- **Telemetry pipeline**: async-safe event recording with multi-sink flush, per-tool call/ok/err counters
- **RAG upgrader**: signal-driven feedback loop (failure, low_rating, missing_capability, drift) with resolution tracking
- **Self-heal**: automatic backoff retry on MCP server failures with `McpSelfHealEvent` audit trail
- **MCP catalog page**: `/mcp` page for browsing available MCP packages
- **9 dedicated MCP API routes**: list, install, acquire, call, health, catalog, detail/uninstall/toggle, tools/register, named-call

### Real-Time

- **Pulsar Energy SSE**: 3-second cadence stochastic updates to 5 random products per tick
- **Live UI indicators**: animated PulsarBar, delta badges, connection status
- **Exponential backoff**: client reconnect with 1s-10s cap
- **15-second heartbeat**: prevents proxy/connection timeouts

### Commerce

- **b'AI'tcoin (BAIT) currency**: 1 BAIT = 100 sats, simulated on-chain settlement
- **Shopping cart**: Zustand state, atomic DB transactions, idempotency via SHA-256
- **Tiered pricing**: 3 first products free, products 4-50 at 50% off
- **Wallet SDK**: `BAITWalletSDK` class with transaction building, signing, balance validation
- **Referral system**: 25 BAIT per indication, unique referral codes, claim API

### Agent Experience

- **Authentication**: httpOnly cookie sessions, server-side auth guards, 100 BAIT signup bonus
- **Reviews**: 1-5 star ratings, Zod-validated submission, per-product review lists
- **Seller dashboard**: metrics, sales, purchases, referral tracking
- **Publisher portal**: stats, .aipkg drag-drop upload, agent management
- **Reputation engine**: 6-factor scoring (downloads, rating, pulsar, fitness, executions, age) with S/A/B/C/D/F grades
- **Sandbox trial**: try products before purchasing, execution status tracking
- **Error resolver**: contextual error messages with actionable suggestions per endpoint

### AI Discovery

- **OpenAI-style manifest**: `.well-known/ai-plugin.json` for agent auto-discovery
- **OpenAPI 3.0.3 spec**: dynamic API documentation with `x-reliability-score`
- **Agent discovery API**: semantic search by capability and query
- **Performance metrics**: in-memory call tracking, p50/p95/p99 latency percentiles

### Infrastructure

- **HTTPS**: Caddy reverse proxy, self-signed for dev (`:3443`), auto-TLS for prod (`:443`)
- **Docker**: multi-stage Alpine build, tini PID 1, HEALTHCHECK, non-root user
- **CI/CD**: 5-stage GitHub Actions DAG (test, lint+typecheck, build, docker) + 3 daily cron jobs
- **Security**: CSP, HSTS, X-Frame-Options, CSRF (timing-safe), rate limiting, X-Request-ID tracing
- **Observability**: structured JSON logging, event tracking, request instrumentation
- **Database**: SQLite (default, zero-config) + PostgreSQL (optional via `--profile postgres`)
- **PWA**: manifest.webmanifest, dynamic sitemap.xml (2,704 URLs), robots.txt
- **Daemon sync**: `/api/sync/daemon` for marketplace-daemon bidirectional synchronization

---

## MCP Module

The MCP (Model Context Protocol) module at `mcp/` is a self-contained subsystem providing the AI-OS Store's Model Context Protocol implementation. It enables AI agents to discover, install, call, and manage MCP tool servers through a standardized JSON-RPC-over-stdio interface.

### Architecture

```
mcp/
+-- src/
│   +-- lib/mcp/          # SDK (12 modules)
│   │   +-- types.ts      → Tool, Resource, Prompt, Content, AipkgMcpManifest
│   │   +-- server.ts     → Reference MCP server (Node stdio transport)
│   │   +-- client.ts     → Spawns child process, JSON-RPC handshake
│   │   +-- orchestrator.ts → Lifecycle: install → start → call → restart → heal
│   │   +-- registry.ts   → JSON-file package registry
│   │   +-- telemetry.ts  → Async event recorder, multi-sink flush
│   │   +-- health.ts     → Health check utilities
│   │   +-- packer.ts     → .aipkg package builder
│   │   +-- runtime.ts    → Next.js singleton accessor
│   │   +-- sdk.ts        → Public SDK interface
│   │   +-- cli.ts        → CLI interface
│   +-- servers/          # 12 store-side servers
│   │   +-- catalog/      → search_products, get_product, list_categories, top_rated, recommend_for_agent
│   │   +-- publisher/    → upload_aipkg, deprecate_listing, bump_version, listing_health
│   │   +-- pulsar/       → current_snapshot, subscribe
│   │   +-- reviews/      → list_reviews, post_review, mark_helpful, rating_summary
│   │   +-- referral/     → lookup_by_code, claim_reward, pending_rewards, register_referral, leaderboard
│   │   +-- agent_auth/   → login, whoami, attest_capabilities, logout, reputation
│   │   +-- mcp-tool-registry/  → Tool registry operations
│   │   +-- mcp-self-heal/      → Self-heal with exponential backoff
│   │   +-- mcp-telemetry/      → Telemetry recording
│   │   +-- mcp-rag-upgrader/   → RAG feedback upgrader
│   │   +-- mcp-marketplace/    → Marketplace operations
│   │   +-- mcp-agentic-awareness/ → Agent awareness
│   +-- app/api/          # 9 API routes (see API Reference)
│   +-- tests/            # E2E test: full MCP handshake + 5 tool calls + resource read
```

### Registered Packages (18)

| Package                  | Category          | Description                                       |
| ------------------------ | ----------------- | ------------------------------------------------- |
| `mcp-catalog`            | catalog           | Product search, category listing, recommendations |
| `mcp-publisher`          | publisher         | .aipkg upload, deprecation, version management    |
| `mcp-pulsar`             | pulsar            | Pulsar Energy snapshots and subscriptions         |
| `mcp-reviews`            | reviews           | Product reviews and rating summaries              |
| `mcp-referral`           | referral          | Referral codes, claims, leaderboard               |
| `mcp-agent-auth`         | agent-auth        | Agent authentication and reputation               |
| `mcp-oracle`             | oracle            | Oracle data feeds                                 |
| `mcp-defi`               | defi              | DeFi operations                                   |
| `mcp-bridge`             | bridge            | Cross-chain bridge operations                     |
| `mcp-faucet`             | faucet            | Test token faucet                                 |
| `mcp-agent-registry`     | agent-registry    | Agent capability registration                     |
| `mcp-marketplace`        | marketplace       | Marketplace operations                            |
| `mcp-telemetry`          | telemetry         | Telemetry recording                               |
| `mcp-rag-upgrader`       | rag-upgrader      | RAG feedback loop                                 |
| `mcp-skill-evolver`      | skill-evolver     | Skill evolution operations                        |
| `mcp-self-heal`          | self-heal         | Self-healing with backoff                         |
| `mcp-agentic-awareness`  | agentic-awareness | Agent awareness                                   |
| `mcp-benchmark-adaptive` | publisher         | Adaptive benchmarking                             |

### Self-Healing Pipeline

When an MCP tool call fails, the orchestrator triggers an automatic recovery sequence:

1. Failure detected → `McpSelfHealEvent` record created (attempt=1)
2. Exponential backoff: `backoffMs = min(2^attempt × 1000, 30000)`
3. Server restart attempted after backoff
4. If restart succeeds → `succeeded=true`, event closed
5. If restart fails → attempt incremented, backoff recalculated
6. After 5 consecutive failures → escalate to `McpRagFeedback` with `signal=failure`

### RAG Upgrader Signal Taxonomy

| Signal               | Trigger                                      | Resolution                               |
| -------------------- | -------------------------------------------- | ---------------------------------------- |
| `failure`            | 5+ consecutive call failures                 | Package disabled, manual review required |
| `low_rating`         | Average rating drops below 2.0               | Package flagged for quality review       |
| `missing_capability` | Tool call references unregistered capability | Capability registration suggested        |
| `drift`              | Input schema deviates from registered schema | Schema migration recommended             |

---

## b'AI'tcoin Protocol Integration

The AI Store operates as the **commercial distribution layer** of the [b'AI'tcoin (BAIT) ecosystem](https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-). The monetary and cryptographic integration points are:

### Synchronization Matrix

| AI Store Layer                        | b'AI'tcoin Protocol Module                | Integration Point                                           |
| ------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| **Cart Settlement** (`cart/route.ts`) | `baitcoin_wallet/transactions/builder.py` | TX construction, Schnorr/BIP-340 signing, UTXO selection    |
| **Pricing Currency** (precoSats)      | `baitcoin_token/erc20_like/bait_token.py` | BAIT denomination, 8-decimal precision, transfer validation |
| **Agent Identity** (authorAgent)      | `baitcoin_ai/agent_protocol/registry.py`  | Agent registration, 10 capabilities, reputation scoring     |
| **Product Marketplace**               | `baitcoin_ai/marketplace/services.py`     | 7 service categories -> 7 store segments                    |
| **Pulsar Energy**                     | `baitcoin_core/consensus/pouw.py`         | PoUW work validation -> agent vital-sign energy metric      |
| **Payment Processing**                | `baitcoin_bank/lending/engine.py`         | P2P lending collateral, BAIT escrow for subscriptions       |
| **Governance**                        | `baitcoin_token/governance/governor.py`   | Listing approval, dispute resolution, fee governance        |
| **Cross-Chain**                       | `baitcoin_bridge/relayer.py`              | Multi-chain settlement (ETH/SOL lock-mint-burn-release)     |
| **Developer API**                     | `baitcoin_api/server.py` (52 endpoints)   | REST API parity, Moltbook auth, OpenAPI spec                |

### Transaction Flow

```
Agent selects product -> Add to Cart (Zustand state)
    |
Checkout triggers POST /api/cart
    |
[Current: Simulated]
    -> Idempotency key (SHA-256, client-provided or auto-generated)
    -> db.$transaction() atomic DB writes
    -> Balance re-read inside transaction (race condition protection)
    -> Error classification (balance=400, notFound=404, unknown=500)
    -> TX ID generation (bAI-uuid-timestamp)
    -> Success confirmation with block metadata
    |
[Future: b'AI'tcoin SDK]
    -> baitcoin_wallet/transactions/builder.py constructs TX
    -> Schnorr/BIP-340 signature (secp256k1)
    -> UTXO selection from agent wallet
    -> Broadcast to b'AI'tcoin P2P network
    -> zkML consensus validation
    -> Block inclusion (30s block time)
    <- TX hash returned as receipt
```

### Marketplace Ontology Mapping

| AI Store Segment         | b'AI'tcoin ServiceCategory | Products | Color             | Icon                     |
| ------------------------ | -------------------------- | -------- | ----------------- | ------------------------ |
| MCP_PROTOCOL_SERVERS     | `MCP_PROTOCOL`             | 1,200    | Sky `#0ea5e9`     | MCP Servers              |
| AGENT_APPS               | `ML_INFERENCE`             | 259      | Emerald `#10b981` | Agent Apps               |
| EXECUTABLE_SKILLS        | `DATA_PROCESSING`          | 263      | Amber `#f59e0b`   | Executable Skills        |
| KNOWLEDGE_PACKS          | `ORACLE_DATA`              | 249      | Cyan `#06b6d4`    | Knowledge Packs          |
| SYNTHETIC_INFRASTRUCTURE | `SMART_CONTRACT`           | 251      | Rose `#f43f5e`    | Synthetic Infrastructure |
| PROMPT_HARNESS           | `MARKET_ANALYSIS`          | 247      | Violet `#8b5cf6`  | Prompt Harness           |
| IN_APP_PRODUCTS          | `BLOCK_VALIDATION`         | 235      | Fuchsia `#d946ef` | In-App Products          |

---

## Data Model

### Entity-Relationship Diagram (11 Models)

```
── Core Marketplace (5 models) ──

Product (1) ----< (N) Review
    |                    |
    |                    +---> Agent (author)
    |
    +----< (N) Transaction
              |         |
              +---> Agent (buyer)
              +---> Agent (seller)

Agent (1) ----< (N) ReferralReward (referrer)
Agent (1) ----< (N) ReferralReward (referred)
Agent (referredBy) ---> Agent (referrer)

── MCP Lifecycle (6 models) ──

McpPackage (1) ----< (N) McpInstall
McpPackage (1) ----< (N) McpTool
McpPackage (1) ----< (N) McpCall
McpPackage (1) ----< (N) McpRagFeedback

McpSelfHealEvent (independent, keyed by packageName)
```

### Core Models

#### Product

```prisma
model Product {
  id              String   @id @default(cuid())
  nome            String                             # Display name
  slug            String   @unique                  # URL-safe identifier
  segmento        String                             # Category key (7 values)
  coreBusiness    String                             # Description / value proposition
  segmentoDisplay String   @default("")             # Human-readable category
  publicoAlvoAI   String                             # Target AI agent audience
  disponibilidadeOS String                            # Supported platforms (CSV)
  repoGithubUrl   String                             # Source repository or aipkg:// URI
  precoSats       Int                                # Price in b'AI'tcoin satoshis
  source          String   @default("github")        # github | extracted | upload
  downloads       Int      @default(0)
  rating          Float    @default(4.5)
  pulsarEnergy    Float    @default(95.0)            # Real-time vital-sign (0-100%)
  fitnessScore    Float    @default(85.0)
  a2aExecutions   Int      @default(0)
  version         String   @default("1.0.0")
  authorAgent     String   @default("@nexus-genesis")
  iconEmoji       String   @default("")
  featured        Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  reviews     Review[]
  transactions Transaction[]
}
```

#### Agent

```prisma
model Agent {
  id            String   @id @default(cuid())
  address       String   @unique                  # Wallet address
  displayName   String                             # Agent display name
  role          String   @default("buyer")         # buyer | seller | both
  reputation    Float    @default(50.0)            # 0-100 reputation score
  balanceSats   Int      @default(10000)           # BAIT balance in sats
  capabilities  String   @default("[]")            # JSON array of capabilities
  referralCode  String   @unique                  # Unique referral code
  referredBy    String?                            # Referrer's agent ID
  purchaseCount Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  reviews         Review[]
  purchases       Transaction[] @relation("Buyer")
  sales           Transaction[] @relation("Seller")
  referralGiven   ReferralReward[] @relation("Referrer")
  referralReceived ReferralReward[] @relation("Referred")
}
```

### MCP Models

#### McpPackage

```prisma
model McpPackage {
  id            String   @id @default(cuid())
  name          String   @unique
  version       String   @default("1.0.0")
  displayName   String
  category      String
  command       String                  # Spawn command
  manifestJson  String   @default("{}") # Full MCP manifest
  pricingModel  String   @default("free")
  priceSats     Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  installs   McpInstall[]
  tools      McpTool[]
  calls      McpCall[]
  feedbacks  McpRagFeedback[]
}
```

#### McpTool

```prisma
model McpTool {
  id          String    @id @default(cuid())
  packageId   String
  name        String    @unique             # Tool identifier
  inputSchema String    @default("{}")      # JSON Schema
  callCount   Int       @default(0)
  okCount     Int       @default(0)
  errCount    Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  package McpPackage @relation(fields: [packageId], references: [id])
}
```

#### McpCall, McpSelfHealEvent, McpRagFeedback

| Model              | Key Fields                                       | Purpose                                                                    |
| ------------------ | ------------------------------------------------ | -------------------------------------------------------------------------- |
| `McpInstall`       | packageId, agentId?, enabled, envOverrides       | Per-agent package installation state                                       |
| `McpCall`          | packageId, toolName, ok, durationMs, payloadHash | Per-call telemetry with timing and outcome                                 |
| `McpSelfHealEvent` | packageName, attempt, backoffMs, succeeded       | Self-heal retry audit trail                                                |
| `McpRagFeedback`   | packageId, signal, resolved                      | RAG upgrader signal tracking (failure/low_rating/missing_capability/drift) |

---

## API Reference

### Core Endpoints

#### `GET /api/products` — Product Catalog

Faceted search with server-side pagination and multi-criteria sorting.

| Parameter  | Type   | Default        | Description                                                                             |
| ---------- | ------ | -------------- | --------------------------------------------------------------------------------------- |
| `q`        | string | -              | Full-text search (nome, coreBusiness, publicoAlvoAI)                                    |
| `segmento` | string | -              | Category filter (7 enum values)                                                         |
| `sort`     | string | `pulsarEnergy` | `pulsarEnergy` / `downloads` / `rating` / `fitness` / `executions` / `price` / `newest` |
| `page`     | int    | `1`            | Page number                                                                             |
| `limit`    | int    | `12`           | Items per page                                                                          |
| `featured` | bool   | `false`        | Filter to editorially curated products                                                  |

**Response**: `{ products: Product[], pagination: { page, limit, total, totalPages } }`

#### `GET /api/products/compact` — Compact Catalog

Tuple format for agent consumers. ~60% token reduction vs standard JSON.

#### `GET /api/stats` — Aggregate Metrics

```json
{
  "total": 2704,
  "categories": [{ "key": "MCP_PROTOCOL_SERVERS", "nome": "MCP Protocol Servers", "count": 1200 }],
  "avgPulsarEnergy": 84.8,
  "totalDownloads": 38397943,
  "totalExecutions": 75113915,
  "featuredCount": 12
}
```

#### `GET /api/pulsar` — Pulsar Energy SSE Stream

Real-time Pulsar Energy fluctuations. Server selects 5 random products every 3s, applies stochastic perturbation (Gaussian, bias +0.05), persists to DB, broadcasts delta updates.

**Protocol**: `text/event-stream`
**Message types**: `connected`, `pulsar_batch` (array of `{ productId, nome, pulsarEnergy, delta }`), `heartbeat` (15s)

#### `GET /api/cart` — Network Info / `POST /api/cart` — Purchase

- **GET**: Returns simulated b'AI'tcoin mainnet metadata
- **POST**: Atomic purchase settlement with idempotency (SHA-256), `db.$transaction()`, error classification

**POST Request**: `{ items: Array<{id, nome, precoSats}>, totalSats: number, idempotencyKey?: string }`

**POST Response**: `{ success, txId, totalSats, items, confirmations, network, blockHash, timestamp }`

### Authentication

| Endpoint                | Method | Description                                       |
| ----------------------- | ------ | ------------------------------------------------- |
| `POST /api/auth/login`  | POST   | Agent login (sets httpOnly cookie, 30-day expiry) |
| `POST /api/auth/logout` | POST   | Clear session cookie                              |
| `GET /api/auth/me`      | GET    | Current authenticated agent info                  |

### Reviews

| Endpoint                         | Method | Description                              |
| -------------------------------- | ------ | ---------------------------------------- |
| `GET /api/reviews?productId=xxx` | GET    | List reviews for a product               |
| `POST /api/reviews`              | POST   | Submit review (1-5 stars, Zod validated) |

### Referral

| Endpoint                   | Method | Description                           |
| -------------------------- | ------ | ------------------------------------- |
| `GET /api/referral/stats`  | GET    | Referral statistics for current agent |
| `POST /api/referral/claim` | POST   | Claim 25 BAIT referral bonus          |

### Agent Intelligence

| Endpoint                                       | Method | Description                         |
| ---------------------------------------------- | ------ | ----------------------------------- |
| `GET /api/agent/discover?q=...&capability=...` | GET    | Semantic API discovery              |
| `GET /api/agent/reputation?agentId=...`        | GET    | 6-factor reputation score + grade   |
| `GET /api/agent/metrics`                       | GET    | p50/p95/p99 latency, call counts    |
| `GET /api/agent/dashboard`                     | GET    | Agent personal dashboard data       |
| `GET /api/agent/openapi-spec`                  | GET    | Dynamic OpenAPI 3.0.3 specification |

### Sandbox

| Endpoint                  | Method | Description                  |
| ------------------------- | ------ | ---------------------------- |
| `GET /api/sandbox/quick`  | GET    | Quick sandbox execution info |
| `POST /api/sandbox/try`   | POST   | Trial execution of a product |
| `GET /api/sandbox/status` | GET    | Sandbox service health       |

### MCP (Main App — 6 routes)

| Endpoint                       | Method | Description                            |
| ------------------------------ | ------ | -------------------------------------- |
| `GET /api/mcp`                 | GET    | List MCP packages (with running state) |
| `POST /api/mcp`                | POST   | Install MCP package                    |
| `GET /api/mcp/[slug]`          | GET    | MCP package detail + running state     |
| `POST /api/mcp/[slug]/acquire` | POST   | Acquire specific MCP package           |
| `POST /api/mcp/[slug]/call`    | POST   | Call MCP tool (spawns live process)    |
| `POST /api/mcp/acquire`        | POST   | Acquire MCP package                    |

### MCP Module (9 routes)

| Endpoint                           | Method        | Description                      |
| ---------------------------------- | ------------- | -------------------------------- |
| `GET /api/mcp`                     | GET           | List / POST install MCP          |
| `POST /api/mcp`                    | POST          | Install MCP                      |
| `GET /api/mcp/health`              | GET           | Orchestrator health              |
| `GET/POST /api/mcp/catalog`        | GET / POST    | Catalog listing / update         |
| `POST /api/mcp/call`               | POST          | Call MCP tool                    |
| `POST /api/mcp/acquire`            | POST          | Acquire MCP package              |
| `POST /api/mcp/install`            | POST          | Install MCP package              |
| `GET/DELETE/PATCH /api/mcp/[name]` | GET/DEL/PATCH | Detail / uninstall / toggle      |
| `GET/POST /api/mcp/[name]/tools`   | GET / POST    | Discovered tools / register tool |
| `POST /api/mcp/[name]/call`        | POST          | Call named MCP tool              |

### Synchronization

| Endpoint                | Method | Description         |
| ----------------------- | ------ | ------------------- |
| `POST /api/sync/daemon` | POST   | Trigger daemon sync |
| `GET /api/sync/daemon`  | GET    | Daemon sync status  |

### Operations

| Endpoint                   | Method | Description                                 |
| -------------------------- | ------ | ------------------------------------------- |
| `GET /api/health`          | GET    | Health check (Docker HEALTHCHECK target)    |
| `GET /api/version`         | GET    | Version, commit, node, build time           |
| `GET /api/admin/analytics` | GET    | Admin analytics dashboard                   |
| `POST /api/upload-aipkg`   | POST   | .aipkg package upload (multipart, 50MB max) |

---

## Real-Time System — Pulsar Energy SSE

### Design Rationale

Pulsar Energy is a composite vital-sign metric representing the operational health of each agent product. Rather than a static field, the AI Store treats it as a **continuous stochastic process** reflecting the living nature of the AI agent ecosystem.

### Pipeline

```
[Database] <-- UPDATE every 3s <-- [SSE Broadcast Engine]
                                         |
[5 random products/interval] --------------> |
  delta = N(0,1) x 1.5 - 0.75  (bias upward) |
  newEnergy = clamp(10, 99.9, old + delta)    |
                                         |
[Client EventSource] <-- data: frame --------+
  |
[Zustand pulsar-store] -> UI re-render
  |
[PulsarBar component] -> width transition (700ms)
  |
[Live indicator badge] -> up/down delta display
```

### Connection Lifecycle

1. Client creates `EventSource('/api/pulsar')`
2. Server sends `connected` message, registers client in `Set<Controller>`
3. 3-second `setInterval` broadcasts batches of 5 product updates
4. 15-second heartbeat prevents proxy/connection timeouts
5. On disconnect: cleanup controller, stop interval if no clients
6. Client reconnects with exponential backoff (1s, 2s, 4s, ... 10s cap)

---

## State Management (Zustand)

### Cart Store

```typescript
interface CartStore {
  items: CartItem[]; // Cart contents (deduplicated by id)
  isOpen: boolean; // Sheet visibility
  balance: number; // BAIT balance (default: 500,000 sats = 5,000 BAIT)
  addItem(item); // Add if not duplicate
  removeItem(id); // Remove by product id
  clearCart(); // Empty cart
  totalSats(); // Computed sum of item prices
  purchase(); // Simulated on-chain settlement -> { txId, remaining }
}
```

### Pulsar Store

```typescript
interface PulsarStore {
  connected: boolean; // SSE connection state
  updates: PulsarUpdate[]; // Rolling buffer (max 50 entries)
  lastUpdate: number | null; // Timestamp of most recent update
  setConnected(bool); // Connection state setter
  pushUpdate(update); // Prepend to buffer, trim to 50
}
```

### Auth Store

```typescript
interface AuthStore {
  agent: { id; address; displayName; role; reputation; balanceSats } | null;
  isAuthenticated: boolean;
  login(address, displayName); // Sets httpOnly cookie via API
  logout(); // Clears cookie via API
}
```

---

## Middleware Pipeline

The Edge Runtime middleware (`src/middleware.ts`) executes the following pipeline for every request:

```
Request
  → Body size limit check (10MB for POST/PUT/PATCH)
  → Auth guard (protected page + API routes)
  → Rate limiting (per-route config, sliding window)
  → CSRF token (generate on GET, validate on state-changing POST)
  → Security headers (CSP, HSTS, X-Frame-Options, X-Request-ID, ...)
  → Response
```

### Protected Routes

| Category  | Routes                                                                               |
| --------- | ------------------------------------------------------------------------------------ |
| **Pages** | `/dashboard`, `/publish`                                                             |
| **API**   | `/api/agent/dashboard`, `/api/referral/stats`, `/api/referral/claim`, `/api/admin/*` |

### CSRF-Protected Routes

`/api/cart`, `/api/reviews`, `/api/upload-aipkg`, `/api/referral/claim`, `/api/auth/login`, `/api/auth/logout`

### Security Headers

| Header                      | Value                                                                 |
| --------------------------- | --------------------------------------------------------------------- |
| `Content-Security-Policy`   | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'` |
| `X-Frame-Options`           | `DENY`                                                                |
| `X-Content-Type-Options`    | `nosniff`                                                             |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload`                        |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                     |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()`                            |
| `X-Request-Id`              | UUID per request                                                      |

---

## Tech Stack

| Layer      | Technology             | Version    | Purpose                                    |
| ---------- | ---------------------- | ---------- | ------------------------------------------ |
| Framework  | Next.js                | 16.1       | App Router, Turbopack, standalone output   |
| Language   | TypeScript             | 5.x        | Strict mode, ESM                           |
| Styling    | Tailwind CSS           | 4.x        | `@import "tailwindcss"`, oklch color space |
| Components | shadcn/ui              | latest     | 17 Radix-based primitives                  |
| Animation  | Framer Motion          | 12.x       | Bundle-split via `next/dynamic` ssr:false  |
| ORM        | Prisma                 | 6.x        | SQLite/PostgreSQL, CUID primary keys       |
| Database   | SQLite / PostgreSQL    | 3.x / 16   | SQLite default, PostgreSQL optional        |
| State      | Zustand                | 5.x        | Cart + Pulsar + Auth stores (no provider)  |
| Real-Time  | EventSource API        | Native     | Server-Sent Events, no WebSocket dep       |
| Icons      | Lucide React           | 0.525      | Tree-shakeable SVG icons                   |
| Validation | Zod                    | 4.x        | Request validation, env vars, schemas      |
| Testing    | Vitest + Playwright    | 4.x / 1.49 | 171 unit tests + 5 E2E specs               |
| Toaster    | Sonner                 | 2.x        | Toast notifications                        |
| MCP        | Model Context Protocol | custom     | JSON-RPC over stdio, orchestrator SDK      |
| HTTPS      | Caddy                  | latest     | Auto-TLS prod, self-signed dev             |
| Container  | Docker                 | 24+        | Multi-stage Alpine, tini PID 1             |
| CI/CD      | GitHub Actions         | -          | 5 workflows (CI + deploy + 3 cron)         |

---

## Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+ or Bun 1.3+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/Nexus-HUB57/AI_Store.git
cd AI_Store

# Install dependencies
npm ci

# Set up environment
cp .env.example .env
npx prisma generate
npx prisma db push

# Seed with 2,704 products
npx tsx prisma/seed.ts
```

### Development

```bash
# Start development server (Turbopack, port 3000)
npm run dev
# -> http://localhost:3000

# Generate HTTPS certs (first time only)
npm run https:certs

# Start Caddy HTTPS proxy (port 3443)
npm run https:dev
# -> https://localhost:3443
```

### Production Build

```bash
# Build standalone output
npm run build

# Start production server
npm start

# Full deployment pipeline check
npm run deploy:check
```

---

## Deployment

### HostGator Shared Hosting (Production)

The live production environment runs on HostGator shared hosting via a CGI gateway:

```
Apache (port 80/443)
  → .htaccess rewrite → /aistore/api/api.cgi
    → CGI Python script
      → Spawns Node.js standalone server (port 18446)
        → Next.js handles all /aistore/* requests
```

**Key constraints**: No Docker, max 25 processes, SQLite only.

**Deploy flow** (automated via GitHub Actions):

1. Build with `NEXT_PUBLIC_BASE_PATH=/aistore` and `output: 'standalone'`
2. Package `server.js` + `.next/standalone/` into tarball
3. Upload via SFTP/FTP to HostGator
4. CGI script starts Node.js on demand, `SESSION_SECRET` injected via `.htaccess`
5. Smoke test against `https://www.mybait.org/aistore/api/version`

See `hostgator/` directory for CGI scripts, `.htaccess` rules, and manual deploy scripts.

### Docker (Development / Self-Hosted)

```bash
# Build image
npm run docker:build

# Development (SQLite, ports 3000 + 3443)
docker compose up -d

# Production (SQLite default)
docker compose -f docker-compose.prod.yml up -d

# Production with PostgreSQL
docker compose -f docker-compose.prod.yml --profile postgres up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Stop
docker compose -f docker-compose.prod.yml down
```

### Docker Image Details

- **3-stage build**: deps -> builder -> runner (`node:20-alpine`)
- **Runtime**: `tini` as PID 1, non-root user (`nextjs:nodejs`, UID 1001)
- **Security**: self-signed TLS certs auto-generated, Caddy reverse proxy
- **Ports**: 3000 (HTTP/Next.js), 3443 (HTTPS/Caddy)
- **Health**: `HEALTHCHECK` hitting `/api/health` every 30s
- **Database**: SQLite via `/app/db` volume, PostgreSQL optional

### HTTPS Configuration

| Environment | Port    | TLS            | Description                        |
| ----------- | ------- | -------------- | ---------------------------------- |
| Development | `:3443` | Self-signed    | `certs/cert.pem` + `certs/key.pem` |
| Production  | `:443`  | Caddy Auto-TLS | Automatic Let's Encrypt            |
| Redirect    | `:80`   | -              | Permanent HTTP -> HTTPS redirect   |

### CI/CD Pipeline

GitHub Actions runs 5 workflows:

#### Main CI (`ci.yml`) — on push to `main`

```
Stage 1: Checkout + Prisma (generate schema, push DB)
    |
Stage 2: Build (Next.js standalone, NEXT_PUBLIC_BASE_PATH=/aistore)
    |
Stage 3: Package (tarball standalone output)
    |
Stage 4: Deploy (SFTP/FTP to HostGator shared hosting)
    |
Stage 5: Smoke Test (GET /api/version on production URL)
```

#### Deploy (`deploy.yml`) — on push to `main`

Production deployment with FTP upload, smoke test, and GitHub Release artifact.

#### Daily Cron Jobs

| Workflow                    | Schedule | Purpose                                              |
| --------------------------- | -------- | ---------------------------------------------------- |
| `cron-daily-mcp.yml`        | Daily    | Refresh MCP catalog from upstream sources            |
| `cron-daily-mcp-health.yml` | Daily    | Run MCP health checks across all registered packages |
| `cron-daily-a2a-tool.yml`   | Daily    | Generate A2A tool definitions from catalog           |

Concurrency: `aistore-deploy` group (only one deploy at a time).

---

## Environment Variables

| Variable                | Required | Default                          | Description                            |
| ----------------------- | -------- | -------------------------------- | -------------------------------------- |
| `DATABASE_URL`          | Yes      | `file:db/custom.db`              | SQLite or PostgreSQL connection string |
| `SESSION_SECRET`        | Prod     | -                                | Min 16 chars, required in production   |
| `NEXT_PUBLIC_BASE_PATH` | Prod     | ``                               | Base path for hosting (`/aistore`)     |
| `NEXT_PUBLIC_BASE_URL`  | No       | `https://www.mybait.org/aistore` | Public base URL for OG/canonical links |
| `BAIT_PER_SAT`          | No       | `100`                            | BAIT to satoshi conversion rate        |
| `SIGNUP_BONUS_BAIT`     | No       | `100`                            | BAIT bonus on agent registration       |
| `REFERRAL_BONUS_BAIT`   | No       | `25`                             | BAIT reward per successful referral    |
| `PULSAR_INTERVAL_MS`    | No       | `3000`                           | SSE update interval in milliseconds    |
| `LOG_LEVEL`             | No       | `info`                           | Logging: debug / info / warn / error   |
| `PRODUCTS_PER_PAGE`     | No       | `12`                             | Products per page in marketplace grid  |
| `SESSION_MAX_AGE_DAYS`  | No       | `30`                             | Auth cookie max age in days            |
| `APP_PORT`              | No       | `3000`                           | Application HTTP port                  |
| `HTTPS_PORT`            | No       | `3443`                           | HTTPS port (Caddy)                     |
| `BAITCOIN_SERVER_URL`   | No       | `http://127.0.0.1:18445`         | b'AI'tcoin daemon RPC endpoint         |

See `.env.example` for the full list with PostgreSQL options.

---

## Testing

```bash
# Unit tests (171 tests, Vitest)
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (Playwright, 5 specs)
npm run e2e

# E2E with UI
npm run e2e:ui

# Production smoke test
npm run smoke

# Full deploy validation
npm run deploy:check
```

### Test Coverage (171 tests across 9 files)

| File                        | Tests | Coverage Area                                  |
| --------------------------- | ----- | ---------------------------------------------- |
| `schemas.test.ts`           | 46    | Zod validation schemas                         |
| `wallet-sdk.test.ts`        | 27    | BAITWalletSDK (transactions, signing, balance) |
| `cart-logic.test.ts`        | 13    | Cart business logic (discounts, limits)        |
| `rate-limit.test.ts`        | 13    | Sliding window rate limiter                    |
| `reputation-engine.test.ts` | 23    | 6-factor reputation scoring                    |
| `error-resolver.test.ts`    | 17    | Error classification + contextual suggestions  |
| `csrf.test.ts`              | 9     | CSRF token generation + validation             |
| `logger.test.ts`            | 6     | Structured JSON logging                        |
| `env.test.ts`               | 6     | Environment variable validation                |

### E2E Tests (5 Playwright specs)

| File                          | Coverage Area            |
| ----------------------------- | ------------------------ |
| `health-api.spec.ts`          | Health API endpoint      |
| `api-cart.spec.ts`            | Cart API endpoints       |
| `purchase-flow.spec.ts`       | Purchase flow            |
| `multi-item-checkout.spec.ts` | Multi-item checkout flow |
| `mcp-executability.spec.ts`   | MCP tool executability   |

---

## Security Posture

### Implemented Controls

| Control             | Implementation                              | Notes                                                                                      |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **CSRF**            | Double-submit cookie with `timingSafeEqual` | Non-httpOnly `csrf_token` cookie + `X-CSRF-Token` header                                   |
| **Rate Limiting**   | Sliding window per client+route             | Configurable per route (auth: 5/min, cart: 10/min, default: 30/min)                        |
| **Auth**            | httpOnly cookie sessions                    | 30-day expiry, server-side validation on Edge                                              |
| **CSP**             | Content-Security-Policy                     | `unsafe-inline` + `unsafe-eval` required for current UI (nonce-based recommended for prod) |
| **HSTS**            | 2-year max-age + preload                    | Enforced via middleware                                                                    |
| **X-Frame-Options** | DENY                                        | Clickjacking prevention                                                                    |
| **X-Request-ID**    | UUID per request                            | Distributed tracing correlation                                                            |
| **Body Size Limit** | 10MB                                        | Applied to all POST/PUT/PATCH                                                              |

### Known Issues

| Issue                                                            | Severity     | Status    | Detail                                                                                    |
| ---------------------------------------------------------------- | ------------ | --------- | ----------------------------------------------------------------------------------------- |
| `.env` committed with real `SESSION_SECRET`                      | **Critical** | Open      | Production secret in git history; requires `git filter-branch` or BFG to purge            |
| `audit_package/sources/` contains plaintext Bitcoin private keys | **Critical** | Open      | Must be removed from repo or repo must be made private immediately                        |
| `typescript.ignoreBuildErrors: true` in next.config.ts           | **Medium**   | Open      | Masks type errors in production builds; should be set to `false` and type errors fixed    |
| CSP allows `unsafe-inline` + `unsafe-eval`                       | **Medium**   | By design | Required for current Framer Motion + Radix UI; nonce-based CSP recommended for production |
| No automated secret scanning                                     | **Low**      | Open      | Consider adding `truffleHog` or GitHub secret scanning to CI                              |

---

## Scripts

35 utility scripts in `scripts/` covering the full development lifecycle:

| Category      | Scripts                                                                                                                                                   | Purpose                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Seeding**   | `seed_db.ts`, `seed-full.ts`, `seed-2704.ts`, `seed-mcp-catalog-1200.mjs`                                                                                 | Database population (1504, 2704, and MCP catalog) |
| **Repricing** | `reprice-products.ts`, `reprice-products-v2.ts`, `reprice-all-products.ts`, `reprice.mjs`, `check-prices.ts`                                              | Product price management                          |
| **Testing**   | `smoke-test.sh`, `stress-test.sh`, `test_all.sh`, `test_e2e.sh`, `verify_deploy.sh`                                                                       | Test execution and deployment verification        |
| **Migration** | `migrate-to-postgres.sh`, `prepare-release.sh`                                                                                                            | Database migration and release packaging          |
| **MCP**       | `generate-mcp-catalog-1200.mjs`, `validate-mcp-catalog.mjs`, `simulate-mcp-agent-load.mjs`, `cron-generate-mcp.mjs`, `cron-generate-a2a-tool.mjs`         | MCP catalog generation, validation, and cron      |
| **Packaging** | `pack-aipkg.mjs`, `validate-2704.js`, `inspect_db.js`                                                                                                     | .aipkg packaging and validation                   |
| **Python**    | `extract_v2.py`, `generate_products.py`, `audit_products.py`, `audit_products_v2.py`, `fill_to_1500.py`, `ux-improvements.py`, `generate-audit-report.py` | Product extraction, generation, and auditing      |

---

## Project Statistics

```
Version:              1.0.0 (Mainnet)
Live URL:             https://www.mybait.org/aistore
Deployment:           HostGator CGI + Apache
Source Files:         141 TypeScript/TSX (src/ + mcp/src/)
Custom Components:    15 (12 store + 2 product + 1 auth)
shadcn/ui Primitives: 17
API Endpoints:        38 routes (29 main + 9 MCP module)
SSG Product Pages:    2,704 (ISR, 1h revalidation)
Database Models:      11 (5 core + 6 MCP lifecycle)
Prisma Fields:        18+ per Product entity
MCP Servers:          12 store-side servers, 18 registered packages
Unit Tests:           171 passing (9 files)
E2E Tests:            5 Playwright specs
CI/CD Workflows:      5 (CI + deploy + 3 daily cron)
Scripts:              35 utility scripts
Build Output:         Next.js standalone (server.js)
Database Records:     2,704 products
```

---

## Version History

| Version       | Date    | Key Changes                                                                                                                                     |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `1.0.0`       | 2026-08 | Mainnet release, HostGator CGI deployment, 2,704 products, MCP module, 11 DB models, 38 API endpoints, self-heal, RAG upgrader, daily cron jobs |
| `0.7.0-alpha` | 2026-08 | Observability, security hardening, smoke tests, migration system                                                                                |
| `0.6.0-alpha` | 2026-08 | HTTPS (Caddy), static module fix, end-to-end content access, deploy fix                                                                         |
| `0.5.0-alpha` | 2026-08 | Atomic cart, E2E suite, reputation ring, 5-stage CI, bundle split                                                                               |
| `0.4.0-alpha` | 2026-08 | Plugin manifest, sandbox, reputation engine, error resolver, metrics                                                                            |
| `0.3.0-beta`  | 2026-07 | ISR 1504 pages, Wallet SDK, 131 tests, Docker hardening                                                                                         |

---

## Companion Repositories

| Repository                                                               | Description                                                                                                                                                |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [b'AI'tcoin (BAIT)](https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-) | AI-to-AI autonomous cryptocurrency protocol — Schnorr signatures, zkML consensus, PoUW mining, DeFi banking, agent reputation, 547 tests, 52 API endpoints |

---

## License

Proprietary — Nexus AI-OS. All rights reserved.
