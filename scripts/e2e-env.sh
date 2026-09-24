#!/usr/bin/env bash
# Print resolved E2E environment (no secret values fully shown)
set -euo pipefail
cd "$(dirname "$0")/.."

load() {
  local f="$1"
  [ -f "$f" ] || return 0
  set -a
  # shellcheck disable=SC1090
  source "$f" 2>/dev/null || true
  set +a
}

# Same order as playwright.config.ts (later files do not override if already set
# — here we source in reverse so first file wins when using set -a carefully)
# Simpler: show files present + key vars from process after sourcing e2e first.
load .env
load .env.local
load .env.e2e

mask() {
  local v="${1:-}"
  if [ -z "$v" ]; then echo "(unset)"; return; fi
  if [ ${#v} -le 8 ]; then echo "***"; return; fi
  echo "${v:0:4}…${v: -4} (len=${#v})"
}

echo "════════════════════════════════════════"
echo " AI Store — Node E2E env"
echo "════════════════════════════════════════"
echo "Files:"
for f in .env.e2e .env.local .env; do
  if [ -f "$f" ]; then echo "  ✓ $f"; else echo "  · $f (missing)"; fi
done
echo ""
echo "BASE_URL              = ${BASE_URL:-"(default by project)"}"
echo "BASE_URL_LOCAL        = ${BASE_URL_LOCAL:-http://localhost:3000}"
echo "BASE_URL_PROD         = ${BASE_URL_PROD:-https://www.mybait.org/aistore}"
echo "PLAYWRIGHT_PROJECT    = ${PLAYWRIGHT_PROJECT:-"(from CLI)"}"
echo "NEXT_PUBLIC_BASE_PATH = ${NEXT_PUBLIC_BASE_PATH:-/aistore}"
echo "DATABASE_URL          = ${DATABASE_URL:-file:./db/custom.db}"
echo "NODE_ENV              = ${NODE_ENV:-development}"
echo "SESSION_SECRET        = $(mask "${SESSION_SECRET:-}")"
echo "CI                    = ${CI:-false}"
echo "PLAYWRIGHT_TIMEOUT    = ${PLAYWRIGHT_TIMEOUT:-45000}"
echo "════════════════════════════════════════"
echo "Tip: cp .env.e2e.example .env.e2e && nano .env.e2e"
echo "     npm run e2e | npm run e2e:prod"
