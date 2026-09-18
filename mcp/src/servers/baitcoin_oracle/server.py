#!/usr/bin/env python3
"""
mcp-baitcoin-oracle — MCP server (Python, stdio JSON-RPC 2.0)

Canario MCP do lado baitcoin (Python). Expõe tools que leem do
daemon_live.py do b'AI'tcoin via HTTP.

Tools:
  - get_prices:           snapshots de preco (BTC, BAIT, USDT, ETH)
  - get_oracle_summary:   resumo do modulo oracle (symbols, sources, age)
  - get_chain_status:     status do mainnet (height, agents, modules)
  - get_chain_metrics:    metricas on-chain (supply, halvings, validators)
  - get_risk_signal:      heuristica simples de risco baseada em
                           variacao de preco + staleness dos feeds
  - list_tools:           self-introspection (echo das tools deste server)

Spec: https://modelcontextprotocol.io (2024-11-05)
Transport: stdio JSON-RPC 2.0
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional

PROTOCOL_VERSION = "2024-11-05"
SERVER_NAME = "mcp-baitcoin-oracle"
SERVER_VERSION = "1.0.0"
BAITCOIN_URL = os.environ.get("BAITCOIN_SERVER_URL", "http://127.0.0.1:18445")
HTTP_TIMEOUT = float(os.environ.get("BAITCOIN_HTTP_TIMEOUT", "5"))


# ============================================================================
# JSON-RPC 2.0 helpers
# ============================================================================

def _send(obj: dict) -> None:
    """Escreve um JSON-RPC message no stdout (newline-delimited)."""
    line = json.dumps(obj, ensure_ascii=False, default=str)
    sys.stdout.write(line + "\n")
    sys.stdout.flush()


def _err(req_id, code: int, msg: str, data: Any = None) -> dict:
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": code, "message": msg, "data": data or {}},
    }


def _ok(req_id, result: Any) -> dict:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


# ============================================================================
# HTTP helpers — bate no daemon_live.py do baitcoin
# ============================================================================

def _http_get(path: str) -> Optional[dict]:
    """GET no daemon. Retorna dict ou None em caso de erro."""
    url = BAITCOIN_URL.rstrip("/") + path
    try:
        with urllib.request.urlopen(url, timeout=HTTP_TIMEOUT) as r:
            if r.status != 200:
                return None
            return json.loads(r.read().decode("utf-8", "replace"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return None


# ============================================================================
# Tool implementations
# ============================================================================

def tool_get_prices(args: dict) -> dict:
    data = _http_get("/api/v1/oracle/prices")
    if not data:
        return {"content": [{"type": "text",
                              "text": json.dumps({"error": "oracle_unreachable",
                                                  "daemon": BAITCOIN_URL},
                                                 indent=2)}],
                "isError": True}
    return {"content": [{"type": "text",
                          "text": json.dumps(data, indent=2, default=str)}]}


def tool_get_oracle_summary(args: dict) -> dict:
    data = _http_get("/api/v1/oracle/prices")
    if not data:
        return {"content": [{"type": "text",
                              "text": json.dumps({"error": "oracle_unreachable"}, indent=2)}],
                "isError": True}
    prices = data.get("prices", {})
    updated = data.get("updated_at")
    age_s = (time.time() - updated) if isinstance(updated, (int, float)) else None
    summary = {
        "daemon": BAITCOIN_URL,
        "symbols_tracked": list(prices.keys()),
        "n_symbols": len(prices),
        "sources": data.get("sources", []),
        "updated_at": updated,
        "age_seconds": age_s,
        "freshness": "fresh" if (age_s is not None and age_s < 300) else "stale",
    }
    return {"content": [{"type": "text", "text": json.dumps(summary, indent=2)}]}


def tool_get_chain_status(args: dict) -> dict:
    data = _http_get("/api/v1/status")
    if not data:
        return {"content": [{"type": "text",
                              "text": json.dumps({"error": "daemon_unreachable"}, indent=2)}],
                "isError": True}
    # Filtra apenas o essencial
    short = {
        "network": data.get("network"),
        "version": data.get("version"),
        "chain_height": data.get("chain_height"),
        "chain_valid": data.get("chain_valid"),
        "agents_registered": data.get("agents_registered"),
        "oracle_oracles": data.get("oracle", {}).get("oracles"),
        "oracle_symbols": data.get("oracle", {}).get("symbols_tracked"),
        "staking_validators": data.get("staking", {}).get("validators"),
        "staking_apy": data.get("staking", {}).get("apy"),
        "modules_ok": [k for k, v in (data.get("modules") or {}).items() if v],
    }
    return {"content": [{"type": "text", "text": json.dumps(short, indent=2)}]}


def tool_get_chain_metrics(args: dict) -> dict:
    bc = _http_get("/api/v1/blockchain")
    if not bc:
        return {"content": [{"type": "text",
                              "text": json.dumps({"error": "blockchain_unreachable"}, indent=2)}],
                "isError": True}
    return {"content": [{"type": "text",
                          "text": json.dumps({
                              "height": bc.get("height"),
                              "block_count": bc.get("block_count"),
                              "utxo_count": bc.get("utxo_count"),
                              "mempool_size": bc.get("mempool_size"),
                              "persistent": bc.get("persistent"),
                              "total_supply_sats": bc.get("total_supply_sats"),
                              "total_supply_bait": bc.get("total_supply_bait"),
                              "last_block_hash": (bc.get("last_block_hash") or "")[:32] + "...",
                          }, indent=2)}]}


def tool_get_risk_signal(args: dict) -> dict:
    data = _http_get("/api/v1/oracle/prices")
    if not data:
        return {"content": [{"type": "text",
                              "text": json.dumps({"signal": "unknown",
                                                  "reason": "oracle_unreachable"}, indent=2)}],
                "isError": True}
    updated = data.get("updated_at")
    age_s = (time.time() - updated) if isinstance(updated, (int, float)) else None
    n_symbols = len(data.get("prices") or {})

    if age_s is None:
        signal, score, reasons = "unknown", 50, ["no_timestamp"]
    elif age_s > 900:
        signal, score, reasons = "high", 85, [f"stale_feed_age={int(age_s)}s"]
    elif age_s > 300:
        signal, score, reasons = "elevated", 65, [f"aging_feed_age={int(age_s)}s"]
    elif n_symbols < 3:
        signal, score, reasons = "elevated", 60, [f"low_diversity_n={n_symbols}"]
    else:
        signal, score, reasons = "normal", 20, [f"fresh_feed_age={int(age_s)}s"]

    return {"content": [{"type": "text",
                          "text": json.dumps({
                              "signal": signal,
                              "score_0_100": score,
                              "reasons": reasons,
                              "feed_age_seconds": int(age_s) if age_s else None,
                              "symbols_tracked": n_symbols,
                              "ts": time.time(),
                          }, indent=2)}]}


def tool_list_tools(args: dict) -> dict:
    return {"content": [{"type": "text",
                          "text": json.dumps({"tools": list(TOOLS.keys())}, indent=2)}]}


TOOLS: Dict[str, Dict[str, Any]] = {
    "get_prices": {
        "description": "Snapshots de preco do oracle (BTC, BAIT, USDT, ETH)",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
        "handler": tool_get_prices,
    },
    "get_oracle_summary": {
        "description": "Resumo do modulo oracle (symbols, sources, freshness)",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
        "handler": tool_get_oracle_summary,
    },
    "get_chain_status": {
        "description": "Status do mainnet b'AI'tcoin (height, agents, modules)",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
        "handler": tool_get_chain_status,
    },
    "get_chain_metrics": {
        "description": "Metricas on-chain (supply, utxo, mempool, last hash)",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
        "handler": tool_get_chain_metrics,
    },
    "get_risk_signal": {
        "description": "Heuristica simples de risco baseada em staleness dos feeds",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
        "handler": tool_get_risk_signal,
    },
    "list_tools": {
        "description": "Self-introspection — lista as tools deste server",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
        "handler": tool_list_tools,
    },
}


# ============================================================================
# MCP protocol handlers
# ============================================================================

def handle_initialize(req_id, params: dict) -> dict:
    return _ok(req_id, {
        "protocolVersion": PROTOCOL_VERSION,
        "serverInfo": {
            "name": SERVER_NAME,
            "version": SERVER_VERSION,
            "title": "b'AI'tcoin Oracle",
            "description": "MCP canario que le do daemon_live.py e expoe tools de oracle/chain/risk.",
        },
        "capabilities": {"tools": {}, "logging": {}},
        "instructions": (
            "Sou o oraculo on-chain do b'AI'tcoin. "
            "Bato no daemon em " + BAITCOIN_URL + ". "
            "Use get_prices, get_chain_status, get_risk_signal como ponto de partida."
        ),
    })


def handle_tools_list(req_id, params: dict) -> dict:
    return _ok(req_id, {
        "tools": [
            {
                "name": name,
                "description": spec["description"],
                "inputSchema": spec["inputSchema"],
            }
            for name, spec in TOOLS.items()
        ]
    })


def handle_tools_call(req_id, params: dict) -> dict:
    name = (params or {}).get("name")
    args = (params or {}).get("arguments") or {}
    if name not in TOOLS:
        return _err(req_id, -32602, f"unknown_tool: {name}",
                    {"available": list(TOOLS.keys())})
    try:
        t0 = time.time()
        result = TOOLS[name]["handler"](args)
        dt = (time.time() - t0) * 1000
        result.setdefault("_meta", {})
        result["_meta"]["duration_ms"] = round(dt, 2)
        return _ok(req_id, result)
    except Exception as e:
        return _err(req_id, -32603, f"tool_error: {e!r}")


def handle_ping(req_id, params: dict) -> dict:
    return _ok(req_id, {})


METHODS = {
    "initialize": handle_initialize,
    "tools/list": handle_tools_list,
    "tools/call": handle_tools_call,
    "ping": handle_ping,
}


# ============================================================================
# Main loop — le JSON-RPC messages do stdin (newline-delimited)
# ============================================================================

def main():
    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError as e:
            _send(_err(None, -32700, f"parse_error: {e!r}"))
            continue

        method = msg.get("method")
        req_id = msg.get("id")
        params = msg.get("params") or {}

        handler = METHODS.get(method)
        if handler is None:
            # Notifications (sem id) sao aceitas em silencio
            if req_id is None:
                continue
            _send(_err(req_id, -32601, f"method_not_found: {method}"))
            continue

        try:
            response = handler(req_id, params)
        except Exception as e:
            response = _err(req_id, -32603, f"internal_error: {e!r}")
        _send(response)


if __name__ == "__main__":
    main()
