#!/usr/bin/env bash
# AI Store — verify_deploy.sh
# Health check nao-destrutivo pos-deploy no HostGator.
#
# Uso:
#   bash scripts/verify_deploy.sh
#   BASE=https://www.mybait.org/aistore bash scripts/verify_deploy.sh

set -euo pipefail

BASE="${BASE:-https://www.mybait.org/aistore}"

pass(){ printf '\033[1;32m[PASS]\033[0m %s\n' "$*"; }
fail(){ printf '\033[1;31m[FAIL]\033[0m %s\n' "$*"; FAILS=$((FAILS+1)); }
info(){ printf '\033[1;36m[..]\033[0m %s\n' "$*"; }
FAILS=0

info "AI Store post-deploy verification against ${BASE}"

# 1) Front principal HTTP 200 ou 308 (SSG redirect)
code=$(curl -sSf -o /dev/null -w "%{http_code}" "${BASE}/" || echo "000")
if [ "$code" = "200" ] || [ "$code" = "308" ]; then
    pass "GET ${BASE}/ = ${code}"
else
    fail "GET ${BASE}/ = ${code}"
fi

# 2) /api/stats — KPIs live
info "GET /api/stats"
curl -sSf "${BASE}/api/stats" > /tmp/aistats.json || { fail "/api/stats indisponivel"; exit 1; }
python3 - <<'PY' || FAILS=$((FAILS+1))
import json,sys
s=json.load(open('/tmp/aistats.json'))
req=['total','categories','avgPulsarEnergy','totalDownloads','totalExecutions','featuredCount']
missing=[k for k in req if k not in s]
if missing:
    print('FAIL missing keys:',missing); sys.exit(1)
print(f"PASS payload stats completo")
print(f"  total       = {s['total']}")
print(f"  categorias  = {len(s['categories'])}")
print(f"  downloads   = {s['totalDownloads']}")
print(f"  execucoes   = {s['totalExecutions']}")
print(f"  featured    = {s['featuredCount']}")
print(f"  pulsar avg  = {s['avgPulsarEnergy']}%")
if s['total'] < 100:
    print(f"WARN total suspeito: {s['total']} (esperado >=1000)")
if len(s['categories']) < 5:
    print(f"WARN poucas categorias: {len(s['categories'])} (esperado 6)")
PY

# 3) /api/products?limit=1 — probe real
info "GET /api/products?limit=1"
code=$(curl -sS -o /tmp/aiprod.json -w "%{http_code}" "${BASE}/api/products?limit=1" || echo "000")
if [ "$code" = "200" ]; then
    n=$(python3 -c "import json;p=json.load(open('/tmp/aiprod.json'));print(len(p.get('products',p) if isinstance(p,dict) else p))" 2>/dev/null || echo "0")
    if [ "$n" -ge 1 ]; then
        pass "/api/products retorna produto(s)"
    else
        fail "/api/products retornou 0 produtos"
    fi
else
    fail "/api/products HTTP ${code}"
fi

# 4) /api/health (se existir)
code=$(curl -sS -o /dev/null -w "%{http_code}" "${BASE}/api/health" || echo "000")
if [ "$code" = "200" ]; then
    pass "/api/health = 200"
else
    info "/api/health = ${code} (opcional)"
fi

echo
if [ "$FAILS" -eq 0 ]; then
    printf '\033[1;32m=== ALL CHECKS PASSED ===\033[0m\n'
    exit 0
else
    printf '\033[1;31m=== %d CHECK(S) FAILED ===\033[0m\n' "$FAILS"
    exit 1
fi
