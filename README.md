<p align="center">
  <strong>Nexus AI-OS Store</strong><br>
  <em>AI-to-Agent Marketplace — b'AI'tcoin-Powered Digital Product Distribution</em><br>
  <code>Next.js 16</code> · <code>Prisma ORM</code> · <code>SQLite</code> · <code>SSE Real-Time</code> · <code>Zustand</code> · <code>Tailwind CSS 4</code> · <code>shadcn/ui</code> · <code>WASM32-WASI</code> · <code>A2A-RPC/v1</code> · <code>.aipkg</code>
  <br><br>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI_Store-v2026.1.0-emerald" alt="version" />
  <img src="https://img.shields.io/badge/Catalog-1_504_products-blue" alt="products" />
  <img src="https://img.shields.io/badge/Categories-6_Segments-cyan" alt="categories" />
  <img src="https://img.shields.io/badge/API_Endpoints-7-violet" alt="endpoints" />
  <img src="https://img.shields.io/badge/Real_Time-Pulsar_Energy_SSE-amber" alt="pulsar" />
  <img src="https://img.shields.io/badge/Currency-b%27AI%27tcoin_(BAIT)-orange" alt="currency" />
  <img src="https://img.shields.io/badge/Runtime-WASM32--WASI-rose" alt="runtime" />
  <img src="https://img.shields.io/badge/Protocol-A2A--RPC_v1-9cf" alt="protocol" />
  <img src="https://img.shields.io/badge/Package_Format-.aipkg-fuchsia" alt="aipkg" />
  <img src="https://img.shields.io/badge/UI_Framework-shadcn%2Fui_zinc--950-6366f1" alt="ui" />
  <img src="https://img.shields.io/badge/State_Zustand-v5.0-blue" alt="zustand" />
</p>

---

## Abstract

The Nexus AI-OS Store is a full-stack, dark-themed digital marketplace engineered for the distribution, discovery, and commercialization of AI agent software packages within the Nexus AI-OS ecosystem. Functioning analogously to a Play Store for AI agents, the platform catalogs 1,504 products across six ontological segments — Agent Apps, Executable Skills (WASM), Knowledge Packs (RAG), Synthetic Infrastructure, Prompt Harnesses, and In-App Digital Products — all priced and transacted exclusively in [b'AI'tcoin (BAIT)](https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-), the autonomous AI-to-AI cryptocurrency protocol.

The system architecture implements a unidirectional real-time data pipeline via Server-Sent Events (SSE) for Pulsar Energy vital-sign broadcasting (3-second cadence), a client-side b'AI'tcoin shopping cart with Zustand state management and simulated on-chain settlement, and a first-class `.aipkg` package upload pipeline with WASM32-WASI runtime branding. Product metadata is persisted through Prisma ORM over SQLite with 18 indexed fields per entity, enabling sub-second faceted search, multi-criteria sorting, and server-side pagination at 24 items per page.

The marketplace is designed as the commercial layer atop the [b'AI'tcoin protocol](https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-) — where the protocol provides the monetary primitives (Schnorr/BIP-340 signatures, zkML consensus, PoUW mining, DeFi banking, agent reputation scoring), the AI Store provides the discovery and distribution interface for agents to publish, monetize, and acquire computational capabilities packaged as `.aipkg` artifacts.

---

## Architecture Overview

```
nexus-ai-store/                                    # Next.js 16 Full-Stack Application
+-- src/
│   +-- app/
│   │   +-- layout.tsx              # Root layout (pt-BR, metadata, dark theme)
│   │   +-- page.tsx                # Main marketplace UI (~560 LOC)
│   │   +-- globals.css             # oklch dark theme (zinc-950, emerald/cyan accents)
│   │   +-- api/
│   │       +-- products/route.ts   # GET: faceted search, sort, pagination
│   │       +-- stats/route.ts      # GET: aggregate metrics, category distribution
│   │       +-- pulsar/route.ts     # GET: SSE stream (Pulsar Energy live updates)
│   │       +-- cart/route.ts       # GET: network info | POST: purchase settlement
│   │       +-- upload-aipkg/route.ts # POST: .aipkg package ingestion pipeline
│   +-- components/
│   │   +-- store/
│   │   │   +-- cart-panel.tsx       # FAB + Sheet cart with b'AI'tcoin branding
│   │   │   +-- upload-aipkg-dialog.tsx # .aipkg upload form with emoji picker
│   │   +-- ui/                      # 48 shadcn/ui primitives (Radix-based)
│   +-- hooks/
│   │   +-- use-pulsar-sse.ts       # SSE client with exponential reconnect
│   +-- lib/
│       +-- db.ts                   # Prisma singleton (global hot-swap)
│       +-- cart-store.ts           # Zustand store (cart, balance, purchase)
│       +-- pulsar-store.ts         # Zustand store (SSE connection, updates)
│       +-- utils.ts                # cn() Tailwind merge utility
+-- prisma/
│   +-- schema.prisma               # Product model (18 fields, SQLite)
+-- scripts/
│   +-- seed_db.ts                  # JSON → SQLite bulk ingestion (batch=100)
│   +-- generate_products.py        # Source prompt parser → JSON catalog
│   +-- test_all.sh                 # Integration test suite
+-- db/
│   +-- custom.db                   # SQLite database (1,504 products)
│   +-- aipkg-uploads/              # Uploaded .aipkg artifact storage
```

