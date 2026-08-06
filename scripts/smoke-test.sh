#!/usr/bin/env bash
# ─── AI Store Nexus v1.0.0 — Production Smoke Test Suite ───
# Usage: bash scripts/smoke-test.sh [BASE_URL]
#   Default: http://localhost:3000
#   Production: bash scripts/smoke-test.sh https://www.mybait.org/aistore
#   Package: npm run smoke          (localhost)
#   Package: npm run smoke:prod     (production)

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
PASSED=0
FAILED=0
ERRORS=""
START_TIME=$(date +%s)

# ─── Colors ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✅${NC} $1"; PASSED=$((PASSED + 1)); }
fail() { echo -e "  ${RED}❌${NC} $1"; FAILED=$((FAILED + 1)); ERRORS="$ERRORS\n  - $1"; }
warn() { echo -e "  ${YELLOW}⚠️${NC} $1"; }
info() { echo -e "  ${CYAN}ℹ️${NC} $1"; }

# ─── HTTP helpers ───
http_get() {
  curl -s --max-time 15 -o /dev/null -w '%{http_code}' "$1" 2>/dev/null || echo '000'
}

http_body() {
  curl -s --max-time 15 "$1" 2>/dev/null
}

json_val() {
  echo "$2" | python3 -c "import sys,json; print(json.load(sys.stdin)$1)" 2>/dev/null || echo ''
}

check() {
  local name="$1" url="$2" expected="$3"
  local status=$(http_get "$url")
  if [ "$status" = "$expected" ]; then
    pass "$name (HTTP $status)"
  else
    fail "$name (expected $expected, got $status)"
  fi
}

check_json() {
  local name="$1" url="$2" field="$3" expected="$4"
  local body=$(http_body "$url")
  local value=$(json_val "$field" "$body")
  if [ "$value" = "$expected" ]; then
    pass "$name ($field=$value)"
  else
    fail "$name ($field: expected '$expected', got '$value')"
  fi
}

check_json_not_empty() {
  local name="$1" url="$2" field="$3"
  local body=$(http_body "$url")
  local value=$(json_val "$field" "$body")
  if [ -n "$value" ]; then
    pass "$name ($field=$(echo "$value" | head -c 50))"
  else
    fail "$name ($field is empty or missing)"
  fi
}

check_header() {
  local name="$1" url="$2" header="$3"
  local value=$(curl -sI --max-time 10 "$url" 2>/dev/null | grep -i "$header" | head -1)
  if [ -n "$value" ]; then
    pass "$name"
  else
    fail "$name (header '$header' missing)"
  fi
}

check_latency() {
  local name="$1" url="$2" max_ms="$3"
  local start=$(date +%s%3N 2>/dev/null || python3 -c 'import time;print(int(time.time()*1000))')
  http_get "$url" > /dev/null
  local end=$(date +%s%3N 2>/dev/null || python3 -c 'import time;print(int(time.time()*1000))')
  local latency=$((end - start))
  if [ "$latency" -le "$max_ms" ]; then
    pass "$name (${latency}ms <= ${max_ms}ms)"
  else
    fail "$name (${latency}ms > ${max_ms}ms)"
  fi
}

# ─── Header ───
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  AI Store Nexus — Smoke Test Suite v2.0${NC}"
echo -e "${BOLD}  Version: 1.0.0${NC}"
echo -e "  Target: ${CYAN}$BASE_URL${NC}"
echo -e "  Date:   $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo -e "${BOLD}══════════════════════════════════════════════════════${NC}"
echo ""

# ─── [1/8] Static Pages ───
echo -e "${BOLD}[1/8] Static Pages${NC}"
check "Homepage" "$BASE_URL/" "200"
check "Product page (SSG)" "$BASE_URL/product/prompt-compressor-132" "200"
check "Not Found" "$BASE_URL/nonexistent-page-xyz" "404"
check "Robots.txt" "$BASE_URL/robots.txt" "200"
check "Sitemap.xml" "$BASE_URL/sitemap.xml" "200"
check "AI Plugin manifest" "$BASE_URL/.well-known/ai-plugin.json" "200"

# ─── [2/8] API Core Endpoints ───
echo ""
echo -e "${BOLD}[2/8] API Core Endpoints${NC}"
check "/api/version" "$BASE_URL/api/version" "200"
check_json "Version value" "$BASE_URL/api/version" "['version']" "1.0.0"
check_json "Version deployment" "$BASE_URL/api/version" "['deployment']" "hostgator-cgi"
check "/api/health" "$BASE_URL/api/health" "200"
check_json "Health status" "$BASE_URL/api/health" "['status']" "ok"
check "/api/stats" "$BASE_URL/api/stats" "200"
check "/api/products" "$BASE_URL/api/products?limit=1" "200"
check "/api/products/compact" "$BASE_URL/api/products/compact?limit=1" "200"

# ─── [3/8] API Agent Endpoints ───
echo ""
echo -e "${BOLD}[3/8] Agent Discovery & Metrics${NC}"
check "/api/agent/discover" "$BASE_URL/api/agent/discover" "200"
check_json_not_empty "/api/agent/discover results" "$BASE_URL/api/agent/discover" "['results']"
check "/api/agent/discover?q=sandbox" "$BASE_URL/api/agent/discover?q=sandbox" "200"
check "/api/agent/openapi-spec" "$BASE_URL/api/agent/openapi-spec" "200"
check "/api/agent/metrics" "$BASE_URL/api/agent/metrics" "200"
check "/api/agent/reputation" "$BASE_URL/api/agent/reputation" "200"

