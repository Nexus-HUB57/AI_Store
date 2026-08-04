#!/usr/bin/env bash
# ─── AI Store Nexus — Production Smoke Test Suite ───
# Usage: bash scripts/smoke-test.sh [BASE_URL]
# Default BASE_URL: http://localhost:3000

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
PASSED=0
FAILED=0
ERRORS=""

pass() { echo "  ✅ $1"; PASSED=$((PASSED + 1)); }
fail() { echo "  ❌ $1"; FAILED=$((FAILED + 1)); ERRORS="$ERRORS\n  - $1"; }

check() {
  local name="$1" url="$2" expected_status="$3"
  local status=$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo '000')
  if [ "$status" = "$expected_status" ]; then
    pass "$name (HTTP $status)"
  else
    fail "$name (expected $expected_status, got $status)"
  fi
}

check_json() {
  local name="$1" url="$2" field="$3" expected="$4"
  local body=$(curl -s "$url" 2>/dev/null)
  local value=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)$field)" 2>/dev/null || echo '')
  if [ "$value" = "$expected" ]; then
    pass "$name ($field=$value)"
  else
    fail "$name ($field: expected '$expected', got '$value')"
  fi
}

echo ""
echo "═══════════════════════════════════════════════════"
echo "  AI Store Nexus — Smoke Test Suite"
echo "  Target: $BASE_URL"
echo "  Date:   $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "═══════════════════════════════════════════════════"
echo ""

echo "[1/5] Static Pages"
check "Homepage" "$BASE_URL/" "200"
check "Dashboard (auth guard)" "$BASE_URL/dashboard" "307"
check "Publish (auth guard)" "$BASE_URL/publish" "307"
check "Product page (SSG)" "$BASE_URL/product/prompt-compressor-132" "200"
check "Not Found" "$BASE_URL/nonexistent-page-xyz" "404"
check "Robots.txt" "$BASE_URL/robots.txt" "200"
check "Sitemap.xml" "$BASE_URL/sitemap.xml" "200"

echo ""
echo "[2/5] API Endpoints"
check "/api/health" "$BASE_URL/api/health" "200"
check_json "Health status" "$BASE_URL/api/health" "['status']" "ok"
check "/api/version" "$BASE_URL/api/version" "200"
check "/api/stats" "$BASE_URL/api/stats" "200"
check "/api/products" "$BASE_URL/api/products?limit=1" "200"
check "/api/products/compact" "$BASE_URL/api/products/compact?limit=1" "200"
check "/api/cart GET" "$BASE_URL/api/cart" "200"
check "/api/agent/discover" "$BASE_URL/api/agent/discover" "200"
check "/api/agent/openapi-spec" "$BASE_URL/api/agent/openapi-spec" "200"
check "/api/agent/metrics" "$BASE_URL/api/agent/metrics" "200"
check "/api/sandbox/status" "$BASE_URL/api/sandbox/status" "200"
check "/api/sandbox/quick" "$BASE_URL/api/sandbox/quick?productId=clx12345" "404"

echo ""
echo "[3/5] Security"
local_csp=$(curl -sI "$BASE_URL/" 2>/dev/null | grep -i 'content-security-policy' | head -1)
if [ -n "$local_csp" ]; then
  pass "CSP header present"
else
  fail "CSP header missing"
fi

local_hsts=$(curl -sI "$BASE_URL/" 2>/dev/null | grep -i 'strict-transport-security' | head -1)
if [ -n "$local_hsts" ]; then
  pass "HSTS header present"
else
  fail "HSTS header missing"
fi

local_frame=$(curl -sI "$BASE_URL/" 2>/dev/null | grep -i 'x-frame-options' | head -1)
if [ -n "$local_frame" ]; then
  pass "X-Frame-Options present"
else
  fail "X-Frame-Options missing"
fi

local_nosniff=$(curl -sI "$BASE_URL/" 2>/dev/null | grep -i 'x-content-type-options' | head -1)
if [ -n "$local_nosniff" ]; then
  pass "X-Content-Type-Options present"
else
  fail "X-Content-Type-Options missing"
fi

echo ""
echo "[4/5] Auth Guards"
check "Dashboard redirect (no auth)" "$BASE_URL/dashboard" "307"
check "Publish redirect (no auth)" "$BASE_URL/publish" "307"
local_agent_401=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/agent/dashboard" 2>/dev/null)
if [ "$local_agent_401" = "401" ]; then
  pass "Agent dashboard API returns 401"
else
  fail "Agent dashboard API expected 401, got $local_agent_401"
fi

echo ""
echo "[5/5] Data Integrity"
product_count=$(curl -s "$BASE_URL/api/stats" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['total'])" 2>/dev/null)
if [ "$product_count" -ge 1 ] 2>/dev/null; then
  pass "Products in catalog: $product_count"
else
  fail "No products in catalog (count: $product_count)"
fi

version=$(curl -s "$BASE_URL/api/version" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])" 2>/dev/null)
if [ -n "$version" ]; then
  pass "Version: $version"
else
  fail "Version endpoint failed"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Results: $PASSED passed, $FAILED failed"
if [ $FAILED -eq 0 ]; then
  echo "  Status: ✅ ALL TESTS PASSED"
else
  echo "  Status: ❌ $FAILED FAILURES"
  echo -e "$ERRORS"
  exit 1
fi
echo "═══════════════════════════════════════════════════"
echo ""