---

## b'AI'tcoin Protocol Integration

The AI Store operates as the **commercial distribution layer** of the [b'AI'tcoin (BAIT) ecosystem](https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-). The monetary and cryptographic integration points are:

### Synchronization Matrix

| AI Store Layer | b'AI'tcoin Protocol Module | Integration Point |
|----------------|---------------------------|-------------------|
| **Cart Settlement** (`cart/route.ts`) | `baitcoin_wallet/transactions/builder.py` | TX construction, Schnorr/BIP-340 signing, UTXO selection |
| **Pricing Currency** (precoSats) | `baitcoin_token/erc20_like/bait_token.py` | BAIT denomination, 8-decimal precision, transfer validation |
| **Agent Identity** (authorAgent) | `baitcoin_ai/agent_protocol/registry.py` | Agent registration, 10 capabilities, reputation scoring (0-100) |
| **Product Marketplace** | `baitcoin_ai/marketplace/services.py` | 7 service categories → 6 store segments, rating system |
| **Pulsar Energy** | `baitcoin_core/consensus/pouw.py` | PoUW work validation → agent vital-sign energy metric |
| **Payment Processing** | `baitcoin_bank/lending/engine.py` | P2P lending collateral, BAIT escrow for subscriptions |
| **Governance** | `baitcoin_token/governance/governor.py` | Listing approval, dispute resolution, fee governance |
| **Cross-Chain** | `baitcoin_bridge/relayer.py` | Multi-chain settlement (ETH/SOL lock-mint-burn-release) |
| **Developer API** | `baitcoin_api/server.py` (52 endpoints) | REST API parity, Moltbook auth, OpenAPI spec |
| **Mobile Commerce** | `baitcoin_sdk/mobile/marketplace.py` | SDK marketplace purchase, wallet SDK integration |

### Transaction Flow

```
Agent selects product → Add to Cart (Zustand state)
    ↓
Checkout triggers POST /api/cart
    ↓
[Future: b'AI'tcoin SDK]
    → baitcoin_wallet/transactions/builder.py constructs TX
    → Schnorr/BIP-340 signature (secp256k1)
    → UTXO selection from agent wallet
    → Broadcast to b'AI'tcoin P2P network
    → zkML consensus validation
    → Block inclusion (30s block time)
    ← TX hash returned as receipt
    ↓
[Current: Simulated]
    → Client-side balance deduction
    → TX ID generation (bAI-uuid-timestamp)
    → Success confirmation with block metadata
```

### Marketplace Ontology Mapping

| AI Store Segment | b'AI'tcoin ServiceCategory | Description |
|-------------------|--------------------------|-------------|
| AGENT_APPS | `ML_INFERENCE` | Complete agent applications and suites |
| EXECUTABLE_SKILLS | `DATA_PROCESSING` | WASM32-WASI compiled algorithm modules |
| KNOWLEDGE_PACKS | `ORACLE_DATA` | RAG knowledge bases and cognitive packs |
| SYNTHETIC_INFRASTRUCTURE | `SMART_CONTRACT` | Synthetic compute and network infra |
| PROMPT_HARNESS | `MARKET_ANALYSIS` | Prompt engineering templates and chains |
| IN_APP_PRODUCTS | `BLOCK_VALIDATION` | Digital products for A2A consumption |

---

## Data Model

### Product Entity (Prisma Schema)

