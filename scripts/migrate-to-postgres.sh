#!/bin/bash
# AI Store — Migrate from SQLite to PostgreSQL
# Usage: ./scripts/migrate-to-postgres.sh <postgresql_url>
# Example: ./scripts/migrate-to-postgres.sh postgresql://user:pass@localhost:5432/ai_store

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

PG_URL="${1:-}"
if [ -z "$PG_URL" ]; then
  echo "Usage: $0 <postgresql_url>"
  echo "Example: $0 postgresql://user:pass@localhost:5432/ai_store"
  exit 1
fi

echo "=== AI Store — SQLite → PostgreSQL Migration ==="
echo ""

# 1. Export SQLite data to JSON
echo "[1/5] Exporting SQLite data..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function exportAll() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: 'asc' } });
  const agents = await prisma.agent.findMany({ orderBy: { createdAt: 'asc' } });
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: 'asc' } });
  const transactions = await prisma.transaction.findMany({ orderBy: { createdAt: 'asc' } });
  const referrals = await prisma.referralReward.findMany({ orderBy: { createdAt: 'asc' } });
  require('fs').writeFileSync('/tmp/ai-store-export.json', JSON.stringify({ products, agents, reviews, transactions, referrals }, null, 2));
  console.log('  Exported: ' + products.length + ' products, ' + agents.length + ' agents, ' + reviews.length + ' reviews, ' + transactions.length + ' transactions, ' + referrals.length + ' referrals');
  await prisma.\\$disconnect();
}
exportAll();
" 2>&1

# 2. Update DATABASE_URL
echo "[2/5] Switching DATABASE_URL to PostgreSQL..."
cp "$PROJECT_ROOT/.env" "$PROJECT_ROOT/.env.sqlite.bak"
sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=$PG_URL|" "$PROJECT_ROOT/.env"
echo "  Backup saved to .env.sqlite.bak"

# 3. Generate Prisma client for PostgreSQL
echo "[3/5] Generating Prisma client..."
cd "$PROJECT_ROOT"
npx prisma generate 2>&1

# 4. Push schema to PostgreSQL
echo "[4/5] Creating PostgreSQL schema..."
npx prisma db push --accept-data-loss 2>&1

# 5. Import data
echo "[5/5] Importing data into PostgreSQL..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const data = JSON.parse(require('fs').readFileSync('/tmp/ai-store-export.json', 'utf8'));

async function importAll() {
  // Import agents first (no deps)
  for (const a of data.agents) {
    await prisma.agent.create({ data: a });
  }
  console.log('  Imported ' + data.agents.length + ' agents');

  // Import products
  for (const p of data.products) {
    await prisma.product.create({ data: p });
  }
  console.log('  Imported ' + data.products.length + ' products');

  // Import reviews
  for (const r of data.reviews) {
    await prisma.review.create({ data: r });
  }
  console.log('  Imported ' + data.reviews.length + ' reviews');

  // Import transactions
  for (const t of data.transactions) {
    await prisma.transaction.create({ data: t });
  }
  console.log('  Imported ' + data.transactions.length + ' transactions');

  // Import referrals
  for (const r of data.referrals) {
    await prisma.referralReward.create({ data: r });
  }
  console.log('  Imported ' + data.referrals.length + ' referrals');

  await prisma.\$disconnect();
}
importAll();
" 2>&1

echo ""
echo "=== Migration Complete ==="
echo "To rollback: cp .env.sqlite.bak .env && npx prisma db push"
echo "SQLite backup: .env.sqlite.bak"
echo "Data export: /tmp/ai-store-export.json"
