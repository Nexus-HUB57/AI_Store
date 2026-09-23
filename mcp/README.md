# Nexus AI-OS Store — MCP Integration

> **The 7th catalog segment.** Model Context Protocol servers, distributed as
> `.aipkg` packages — installable with one click, runnable by any agent that
> speaks MCP.

## Production status

| Metric | Value |
|--------|-------|
| **Total MCPs (AI Store side)** | **6** |
| **Total MCPs (cross-repo)**    | **1234** (6 here + 1228 in `b-AI-tcoin-AI-to-AI-`) |
| **Categories rendered**        | 67 baitcoin-side + 6 store-side on `/aistore/mcp` |
| **Total tools seeded**          | **5709** |
| **Waves**                      | Wave 1 (6 store MCPs + runtime) + Wave 2-6 (catalog scaled) |
| **Branches (preserved)**       | `feat/mcp-integration` (Wave 1), `feat/mcp-wave2` (Wave 2), `feat/mcp-portfolio-seeding` (scaled + seeding toolchain) |
| **Open PRs**                   | [#3 closed](https://github.com/Nexus-HUB57/AI_Store/pull/3) (Wave 1), [#4 open](https://github.com/Nexus-HUB57/AI_Store/pull/4) (Wave 2), [#6 open](https://github.com/Nexus-HUB57/AI_Store/pull/6) (scaled seeding) |
| **Spec**                       | [MCP 2024-11-05](https://modelcontextprotocol.io/specification/2024-11-05) |

This module adds a complete MCP runtime to the AI Store:

- **Runtime** (TS) — spawns MCPs as stdio subprocesses, tracks their lifecycle, calls tools
- **Registry** — durable catalog of installed MCPs (JSON-file + Prisma mirror)
- **Telemetry** — every `tools/call` is captured, batched, flushed to Pulsar + RAG inbox
- **Self-heal** — orchestrator auto-restarts MCPs that fail repeatedly with exponential backoff
- **Catalog page** — `/aistore/mcp` renders MCPs as a native segment of the store

## Architecture

```
Browser / Agent Host
       │
       ▼
Next.js routes (/api/mcp, /aistore/mcp)
       │
       ▼
McpOrchestrator  ──►  McpClient  ──►  MCP server (stdio JSON-RPC 2.0)
       │                  ▲
       │                  │
       ├─► Registry       ├─► Telemetry ─► Pulsar SSE + RAG inbox
       │
       └─► Self-heal ─────► restart on consecutive failures
```

## SDK

| File | Purpose |
|------|---------|
| `src/lib/mcp/types.ts`      | Typed primitives (Tool, Resource, Prompt, Content, AipkgMcpManifest) |
| `src/lib/mcp/server.ts`     | Reference MCP server (Node stdio) |
| `src/lib/mcp/client.ts`     | MCP client (spawns child, JSON-RPC over stdio) |
| `src/lib/mcp/orchestrator.ts` | Lifecycle manager (install / start / call / restart / heal) |
| `src/lib/mcp/registry.ts`   | JSON-file registry |
| `src/lib/mcp/telemetry.ts`  | Async-safe event recorder with multi-sink flush |
| `src/lib/mcp/runtime.ts`    | Next.js singleton |

## The 6 store-side MCPs

| MCP | Tools |
|-----|-------|
| `mcp-catalog`    | `search_products`, `get_product`, `list_categories`, `top_rated`, `recommend_for_agent` |
| `mcp-publisher`  | `upload_aipkg`, `deprecate_listing`, `bump_version`, `listing_health` |
| `mcp-pulsar`     | `current_snapshot`, `subscribe` |
| `mcp-reviews`    | `list_reviews`, `post_review`, `mark_helpful`, `rating_summary` |
| `mcp-referral`   | `lookup_by_code`, `claim_reward`, `pending_rewards`, `register_referral`, `leaderboard` |
| `mcp-agent-auth` | `login`, `whoami`, `attest_capabilities`, `logout`, `reputation` |

## Cross-repo portfolio (with b'AI'tcoin)

| Side | MCPs |
|------|------|
| b'AI'tcoin (Python) | 1228 (Wave 1+2 core 28 + Wave 3 verticals 750 + Wave 4 providers 250 + Wave 5 tiers 100 + Wave 6 regions 100) |
| AI Store (TS)       | 6 (catalog, publisher, pulsar, reviews, referral, agent-auth) |
| **Total**           | **1234 MCPs** distributed as `.aipkg` (1228) + TS (6) |

Plus **1504 legacy products** in the AI Store (WASM32-WASI `.aipkg`, not MCPs).

After the open PRs are merged, total catalog = **2738 products** (1504 + 1234).

Categories rendered on `/aistore/mcp`: 67 server-side + 6 store-side. The
full list grows organically as Wave 3-6 categories arrive (`healthcare-core`,
`openai-completions`, `lite-cron`, `us-gdpr-dpo`, ...).

## API surface

```
GET    /api/mcp                       # list MCP packages (filter by category, q, featured)
POST   /api/mcp                       # install an MCP from a manifest
GET    /api/mcp/[name]                # detail + running state
DELETE /api/mcp/[name]                # uninstall
PATCH  /api/mcp/[name]                # toggle enabled / featured / verified
GET    /api/mcp/[name]/tools          # discovered tools
POST   /api/mcp/[name]/tools          # register a discovered tool
POST   /api/mcp/[name]/call           # call a tool (live process)
GET    /api/mcp/health                # orchestrator health snapshot
```

## Schema additions

The Prisma schema gains 6 models:

```mcp
McpPackage          // catalog entry (1 row per .aipkg)
McpInstall          // per-agent install record
McpTool             // discovered tool of an installed MCP
McpCall             // telemetry row per tools/call
McpSelfHealEvent    // restart / backoff events
McpRagFeedback      // signals feeding the RAG upgrader
```

Apply:

```bash
npm run db:push       # dev
npm run db:migrate    # prod
```

## Catalog page

`/aistore/mcp` — renders MCPs grouped by category with native store styling.

The page is wired into the same `Product` catalog by querying
`McpPackage` and presenting them in 7 categories (`oracle`, `defi`,
`bridge`, `faucet`, `agent-registry`, `marketplace`, `agentic-awareness`,
`catalog`, `publisher`, `pulsar`, `reviews`, `referral`, `agent-auth`,
`telemetry`, `rag-upgrader`, `skill-evolver`, `self-heal`,
`agentic-awareness`).

## End-to-end test

```bash
npm run mcp:test    # bun run mcp/tests/e2e.mjs
```

Spawns `mcp-catalog`, runs the full handshake, calls 5 tools, reads a
resource, then exits with `✅ END-TO-END OK`.

## Build & distribute

```bash
npm run mcp:pack    # node scripts/pack-aipkg.mjs <mcp-name>
```

Produces `<mcp-name>-<version>.aipkg` containing:

- `manifest.json`
- `server/*.ts`
- `checksum.sha256`

The packager is generic — works for both the store-side MCPs (TS) and the
baitcoin-side MCPs (Python) when pointed at the right root.

## Cross-repo portfolio

Together with the b'AI'tcoin repo's `mcp/` folder, the total portfolio is:

| Side | MCPs |
|------|------|
| b'AI'tcoin (Python) | oracle, defi, bridge, faucet, agent-registry, marketplace, telemetry, rag-upgrader, skill-evolver, self-heal, agentic-awareness |
| AI Store (TS)       | catalog, publisher, pulsar, reviews, referral, agent-auth |
| **Total**           | **17 MCPs** distributed as `.aipkg` |

---

## License

MIT © Nexus-HUB57 — Nexus AI-OS ecosystem.