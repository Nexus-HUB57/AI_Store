#!/usr/bin/env bash
# ─── AI Store v2.0.0 — Release Preparation ───
# Builds standalone production bundle with 2704-product DB
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "══════════════════════════════════════════════════════════"
echo "  AI Store v2.0.0 — Release Preparation"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "══════════════════════════════════════════════════════════"

# 1. Validate DB
echo ""
echo "[1/5] Validating database..."
TOTAL=$(node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().product.count().then(c=>{console.log(c);process.exit(0)})" 2>&1 || echo "0")
MCP=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.product.count({where:{segmento:'MCP_PROTOCOL_SERVERS'}}).then(c=>{console.log(c);process.exit(0)})" 2>&1 || echo "0")
echo "  Products: $TOTAL/2704"
echo "  MCPs: $MCP/1200"
if [ "$TOTAL" -lt 2704 ] || [ "$MCP" -lt 1200 ]; then
  echo "  ❌ Insufficient products — run: npx tsx scripts/seed-2704.ts"
  exit 1
fi
echo "  ✅ DB valid"

# 2. Generate Prisma client
echo ""
echo "[2/5] Generating Prisma client..."
npx prisma generate 2>&1 | tail -3

# 3. Build
echo ""
echo "[3/5] Building production bundle..."
export DATABASE_URL="file:$PROJECT_DIR/db/custom.db"
NODE_ENV=production NEXT_PUBLIC_APP_VERSION=2.0.0 npx next build 2>&1 | tail -5

# 4. Package
echo ""
echo "[4/5] Packaging deploy artifact..."
STANDALONE_DIR="$PROJECT_DIR/.next/standalone"
if [ ! -d "$STANDALONE_DIR" ]; then
  echo "  ❌ .next/standalone not found — build may have failed"
  exit 1
fi

# Copy DB into standalone
mkdir -p "$STANDALONE_DIR/db"
cp "$PROJECT_DIR/db/custom.db" "$STANDALONE_DIR/db/custom.db"

# Copy static assets
mkdir -p "$STANDALONE_DIR/.next/static"
cp -r "$PROJECT_DIR/.next/static/"* "$STANDALONE_DIR/.next/static/" 2>/dev/null || true

# Copy public
mkdir -p "$STANDALONE_DIR/public"
cp -r "$PROJECT_DIR/public/"* "$STANDALONE_DIR/public/" 2>/dev/null || true

# Copy prisma schema
mkdir -p "$STANDALONE_DIR/prisma"
cp "$PROJECT_DIR/prisma/schema.prisma" "$STANDALONE_DIR/prisma/"

# Create tarball
TARBALL="$PROJECT_DIR/deploy/aistore-codebase.tar.gz"
mkdir -p "$PROJECT_DIR/deploy"
cd "$STANDALONE_DIR"
tar czf "$TARBALL" .
TARBALL_SIZE=$(du -sh "$TARBALL" | cut -f1)
echo "  Tarball: $TARBALL ($TARBALL_SIZE)"

# 5. Verify
echo ""
echo "[5/5] Verifying artifact..."
FILE_COUNT=$(tar tzf "$TARBALL" | wc -l)
HAS_DB=$(tar tzf "$TARBALL" | grep -c "db/custom.db" || echo "0")
HAS_SERVER=$(tar tzf "$TARBALL" | grep -c "server.js" || echo "0")
echo "  Files in tarball: $FILE_COUNT"
echo "  Has DB: $([ "$HAS_DB" -gt 0 ] && echo '✅' || echo '❌')"
echo "  Has server.js: $([ "$HAS_SERVER" -gt 0 ] && echo '✅' || echo '❌')"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  ✅ Release artifact ready"
echo "  Tarball: $TARBALL"
echo "  Size: $TARBALL_SIZE"
echo "  Products: $TOTAL (MCPs: $MCP)"
echo ""
echo "  Next steps:"
echo "  1. Create GitHub release: gh release create v2.0.0 $TARBALL --title 'v2.0.0 — 2704 Tools'"
echo "  2. Deploy on server: bash deploy/deploy-on-server.sh"
echo "══════════════════════════════════════════════════════════"
