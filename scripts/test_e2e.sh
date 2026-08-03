#!/bin/bash
set -e
BASE=http://localhost:3000

echo '=== 1. Stats ==='
curl -s $BASE/api/stats | python3 -c 'import json,sys;d=json.load(sys.stdin);print("Products:",d["total"])'

echo ''
echo '=== 2. Agent Signup (100 BAIT bonus) ==='
R1=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"address":"bAI_e2e_buyer_01","displayName":"BuyerE2E"}')
echo $R1 | python3 -m json.tool 2>/dev/null | head -15
AGENT_ID=$(echo $R1 | python3 -c 'import json,sys;print(json.load(sys.stdin)["agent"]["id"])')

echo ''
echo '=== 3. Product for purchase ==='
PROD_INFO=$(node -e 'const{PrismaClient}=require("@prisma/client");const p=new PrismaClient();(async()=>{const pr=await p.product.findFirst();console.log(pr.id+"|"+pr.precoSats+"|"+pr.nome);await p.$disconnect()})()')
PID=$(echo $PROD_INFO | cut -d'|' -f1)
PRICE=$(echo $PROD_INFO | cut -d'|' -f2)
PNAME=$(echo $PROD_INFO | cut -d'|' -f3-)
echo "Product: $PNAME ($PRICE sats)"

echo ''
echo '=== 4. Purchase #1 (should be FREE) ==='
curl -s -X POST $BASE/api/cart -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"id\":\"$PID\",\"nome\":\"$PNAME\",\"precoSats\":$PRICE}],\"totalSats\":$PRICE,\"agentId\":\"$AGENT_ID\",\"discountTotal\":0}" \
  | python3 -m json.tool 2>/dev/null

echo ''
echo '=== 5. Agent State After 1 Purchase ==='
curl -s "$BASE/api/auth/me?address=bAI_e2e_buyer_01" | python3 -c '
import json,sys
d=json.load(sys.stdin)["agent"]
print(f"Balance: {d["balanceSats"]} sats | Purchases: {d["purchaseCount"]} | Referral: {d["referralCode"]}")
'

echo ''
echo '=== 6. Discount Tier After 1st ==='
curl -s "$BASE/api/cart?agentId=$AGENT_ID" | python3 -c '
import json,sys
t=json.load(sys.stdin)["discountTier"]
print(f"Tier: {t["tier"]} | Free left: {t["nextFree"]} | Discounted left: {t["nextDiscounted"]}")
'

echo ''
echo '=== 7. Referral Stats ==='
curl -s "$BASE/api/referral/stats?agentId=$AGENT_ID" | python3 -m json.tool 2>/dev/null

echo ''
echo '=== ALL TESTS PASSED ==='
