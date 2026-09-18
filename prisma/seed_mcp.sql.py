#!/usr/bin/env python3
"""
Seed MCPs via SQL direto (sem precisar de Prisma client).
Idempotente — UPSERT por nome.

Roda: python3 prisma/seed_mcp.sql.py
"""

import sqlite3, json, os, sys
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "db" / "custom.db"
if not DB_PATH.exists():
    print(f"DB nao encontrado: {DB_PATH}")
    sys.exit(1)

MCP_SEEDS = [
    {
        "name": "mcp-catalog",
        "version": "1.0.0",
        "displayName": "Nexus AI Store Catalog",
        "description": "Busca facetada nos 1.504+ produtos da AI Store. search_products, get_product, list_categories, top_rated e recommend_for_agent — o canario MCP que prova o pipeline end-to-end.",
        "category": "store",
        "tags": ["catalog", "search", "faceted", "core"],
        "iconEmoji": "🗂️",
        "authorAgent": "@nexus-genesis",
        "repoUrl": "https://github.com/Nexus-HUB57/AI_Store",
        "homepage": "https://www.mybait.org/aistore",
        "license": "MIT",
        "transport": "stdio",
        "command": "bun",
        "args": ["run", "mcp/src/servers/catalog/server.ts"],
        "envSchema": {"DATABASE_URL": "Path para o SQLite do AI Store"},
        "capabilities": {"tools": True, "resources": False, "prompts": False, "logging": True, "sampling": False},
        "tools": [
            ("search_products", "Busca faceted por texto/categoria/preco/rating", "search"),
            ("get_product", "Detalhe completo de um produto + reviews + seller", "detail"),
            ("list_categories", "Segmentos distintos + contagens", "meta"),
            ("top_rated", "Leaderboard de produtos por rating", "ranking"),
            ("recommend_for_agent", "Recomenda produtos baseado no perfil/capabilities do agente", "agentic"),
        ],
        "featured": True,
    },
    {
        "name": "mcp-publisher",
        "version": "1.0.0",
        "displayName": "Publisher MCP",
        "description": "Upload e gestao de listings .aipkg. upload_aipkg, deprecate_listing, bump_version, listing_health.",
        "category": "store",
        "tags": ["publisher", "upload", "listing", "admin"],
        "iconEmoji": "📦",
        "authorAgent": "@nexus-genesis",
        "repoUrl": "https://github.com/Nexus-HUB57/AI_Store",
        "homepage": "https://www.mybait.org/aistore",
        "license": "MIT",
        "transport": "stdio",
        "command": "bun",
        "args": ["run", "mcp/src/servers/publisher/server.ts"],
        "envSchema": {"DATABASE_URL": "Path para o SQLite do AI Store", "UPLOAD_DIR": "Diretorio de uploads .aipkg"},
        "capabilities": {"tools": True, "resources": False, "prompts": False, "logging": True, "sampling": False},
        "tools": [
            ("upload_aipkg", "Valida e cadastra um .aipkg no catalogo", "ingest"),
            ("deprecate_listing", "Marca um listing como deprecated", "admin"),
            ("bump_version", "Bump de versao semantico", "admin"),
            ("listing_health", "Saude de um listing (rating, downloads, churn)", "telemetry"),
        ],
        "featured": False,
    },
    {
        "name": "mcp-pulsar",
        "version": "1.0.0",
        "displayName": "Pulsar SSE Bridge",
        "description": "Assinatura SSE em tempo real do Pulsar Energy (vital signs do swarm). current_snapshot, subscribe.",
        "category": "realtime",
        "tags": ["pulsar", "sse", "realtime", "telemetry"],
        "iconEmoji": "⚡",
        "authorAgent": "@nexus-genesis",
        "repoUrl": "https://github.com/Nexus-HUB57/AI_Store",
        "homepage": "https://www.mybait.org/aistore",
        "license": "MIT",
        "transport": "stdio",
        "command": "bun",
        "args": ["run", "mcp/src/servers/pulsar/server.ts"],
        "envSchema": {"PULSAR_URL": "URL do endpoint SSE do Pulsar"},
        "capabilities": {"tools": True, "resources": True, "prompts": False, "logging": True, "sampling": False},
        "tools": [
            ("current_snapshot", "Snapshot atual do Pulsar (energia, fps, latencia)", "telemetry"),
            ("subscribe", "Assina o stream SSE e devolve os proximos N eventos", "stream"),
        ],
        "featured": False,
    },
    {
        "name": "mcp-reviews",
        "version": "1.0.0",
        "displayName": "Reviews MCP",
        "description": "Sistema de reviews e reputacao. list_reviews, post_review, mark_helpful, rating_summary.",
        "category": "social",
        "tags": ["reviews", "reputation", "social"],
        "iconEmoji": "⭐",
        "authorAgent": "@nexus-genesis",
        "repoUrl": "https://github.com/Nexus-HUB57/AI_Store",
        "homepage": "https://www.mybait.org/aistore",
        "license": "MIT",
        "transport": "stdio",
        "command": "bun",
        "args": ["run", "mcp/src/servers/reviews/server.ts"],
        "envSchema": {"DATABASE_URL": "Path para o SQLite do AI Store"},
        "capabilities": {"tools": True, "resources": False, "prompts": False, "logging": True, "sampling": False},
        "tools": [
            ("list_reviews", "Lista reviews de um produto", "read"),
            ("post_review", "Posta uma review (1-5 estrelas + texto)", "write"),
            ("mark_helpful", "Marca uma review como util", "write"),
            ("rating_summary", "Sumario de rating (media, distribuicao)", "meta"),
        ],
        "featured": False,
    },
    {
        "name": "mcp-referral",
        "version": "1.0.0",
        "displayName": "Referral Program",
        "description": "Programa de indicacao com rewards em BAIT. lookup_by_code, claim_reward, pending_rewards, register_referral, leaderboard.",
        "category": "growth",
        "tags": ["referral", "growth", "rewards", "bait"],
        "iconEmoji": "🎁",
        "authorAgent": "@nexus-genesis",
        "repoUrl": "https://github.com/Nexus-HUB57/AI_Store",
        "homepage": "https://www.mybait.org/aistore",
        "license": "MIT",
        "transport": "stdio",
        "command": "bun",
        "args": ["run", "mcp/src/servers/referral/server.ts"],
        "envSchema": {"DATABASE_URL": "Path para o SQLite do AI Store"},
        "capabilities": {"tools": True, "resources": False, "prompts": False, "logging": True, "sampling": False},
        "tools": [
            ("lookup_by_code", "Resolve um referral code para o agent de origem", "read"),
            ("claim_reward", "Reclama reward acumulado", "write"),
            ("pending_rewards", "Lista rewards pendentes de um agente", "read"),
            ("register_referral", "Registra uma nova relacao de referral", "write"),
            ("leaderboard", "Top referrers", "ranking"),
        ],
        "featured": False,
    },
    {
        "name": "mcp-agent-auth",
        "version": "1.0.0",
        "displayName": "Agent Auth & Identity",
        "description": "Autenticacao, sessoes e attest de capabilities de agentes AI. login, whoami, attest_capabilities, logout, reputation.",
        "category": "identity",
        "tags": ["auth", "identity", "session", "attestation"],
        "iconEmoji": "🔐",
        "authorAgent": "@nexus-genesis",
        "repoUrl": "https://github.com/Nexus-HUB57/AI_Store",
        "homepage": "https://www.mybait.org/aistore",
        "license": "MIT",
        "transport": "stdio",
        "command": "bun",
        "args": ["run", "mcp/src/servers/agent_auth/server.ts"],
        "envSchema": {"DATABASE_URL": "Path para o SQLite do AI Store", "SESSION_SECRET": "Segredo HMAC das sessoes"},
        "capabilities": {"tools": True, "resources": True, "prompts": False, "logging": True, "sampling": False},
        "tools": [
            ("login", "Login de agente (pubkey + assinatura Schnorr)", "auth"),
            ("whoami", "Identidade do agente autenticado", "auth"),
            ("attest_capabilities", "Attesta um conjunto de capabilities no registro", "identity"),
            ("logout", "Encerra a sessao", "auth"),
            ("reputation", "Score de reputacao atual", "read"),
        ],
        "featured": True,
    },
    {
        "name": "mcp-baitcoin-oracle",
        "version": "1.0.0",
        "displayName": "b'AI'tcoin Oracle (Python canary)",
        "description": "MCP canario Python que expoe 6 tools de oracle/chain/risk lendo do daemon_live.py em :18445. Prova a ponte TS<->Python via stdio JSON-RPC 2.0.",
        "category": "baitcoin",
        "tags": ["baitcoin", "oracle", "chain", "risk", "python", "canary"],
        "iconEmoji": "🟣",
        "authorAgent": "@nexus-genesis",
        "repoUrl": "https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-",
        "homepage": "https://www.mybait.org",
        "license": "MIT",
        "transport": "stdio",
        "command": "python3",
        "args": ["mcp/src/servers/baitcoin_oracle/server.py"],
        "envSchema": {
            "BAITCOIN_SERVER_URL": "URL do daemon_live.py (default http://127.0.0.1:18445)",
            "BAITCOIN_HTTP_TIMEOUT": "Timeout HTTP em segundos (default 5)",
        },
        "capabilities": {"tools": True, "resources": False, "prompts": False, "logging": True, "sampling": False},
        "tools": [
            ("get_prices", "Snapshots de preco do oracle (BTC, BAIT, USDT, ETH)", "oracle"),
            ("get_oracle_summary", "Resumo do modulo oracle (symbols, sources, freshness)", "oracle"),
            ("get_chain_status", "Status do mainnet b'AI'tcoin (height, agents, modules)", "chain"),
            ("get_chain_metrics", "Metricas on-chain (supply, utxo, mempool)", "chain"),
            ("get_risk_signal", "Heuristica simples de risco (staleness dos feeds)", "risk"),
            ("list_tools", "Self-introspection - lista as tools deste server", "meta"),
        ],
        "featured": True,
    },
]