# ─── [4/8] Auth & Commerce ───
echo ""
echo -e "${BOLD}[4/8] Auth & Commerce Endpoints${NC}"
check "/api/auth/login (no body)" "$BASE_URL/api/auth/login" "400"
check "/api/cart GET" "$BASE_URL/api/cart" "200"
check "/api/cart POST (no body)" "$BASE_URL/api/cart" "400"
check "/api/reviews" "$BASE_URL/api/reviews?productId=test" "200"
check "/api/referral/stats (no agent)" "$BASE_URL/api/referral/stats" "200"

# ─── [5/8] Sandbox ───
echo ""
echo -e "${BOLD}[5/8] Sandbox Endpoints${NC}"
check "/api/sandbox/status" "$BASE_URL/api/sandbox/status" "200"
check "/api/sandbox/quick (invalid product)" "$BASE_URL/api/sandbox/quick?productId=invalid" "404"

# ─── [6/8] Security Headers ───
echo ""
echo -e "${BOLD}[6/8] Security Headers${NC}"
check_header "Content-Security-Policy" "$BASE_URL/" 'content-security-policy'
check_header "X-Frame-Options" "$BASE_URL/" 'x-frame-options'
check_header "X-Content-Type-Options" "$BASE_URL/" 'x-content-type-options'
# HSTS is handled by the reverse proxy (Caddy/Cloudflare) — may not be present on localhost
local_hsts=$(curl -sI --max-time 10 "$BASE_URL/" 2>/dev/null | grep -i 'strict-transport-security' | head -1)
if [ -n "$local_hsts" ]; then
  pass "Strict-Transport-Security present"
else
  warn "Strict-Transport-Security not present (expected if behind proxy)"
fi

# ─── [7/8] Auth Guards ───
echo ""
echo -e "${BOLD}[7/8] Auth Guards${NC}"
check "/api/agent/dashboard (no auth)" "$BASE_URL/api/agent/dashboard" "401"

# ─── [8/8] Data Integrity & Performance ───
echo ""
echo -e "${BOLD}[8/8] Data Integrity & Performance${NC}"

# Product count
product_count=$(http_body "$BASE_URL/api/stats" | python3 -c "import sys,json; print(json.load(sys.stdin)['total'])" 2>/dev/null)
if [ "$product_count" -ge 1 ] 2>/dev/null; then
  if [ "$product_count" -ge 1500 ]; then
    pass "Products in catalog: $product_count (>= 1500)"
  else
    warn "Products in catalog: $product_count (expected >= 1500)"
  fi
else
  fail "No products in catalog (count: ${product_count:-N/A})"
fi

# Version consistency
version=$(http_body "$BASE_URL/api/version" | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])" 2>/dev/null)
if [ "$version" = "1.0.0" ]; then
  pass "Version consistency: $version"
else
  fail "Version mismatch: expected 1.0.0, got ${version:-N/A}"
fi

# Health deep check
health_body=$(http_body "$BASE_URL/api/health")
health_status=$(json_val "['status']" "$health_body")
health_bait=$(json_val "['services']['baitcoin_daemon']" "$health_body")
health_db=$(json_val "['services']['database']" "$health_body")

if [ "$health_status" = "ok" ]; then
  pass "Health status: ok"
else
  fail "Health status: ${health_status:-N/A}"
fi

if [ "$health_db" = "connected" ]; then
  pass "Database: connected"
else
  fail "Database: ${health_db:-N/A}"
fi

if [ "$health_bait" = "connected" ]; then
  pass "b'AI'tcoin daemon: connected"
else
  info "b'AI'tcoin daemon: ${health_bait:-offline} (fallback-simulated mode)"
fi

# Latency checks
check_latency "Homepage latency" "$BASE_URL/" 3000
check_latency "/api/version latency" "$BASE_URL/api/version" 2000
check_latency "/api/health latency" "$BASE_URL/api/health" 3000
check_latency "/api/stats latency" "$BASE_URL/api/stats" 3000

# ─── b'AI'tcoin Daemon Check (external) ───
echo ""
echo -e "${BOLD}[BONUS] b'AI'tcoin Daemon External${NC}"
BAIT_URL="https://www.mybait.org/api/api/v1/status"
bait_code=$(http_get "$BAIT_URL")
if [ "$bait_code" = "200" ]; then
  pass "b'AI'tcoin daemon reachable at $BAIT_URL"
  bait_block=$(http_body "$BAIT_URL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('block_height', d.get('data',{}).get('block_height','?')))" 2>/dev/null)
  info "  Block height: ${bait_block:-N/A}"
else
  info "b'AI'tcoin daemon offline ($bait_code) — AI Store uses simulated mode"
fi

# ─── Summary ───
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════${NC}"
echo -e "  ${BOLD}Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC} (${PASSED + FAILED} total)"
echo -e "  Duration: ${DURATION}s"
if [ $FAILED -eq 0 ]; then
  echo -e "  Status: ${GREEN}${BOLD}✅ ALL TESTS PASSED${NC}"
else
  echo -e "  Status: ${RED}${BOLD}❌ $FAILED FAILURES${NC}"
  echo -e "$ERRORS"
  exit 1
fi
echo -e "${BOLD}══════════════════════════════════════════════════════${NC}"
echo ""