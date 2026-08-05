#!/usr/bin/env bash
# ─── AI Store Nexus v0.8.1 — Stress Test Suite ───
# Simulates concurrent load to validate stability under pressure.
# Usage: bash scripts/stress-test.sh [BASE_URL] [CONCURRENT] [TOTAL_REQUESTS]
#   Default: bash scripts/stress-test.sh http://localhost:3000 10 100
#   Production: bash scripts/stress-test.sh https://www.mybait.org/aistore 5 50

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
CONCURRENT="${2:-10}"
TOTAL="${3:-100}"
PASSED=0
FAILED=0
TIMEOUTS=0
TOTAL_MS=0
MIN_MS=999999
MAX_MS=0
ERRORS=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

START_TIME=$(date +%s)
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

pass() { echo -e "  ${GREEN}✅${NC} $1"; PASSED=$((PASSED + 1)); }
fail() { echo -e "  ${RED}❌${NC} $1"; FAILED=$((FAILED + 1)); ERRORS="$ERRORS\n  - $1"; }
info() { echo -e "  ${CYAN}ℹ️${NC} $1"; }

# ─── Stress test a single endpoint ───
stress_endpoint() {
  local name="$1"
  local url="$2"
  local method="$3"  # GET or POST
  local body="$4"  # empty for GET
   local req_count="$5"
  local conc="$6"

  echo ""
  echo -e "${BOLD}  Stress: $name ($conc x $req_count = $((conc * req_count)) reqs)${NC}"

  local ep_passed=0
  local ep_failed=0
  local ep_timeouts=0
  local ep_total_ms=0
  local ep_min_ms=999999
  local ep_max_ms=0
  local p50_idx=$(( (conc * req_count) / 2 ))

  # Collect latencies into a temp file
  local lat_file="$TMPDIR/latencies_${name//[^a-zA-Z0-9]/_}.txt"
  > "$lat_file"

  for ((c = 0; c < conc; c++)); do
    (
      local c_passed=0
      local c_failed=0
      local c_timeouts=0
      for ((i = 0; i < req_count; i++)); do
        local start=$(date +%s%3N 2>/dev/null || python3 -c 'import time;print(int(time.time()*1000))')
        local http_code
        if [ "$method" = "GET" ]; then
          http_code=$(curl -s --max-time 30 -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo '000')
        else
          http_code=$(curl -s --max-time 30 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d "$body" "$url" 2>/dev/null || echo '000')
        fi
        local end=$(date +%s%3N 2>/dev/null || python3 -c 'import time;print(int(time.time()*1000))')
        local lat=$((end - start))

        echo "$lat" >> "$lat_file"

        if [ "$http_code" = "000" ]; then
          c_timeouts=$((c_timeouts + 1))
        elif [ "$http_code" -ge 200 ] && [ "$http_code" -lt 500 ]; then
          c_passed=$((c_passed + 1))
        else
          c_failed=$((c_failed + 1))
        fi
      done
      echo "$c_passed $c_failed $c_timeouts" > "$TMPDIR/worker_$$_${c}.txt"
    ) &
  done
  wait

  # Aggregate results
  for f in "$TMPDIR"/worker_*_${name//[^a-zA-Z0-9]/_}.txt; do
    [ -f "$f" ] || continue
    read w_p w_f w_t < "$f"
    ep_passed=$((ep_passed + w_p))
    ep_failed=$((ep_failed + w_f))
    ep_timeouts=$((ep_timeouts + w_t))
    rm -f "$f"
  done

  # Calculate latency stats from lat_file
  local lat_count=$(wc -l < "$lat_file" | tr -d ' ')
  if [ "$lat_count" -gt 0 ]; then
    local lat_sum=0
    while IFS= read -r lat; do
      lat_sum=$((lat_sum + lat))
      if [ "$lat" -lt "$ep_min_ms" ]; then ep_min_ms=$lat; fi
      if [ "$lat" -gt "$ep_max_ms" ]; then ep_max_ms=$lat; fi
    done < "$lat_file"
    ep_total_ms=$lat_sum
  fi
  local ep_avg=0
  if [ "$lat_count" -gt 0 ]; then
    ep_avg=$((ep_total_ms / lat_count))
  fi

  local total_reqs=$((ep_passed + ep_failed + ep_timeouts))
  local success_rate=0
  if [ "$total_reqs" -gt 0 ]; then
    success_rate=$(( (ep_passed * 100) / total_reqs ))
  fi

  TOTAL_MS=$((TOTAL_MS + ep_total_ms))
  PASSED=$((PASSED + ep_passed))
  FAILED=$((FAILED + ep_failed + ep_timeouts))
  if [ "$ep_min_ms" -lt "$MIN_MS" ] && [ "$ep_min_ms" -gt 0 ]; then MIN_MS=$ep_min_ms; fi
  if [ "$ep_max_ms" -gt "$MAX_MS" ]; then MAX_MS=$ep_max_ms; fi

  local status_icon="${GREEN}✅${NC}"
  if [ "$success_rate" -lt 95 ]; then
    status_icon="${RED}❌${NC}"
  elif [ "$success_rate" -lt 99 ]; then
    status_icon="${YELLOW}⚠️${NC}"
  fi

  echo -e "    ${status_icon} ${ep_passed}/${total_reqs} OK | ${ep_failed} failed | ${ep_timeouts} timeouts | avg ${ep_avg}ms | min ${ep_min_ms}ms | max ${ep_max_ms}ms"

  # Mark as failure if success rate < 95%
  if [ "$success_rate" -lt 95 ]; then
    fail "$name: success rate ${success_rate}% (threshold 95%)"
  fi
}

# ─── Header ───
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  AI Store Nexus — Stress Test Suite v1.0${NC}"
echo -e "${BOLD}  Version: 0.8.1${NC}"
echo -e "  Target:    ${CYAN}$BASE_URL${NC}"
echo -e "  Config:    ${CONCURRENT} concurrent x ${TOTAL} reqs/worker = $((CONCURRENT * TOTAL)) total"
echo -e "  Date:      $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"

# Pre-flight check
echo ""
echo -e "${BOLD}[Pre-flight] Connectivity Check${NC}"
pre_code=$(curl -s --max-time 10 -o /dev/null -w '%{http_code}' "$BASE_URL/api/version" 2>/dev/null || echo '000')
if [ "$pre_code" = "200" ]; then
  pass "Target is reachable (HTTP 200)"
else
  fail "Target unreachable (HTTP $pre_code). Aborting stress test."
  exit 1
fi

# ─── Test Scenarios ───
echo ""
echo -e "${BOLD}[1/6] Static Homepage (lightweight)${NC}"
stress_endpoint "Homepage" "$BASE_URL/" "GET" "" "$TOTAL" "$CONCURRENT"

echo ""
echo -e "${BOLD}[2/6] API /version (no DB)${NC}"
stress_endpoint "GET /api/version" "$BASE_URL/api/version" "GET" "" "$TOTAL" "$CONCURRENT"

echo ""
echo -e "${BOLD}[3/6] API /health (DB + external)${NC}"
stress_endpoint "GET /api/health" "$BASE_URL/api/health" "GET" "" "5" "$CONCURRENT"

echo ""
echo -e "${BOLD}[4/6] API /stats (DB aggregation)${NC}"
stress_endpoint "GET /api/stats" "$BASE_URL/api/stats" "GET" "" "10" "$CONCURRENT"

echo ""
echo -e "${BOLD}[5/6] API /products (DB query + pagination)${NC}"
stress_endpoint "GET /api/products" "$BASE_URL/api/products?limit=20" "GET" "" "10" "$CONCURRENT"

echo ""
echo -e "${BOLD}[6/6] API /agent/discover (in-memory)${NC}"
stress_endpoint "GET /api/agent/discover" "$BASE_URL/api/agent/discover" "GET" "" "$TOTAL" "$CONCURRENT"

# ─── Summary ───
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
TOTAL_REQS=$((PASSED + FAILED))

if [ "$TOTAL_REQS" -gt 0 ]; then
  OVERALL_AVG=$((TOTAL_MS / TOTAL_REQS))
else
  OVERALL_AVG=0
fi

if [ "$MIN_MS" -eq 999999 ]; then MIN_MS=0; fi

# Calculate rps
if [ "$DURATION" -gt 0 ]; then
  RPS=$((TOTAL_REQS / DURATION))
else
  RPS="N/A"
fi

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"
echo -e "  ${BOLD}Stress Test Summary${NC}"
echo -e "  ────────────────────────────────────────────────"
echo -e "  Total Requests:     ${BOLD}$TOTAL_REQS${NC}"
echo -e "  Successful:         ${GREEN}$PASSED${NC} (${TOTAL_REQS -gt 0 ? $(( (PASSED * 100) / TOTAL_REQS )) : 0}%)"
echo -e "  Failed/Timeouts:    ${RED}$FAILED${NC}"
echo -e "  Duration:           ${DURATION}s"
echo -e "  Throughput:         ${RPS} req/s"
echo -e "  Avg Latency:        ${OVERALL_AVG}ms"
echo -e "  Min Latency:        ${MIN_MS}ms"
echo -e "  Max Latency:        ${MAX_MS}ms"
echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "  Status: ${GREEN}${BOLD}✅ ALL STRESS TESTS PASSED${NC}"
else
  fail_pct=0
  if [ "$TOTAL_REQS" -gt 0 ]; then
    fail_pct=$(( (FAILED * 100) / TOTAL_REQS ))
  fi
  echo -e "  Status: ${RED}${BOLD}❌ ${FAILED} FAILURES (${fail_pct}%)${NC}"
  echo -e "$ERRORS"
  exit 1
fi
echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"
echo ""