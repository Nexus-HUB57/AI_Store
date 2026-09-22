# Nexus AI-OS Store — MCP Integration

> **The 7th catalog segment.** Model Context Protocol servers, distributed as
> `.aipkg` packages — installable with one click, runnable by any agent that
> speaks MCP.

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

## Agent acquisition flow

This module is the **acquisition surface** for the 7th catalog segment. An Agent
visits the store, picks an MCP, and **acquires** it — that installs the
`McpPackage` into the Agent's toolbox and spawns the MCP server behind the
orchestrator. Three REST endpoints drive the flow:

```
POST   /api/mcp/[name]/install   # agent acquires an MCP
DELETE /api/mcp/[name]/install   # agent releases an MCP
GET    /api/mcp/[name]           # inspect detail + runtime status
GET    /api/mcp/health           # orchestrator snapshot
```

### Catalog → detail → acquire

1. **Browse** — `/aistore/mcp` renders the catalog grouped by category (oracle,
   defi, bridge, …). Each card links to `/aistore/mcp/[name]`.
2. **Detail** — `/aistore/mcp/[name]` shows the manifest, declared tools,
   capabilities, runtime status, and the **AcquireButton**.
3. **Acquire** — clicking Acquire POSTs `/api/mcp/[name]/install`. The server:
   - Upserts an `McpInstall` row keyed by `(packageId, agentId)`
   - Spawns the MCP subprocess via `McpOrchestrator.install(manifest)`
   - Bumps the `McpPackage.downloads` counter
   - Returns `{ ok, installId, spawned, spawnError }`
4. **Release** — DELETE `/api/mcp/[name]/install` removes the install row and
   stops the subprocess once no other agent has the MCP installed.

### Seed the catalog

The catalog starts empty after a fresh `prisma migrate`. Populate it from both
repos with:

```bash
npm run mcp:seed
# tsx prisma/seed-mcp.ts
```

This reads:

- `b-AI-tcoin/mcp/servers/<name>/manifest.json` for the 11 Python MCPs
- `mcp/src/servers/<name>/server.ts` (presence check + inline metadata) for
  the 6 TS MCPs

…and writes 17 `McpPackage` rows with full manifests, tool catalogs, and
pricings. Idempotent — skips if McpPackage is non-empty.

### Runtime hydration

On Next.js boot, `src/instrumentation.ts` calls
`hydrateFromPrisma(prisma)`, which spawns every enabled MCP subprocess through
the orchestrator. After hydration, the first agent install on a given MCP is
fast (the process is already alive).

### Sandbox / production note

The Python MCPs spawn via `python -m servers.<name>.server` and need the
b'AI'tcoin repo on the import path. The TS MCPs spawn via
`bun run mcp/src/servers/<name>/server.ts` — `bun` must be on `PATH` in
production. The bundler-agnostic `tsx`/`node` fallback is not bundled into the
current `.aipkg` manifests; if you can't install `bun`, edit the `command`
field in each `mcp/src/servers/<name>/...` and re-pack.

---

## License

MIT © Nexus-HUB57 — Nexus AI-OS ecosystem.