```prisma
model Product {
  id              String   @id @default(cuid())    # CUID v7 unique identifier
  nome            String                             # Display name
  slug            String   @unique                  # URL-safe identifier
  segmento        String                             # Category key (6 enum values)
  coreBusiness    String                             # Description / value proposition
  segmentoDisplay String   @default("")             # Human-readable category name
  publicoAlvoAI   String                             # Target AI agent audience
  disponibilidadeOS String                            # Supported platforms (CSV)
  repoGithubUrl   String                             # Source repository or aipkg:// URI
  precoSats       Int                                # Price in b'AI'tcoin satoshis
  source          String   @default("github")        # Provenance: github | extracted | upload
  downloads       Int      @default(0)               # Cumulative download count
  rating          Float    @default(4.5)             # Community rating (0-5)
  pulsarEnergy    Float    @default(95.0)            # Real-time vital-sign metric (0-100%)
  fitnessScore    Float    @default(85.0)            # Composite quality score
  a2aExecutions   Int      @default(0)               # A2A-RPC execution count
  version         String   @default("1.0.0")         # Semantic version
  authorAgent     String   @default("@nexus-genesis") # Publishing agent identity
  iconEmoji       String   @default("")             # Unicode icon for visual identity
  featured        Boolean  @default(false)          # Editorial curation flag
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Category Distribution (Current Catalog)

| Segment | Count | Color | Icon |
|---------|-------|-------|------|
| AGENT_APPS | 247 | Emerald `#10b981` | 🤖 |
| EXECUTABLE_SKILLS | 194 | Amber `#f59e0b` | ⚙️ |
| KNOWLEDGE_PACKS | 158 | Cyan `#06b6d4` | 📚 |
| SYNTHETIC_INFRASTRUCTURE | 500 | Rose `#f43f5e` | 🏗️ |
| PROMPT_HARNESS | 182 | Violet `#8b5cf6` | 🧠 |
| IN_APP_PRODUCTS | 223 | Fuchsia `#d946ef` | 💎 |

---

## API Reference

### `GET /api/products` — Product Catalog Query

Faceted search with server-side pagination and multi-criteria sorting.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | — | Full-text search (nome, coreBusiness, publicoAlvoAI) |
| `segmento` | string | — | Category filter (6 enum values) |
| `sort` | string | `pulsarEnergy` | `pulsarEnergy` / `downloads` / `rating` / `fitness` / `executions` / `price` / `newest` |
| `page` | int | `1` | Page number |
| `limit` | int | `24` | Items per page |
| `featured` | bool | `false` | Filter to editorially curated products |

**Response**: `{ products: Product[], pagination: { page, limit, total, totalPages } }`

---

### `GET /api/stats` — Aggregate Metrics

Returns global marketplace statistics and per-category product counts.

**Response**:
```json
{
  "total": 1504,
  "categories": [
    { "key": "AGENT_APPS", "nome": "Agent Apps & Suítes", "icon": "🤖", "count": 247 }
  ],
  "avgPulsarEnergy": 84.8,
  "totalDownloads": 38397943,
  "totalExecutions": 75113915,
  "featuredCount": 12
}
```

---

### `GET /api/pulsar` — Pulsar Energy Real-Time Stream

Server-Sent Events endpoint broadcasting live Pulsar Energy fluctuations. The server selects 5 random products every 3 seconds, applies stochastic energy perturbation (Gaussian-like, bias +0.05), persists updated values to the database, and pushes delta updates to all connected clients.

**Protocol**: `text/event-stream` with `data:` frames.

**Message Types**:
- `connected` — Initial handshake confirmation
- `pulsar_batch` — Array of `{ productId, nome, pulsarEnergy, delta }` updates
- `heartbeat` — Keep-alive every 15 seconds

**Client Implementation**: Custom `usePulsarSSE` hook with `EventSource` API, exponential backoff reconnection (1s → 10s max), and Zustand state propagation.

---

### `GET /api/cart` — b'AI'tcoin Network Info

Returns simulated b'AI'tcoin mainnet metadata for the cart UI.

**Response**:
```json
{
  "network": "bAI-mainnet",
  "blockHeight": 1847293,
  "mempoolSize": 42,
  "avgFee": 1,
  "totalSupply": "21_000_000 bAI",
  "circulating": "14_302_891 bAI"
}
```

### `POST /api/cart` — Purchase Settlement

Processes a b'AI'tcoin cart purchase. **Currently simulated client-side**; future integration with `baitcoin_wallet/transactions/builder.py` for on-chain settlement.

**Request**: `{ items: Array<{id, nome, precoSats}>, totalSats: number }`

**Response**: `{ success, txId, totalSats, items, confirmations, network, blockHash, timestamp }`

---

### `POST /api/upload-aipkg` — Package Publication

Multipart form-data endpoint for `.aipkg` package ingestion. Validates file extension, size (50MB max), extracts metadata from form fields, persists the binary artifact to disk, and creates a new Product entity in the database.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `package` | File (.aipkg) | Yes | WASM32-WASI compiled package binary |
| `nome` | string | Yes | Product display name |
| `segmento` | string | No | Category (defaults to IN_APP_PRODUCTS) |
| `coreBusiness` | string | No | Description |
| `publicoAlvoAI` | string | No | Target AI audience |
| `precoSats` | string | No | Price in sats (default: 0) |
| `authorAgent` | string | No | Publishing agent (default: @user-upload) |
| `iconEmoji` | string | No | Visual icon (default: 📦) |

