# MCP Portfolio Seeding — AI Store

> **Populate the AI Store's Prisma database with the full 34-MCP portfolio.**

This folder ships everything you need to go from **empty DB** → **full catalog** in
one command.

## What's in here

```
scripts/mcp/
├── README.md                  ← you are here
├── generate-seed.mjs          ← node script that emits JSON + SQL
├── build-portfolio-aipkgs.py  ← builds and verifies all 34 .aipkg archives
├── pricing-policy.json         ← category prices in BAIT
├── install-portfolio.sh       ← one-shot installer
└── seed/
    ├── mcp_portfolio.json     ← generated: full portfolio metadata
    └── populate.sql           ← generated: idempotent INSERT OR IGNORE
```

## Quick start

```bash
# 1. (first time only) generate the seed from the baitcoin portfolio
node scripts/mcp/generate-seed.mjs

# 2. apply schema + seed
npm run db:push
bash scripts/mcp/install-portfolio.sh

# 3. build and verify executable MCP package archives
python3 scripts/mcp/build-portfolio-aipkgs.py --clean
```

## What gets installed

- **28 baitcoin-side MCPs** — read from `mcp/dist/portfolio.json` or the committed `mcp/seed/portfolio-cross-repo.json` fallback
- **6 store-side MCPs** — bundled directly in `generate-seed.mjs`
- **Discovered tools** for every MCP (one `McpTool` row per tool)
- **Ratings, pulsar energy, fitness scores, verified flags** — seeded with sane defaults

After install, `McpPackage` has 34 rows and `McpTool` has 199 rows.

## Where to point it

By default, `generate-seed.mjs` looks for the sibling baitcoin repo at
`../b-AI-tcoin-AI-to-AI`. It no longer depends on a machine-specific
`/workspace` path.
Override with:

```bash
node scripts/mcp/generate-seed.mjs --baitcoin-root /path/to/b-AI-tcoin-AI-to-AI
```

## Pricing units

The database fields `priceSats` and `pricePerCallSats` are integer amounts in
the project's smallest BAIT unit. The store conversion is **100 sats = 1
BAIT**. A value of `0` means that the MCP is explicitly free, not that its
price is missing. The current 34-MCP portfolio seed applies the category
prices in `pricing-policy.json`; the E2E audit reports paid and free counts
separately.

## Database resolution

The installer looks for SQLite at (in order):

1. `$DATABASE_URL` env var (if it's a file path)
2. `db/custom.db`
3. `prisma/custom.db`
4. `db/dev.db`

Override with:

```bash
DATABASE_URL=/path/to/db.sqlite bash scripts/mcp/install-portfolio.sh
```

## Idempotency

Uses `INSERT OR IGNORE` everywhere — safe to re-run after schema migrations,
after adding new MCPs, or after partial failures. Existing rows are preserved.

## Verification

```bash
sqlite3 db/custom.db "SELECT COUNT(*) FROM McpPackage;"
sqlite3 db/custom.db "SELECT category, COUNT(*) FROM McpPackage GROUP BY category;"
curl -s http://localhost:3000/api/mcp | jq '.total'
```

## Regenerate after MCP updates

When the baitcoin side publishes new MCPs (Wave 3+, etc.):

```bash
# in baitcoin repo: rebuild the portfolio
python scripts/build_all_manifests.py --out dist

# in ai_store repo: regenerate seed and reinstall
node scripts/mcp/generate-seed.mjs
bash scripts/mcp/install-portfolio.sh
```

## Cross-repo totals

| Repo | MCPs |
|------|------|
| b'AI'tcoin (this seed includes) | 28 |
| AI Store (this seed includes)   | 6 |
| **Total**                       | **34** |

---

**Spec:** [MCP 2024-11-05](https://modelcontextprotocol.io/specification/2024-11-05)