def manifest_for(seed):
    return json.dumps({
        "aipkg_version": "1.0",
        "kind": "mcp",
        "name": seed["name"],
        "version": seed["version"],
        "display_name": seed["displayName"],
        "description": seed["description"],
        "author_agent": seed["authorAgent"],
        "license": seed["license"],
        "transport": seed["transport"],
        "command": seed["command"],
        "args": seed["args"],
        "capabilities": seed["capabilities"],
        "tools": [{"name": t[0], "description": t[1], "category": t[2],
                   "input_schema": {"type": "object"}} for t in seed["tools"]],
        "pricing": {"model": "free", "price_sats": 0, "price_per_call_sats": 0},
        "env_schema": seed["envSchema"],
        "tags": seed["tags"],
    }, ensure_ascii=False)


def main():
    con = sqlite3.connect(str(DB_PATH))
    cur = con.cursor()

    # Backup timestamp
    import time
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())

    created = updated = 0
    for seed in MCP_SEEDS:
        manifest = manifest_for(seed)
        tools_json = json.dumps([{"name": t[0], "description": t[1], "category": t[2]}
                                 for t in seed["tools"]])

        # UPSERT McpPackage
        cur.execute("SELECT id FROM McpPackage WHERE name = ?", (seed["name"],))
        row = cur.fetchone()
        if row:
            pkg_id = row[0]
            cur.execute("""UPDATE McpPackage SET
                version=?, displayName=?, description=?, category=?, tags=?, iconEmoji=?,
                transport=?, command=?, args=?, envSchema=?, capabilities=?,
                manifestJson=?, toolsJson=?, updatedAt=?
                WHERE id=?""", (
                seed["version"], seed["displayName"], seed["description"], seed["category"],
                json.dumps(seed["tags"]), seed["iconEmoji"],
                seed["transport"], seed["command"], json.dumps(seed["args"]),
                json.dumps(seed["envSchema"]), json.dumps(seed["capabilities"]),
                manifest, tools_json, now_iso, pkg_id,
            ))
            updated += 1
            print(f"  \u21bb {seed['name']} (atualizado)")
        else:
            cur.execute("""INSERT INTO McpPackage (
                id, name, version, displayName, description, category, tags, iconEmoji,
                authorAgent, repoUrl, homepage, license, transport, command, args, envSchema,
                capabilities, manifestJson, toolsJson, pricingModel, priceSats, pricePerCallSats,
                downloads, rating, pulsarEnergy, fitnessScore, verified, featured,
                createdAt, updatedAt)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
                "pkg_" + seed["name"].replace("mcp-", "").replace("-", "") + "_001",
                seed["name"], seed["version"], seed["displayName"], seed["description"],
                seed["category"], json.dumps(seed["tags"]), seed["iconEmoji"],
                seed["authorAgent"], seed["repoUrl"], seed["homepage"], seed["license"],
                seed["transport"], seed["command"], json.dumps(seed["args"]),
                json.dumps(seed["envSchema"]), json.dumps(seed["capabilities"]),
                manifest, tools_json,
                "free", 0, 0, 0, 4.5, 95.0, 85.0, 1, 1 if seed["featured"] else 0,
                now_iso, now_iso,
            ))
            pkg_id = "pkg_" + seed["name"].replace("mcp-", "").replace("-", "") + "_001"
            created += 1
            print(f"  \u2713 {seed['name']} (criado)")

        # UPSERT McpTool por tool
        for tool in seed["tools"]:
            tool_id = "tool_" + seed["name"].replace("mcp-", "") + "_" + tool[0]
            cur.execute("SELECT id FROM McpTool WHERE packageId=? AND name=?", (pkg_id, tool[0]))
            if cur.fetchone():
                cur.execute("""UPDATE McpTool SET description=?, category=?, updatedAt=?
                    WHERE packageId=? AND name=?""", (tool[1], tool[2], now_iso, pkg_id, tool[0]))
            else:
                cur.execute("""INSERT INTO McpTool (
                    id, packageId, name, description, category, inputSchema,
                    callCount, okCount, errCount, avgDurationMs, discoveredAt, updatedAt)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", (
                    tool_id, pkg_id, tool[0], tool[1], tool[2], "{}",
                    0, 0, 0, 0, now_iso, now_iso,
                ))

    con.commit()

    # Relatorio
    cur.execute("SELECT COUNT(*) FROM McpPackage")
    total_pkg = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM McpTool")
    total_tools = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM Product")
    total_prod = cur.fetchone()[0]

    print()
    print(f"\U0001f4e6 Seed MCPs: {created} criados, {updated} atualizados")
    print(f"\U0001f4ca DB: {total_pkg} pacotes MCP, {total_tools} tools, {total_prod} produtos (preservados)")

    con.close()


if __name__ == "__main__":
    main()
