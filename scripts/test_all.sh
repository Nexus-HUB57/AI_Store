#!/bin/bash
cd /home/z/my-project
DATABASE_URL="file:/home/z/my-project/db/custom.db" npx next dev -p 3000 > /tmp/next-dev.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
sleep 15
echo "=== 1. Stats API ==="
curl -s --max-time 5 http://localhost:3000/api/stats | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'  Products: {d[chr(34)+chr(34)].join(chr(34)+"total"+chr(34)):s}');print(f'  Avg Pulsar: {d[chr(34)+"avgPulsarEnergy"+chr(34)]}%')" 2>/dev/null || echo "  FAILED"

# Simpler stats check
curl -s --max-time 5 http://localhost:3000/api/stats | python3 -m json.tool 2>&1 | grep -E '(total|avgPulsar)' | head -3

echo ""
echo "=== 2. Cart Network API ==="
curl -s --max-time 5 http://localhost:3000/api/cart | python3 -m json.tool 2>&1

echo ""
echo "=== 3. Pulsar SSE (3s sample) ==="
curl -sN --max-time 5 http://localhost:3000/api/pulsar 2>&1 | head -3

echo ""
echo "=== 4. .aipkg Upload ==="
echo 'AIPKG_TEST' > /tmp/upload_test.aipkg
curl -s --max-time 10 -F 'package=@/tmp/upload_test.aipkg' -F 'nome=Test Upload Agent' -F 'segmento=AGENT_APPS' -F 'precoSats=1500' -F 'authorAgent=@test-dev' -F 'iconEmoji=🧪' http://localhost:3000/api/upload-aipkg 2>&1 | python3 -m json.tool 2>&1 | head -15

echo ""
echo "=== 5. Product Search ==="
curl -s --max-time 5 'http://localhost:3000/api/products?q=crypto&limit=2' | python3 -m json.tool 2>&1 | head -15

echo ""
echo "=== DONE ==="
kill $SERVER_PID 2>/dev/null