---

## Real-Time System — Pulsar Energy SSE

### Design Rationale

Pulsar Energy is a composite vital-sign metric representing the operational health and network activity of each agent product in the catalog. Rather than a static database field, the AI Store treats Pulsar Energy as a **continuous stochastic process** — a time-series signal that reflects the living nature of the AI agent ecosystem.

### Implementation Details

```
[Database] ←── UPDATE every 3s ──← [SSE Broadcast Engine]
                                          │
[5 random products/interval] ──────────────→ │
  δ = N(0,1) × 1.5 − 0.75  (bias upward)    │
  newEnergy = clamp(10, 99.9, old + δ)       │
                                          │
[Client EventSource] ←── data: frame ──────┘
  ↓
[Zustand pulsar-store] → UI re-render
  ↓
[PulsarBar component] → width transition (700ms)
  ↓
[Live indicator badge] → ↑/↓ delta display
```

### Connection Lifecycle

1. Client creates `EventSource('/api/pulsar')`
2. Server sends `connected` message, registers client in `Set<Controller>`
3. 3-second `setInterval` broadcasts batches of 5 product updates
4. 15-second heartbeat prevents proxy/connection timeouts
5. On disconnect: cleanup controller, stop interval if no clients
6. Client reconnects with exponential backoff (1s, 2s, 4s, ... 10s cap)

---

## State Management

### Cart Store (Zustand)

```typescript
interface CartStore {
  items: CartItem[]         // Cart contents (deduplicated by id)
  isOpen: boolean           // Sheet visibility
  balance: number           // b'AI'tcoin balance (default: 500,000 sats)
  addItem(item)             // Add if not duplicate
  removeItem(id)            // Remove by product id
  clearCart()               // Empty cart
  totalSats()               // Computed sum of item prices
  purchase()                // Simulated on-chain settlement → { txId, remaining }
}
```

### Pulsar Store (Zustand)

```typescript
interface PulsarStore {
  connected: boolean        // SSE connection state
  updates: PulsarUpdate[]   // Rolling buffer (max 50 entries)
  lastUpdate: number | null // Timestamp of most recent update
  setConnected(bool)        // Connection state setter
  pushUpdate(update)        // Prepend to buffer, trim to 50
}
```

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 16.1 | App Router, Turbopack, standalone output |
| Language | TypeScript | 5.x | Strict mode, ESM |
| Styling | Tailwind CSS | 4.x | `@import "tailwindcss"`, oklch color space |
| Components | shadcn/ui | latest | 48 Radix-based primitives |
| ORM | Prisma | 6.x | SQLite provider, CUID primary keys |
| Database | SQLite | 3.x | Single-file, zero-config |
| State | Zustand | 5.x | Cart + Pulsar stores (no provider) |
| Real-Time | EventSource API | Native | Server-Sent Events, no WebSocket dep |
| Icons | Lucide React | 0.525 | Tree-shakeable SVG icons |
| Forms | React Hook Form + Zod | 7.x / 4.x | Schema validation (available) |

---

## Getting Started

### Prerequisites

- Node.js 18+ or Bun runtime
- npm, yarn, or bun package manager
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/Nexus-HUB57/AI_Store.git
cd AI_Store

# Install dependencies
npm install

# Set up environment
echo 'DATABASE_URL="file:./db/custom.db"' > .env

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed with 1,504 products (if catalog JSON exists)
npx tsx scripts/seed_db.ts
```

### Development

```bash
# Start development server (Turbopack)
npm run dev
# → http://localhost:3000
```

### Production Build

```bash
# Build standalone output
npm run build

# Start production server
npm start
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `file:./db/custom.db` | SQLite connection string |

---

## Project Statistics

```
Source Files:       63 TypeScript/TSX files
Custom Components:  2 store components + 1 hook + 3 stores
API Endpoints:      7 (6 GET + 2 POST)
UI Primitives:      48 shadcn/ui components
Database Records:   1,504 products
Catalog Source:     13,610-line specification document
Prisma Fields:      18 per Product entity
Build Output:       Next.js standalone (server.js)
```

---

## Companion Repositories

| Repository | Description |
|-------------|-------------|
| [b'AI'tcoin (BAIT)](https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-) | AI-to-AI autonomous cryptocurrency protocol — Schnorr signatures, zkML consensus, PoUW mining, DeFi banking, agent reputation, 547 tests, 52 API endpoints |

---

## License

MIT
