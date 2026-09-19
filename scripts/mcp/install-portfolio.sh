#!/usr/bin/env bash
# install-portfolio.sh — Populate the AI Store Prisma DB with the full MCP portfolio.
#
# Idempotent: uses INSERT OR IGNORE so it's safe to re-run.
#
# Usage:
#   bash scripts/mcp/install-portfolio.sh
#   bash scripts/mcp/install-portfolio.sh /path/to/baitcoin/repo

set -euo pipefail

BAITCOIN_ROOT="${1:-../b-AI-tcoin-AI-to-AI-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SEED_DIR="$SCRIPT_DIR/seed"

echo "▶ AI Store MCP Portfolio installer"
echo "  AI Store root:    $ROOT_DIR"
echo "  b'AI'tcoin root:  $BAITCOIN_ROOT"
echo "  Seed directory:   $SEED_DIR"
echo ""

# ────────────────────────── Step 1: generate seed if missing ──────────────────────────
if [ ! -f "$SEED_DIR/mcp_portfolio.json" ] || [ ! -f "$SEED_DIR/populate.sql" ]; then
  echo "▶ Generating seed (missing files)..."
  cd "$ROOT_DIR"
  node scripts/mcp/generate-seed.mjs --baitcoin-root "$BAITCOIN_ROOT"
  echo ""
fi

# ────────────────────────── Step 2: locate SQLite database ──────────────────────────
DB_PATH="${DATABASE_URL:-}"
if [ -z "$DB_PATH" ]; then
  # Try common paths
  if [ -f "$ROOT_DIR/db/custom.db" ]; then
    DB_PATH="$ROOT_DIR/db/custom.db"
  elif [ -f "$ROOT_DIR/prisma/custom.db" ]; then
    DB_PATH="$ROOT_DIR/prisma/custom.db"
  elif [ -f "$ROOT_DIR/db/dev.db" ]; then
    DB_PATH="$ROOT_DIR/db/dev.db"
  else
    echo "✗ cannot locate SQLite database. Set DATABASE_URL or create db/custom.db"
    exit 1
  fi
fi

echo "▶ Database: $DB_PATH"

# ────────────────────────── Step 3: run Prisma migrations if needed ──────────────────────────
echo ""
echo "▶ Running prisma db push (ensure schema is current)..."
cd "$ROOT_DIR"
if [ -f "package.json" ] && grep -q "db:push" package.json; then
  npm run db:push 2>&1 | tail -3 || echo "  (skipped — db may already be in sync)"
fi
echo ""

# ────────────────────────── Step 4: apply seed ──────────────────────────
echo "▶ Applying populate.sql..."
if command -v sqlite3 &>/dev/null; then
  sqlite3 "$DB_PATH" < "$SEED_DIR/populate.sql"
  echo "✓ seed applied via sqlite3"
else
  echo "  sqlite3 CLI not found — falling back to bun:sqlite"
  cd "$ROOT_DIR"
  bun -e "
    const { Database } = require('bun:sqlite');
    const db = new Database('$DB_PATH');
    const sql = require('fs').readFileSync('$SEED_DIR/populate.sql', 'utf-8');
    db.exec(sql);
    const count = db.query('SELECT COUNT(*) as n FROM McpPackage').get();
    console.log('✓ seed applied via bun:sqlite — McpPackage rows:', count.n);
  "
fi

echo ""
echo "▶ Verifying..."
TOTAL=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM McpPackage" 2>/dev/null || echo "?")
TOOLS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM McpTool" 2>/dev/null || echo "?")
echo "  McpPackage rows: $TOTAL"
echo "  McpTool rows:    $TOOLS"

echo ""
echo "✅ Portfolio installed. Verify in catalog:"
echo "   curl -s http://localhost:3000/api/mcp | jq '.total'"
echo "   open http://localhost:3000/aistore/mcp"