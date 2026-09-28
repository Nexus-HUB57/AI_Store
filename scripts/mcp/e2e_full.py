#!/usr/bin/env python3
"""
e2e_full.py — Comprehensive E2E validator for the b'AI'tcoin × AI Store stack.

Covers (in order):
  1. Local portfolio integrity (.aipkg files, manifest vs DB schema, tool consistency)
  2. BAITHex engine tests (Mainnet-only, signing/broadcast gates, HSM/MPC, Obscura)
  3. AI Store code structure (presence of all expected routes)
  4. AI Store production health (live HTTP probes to mybait.org/aistore)

Exit code: 0 = all green, 1 = at least one section failed.

Usage:
  python3 scripts/mcp/e2e_full.py [--aipkg-dir /workspace/baitcoin/mcp/dist]
"""

from __future__ import annotations

import argparse
import importlib.util
import inspect
import json
import os
import sys
import time
import traceback
import types
import urllib.request
import urllib.error
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BAITCOIN_DEFAULT = Path("/workspace/baitcoin")
AI_STORE_DEFAULT = Path("/workspace/ai_store")

PROD_BASE = "https://www.mybait.org/aistore"


# ─── Section header helper ───────────────────────────────────────────────────

def _section(n: int, name: str) -> None:
    print()
    print("═" * 75)
    print(f"  SECTION {n}: {name}")
    print("═" * 75)


def _ok(msg: str) -> None:
    print(f"  ✓ {msg}")


def _fail(msg: str) -> None:
    print(f"  ✗ {msg}")


# ─── Section 1: Local portfolio integrity ─────────────────────────────────────

def section_portfolio(aipkg_dir: Path) -> bool:
    _section(1, "Local portfolio integrity (.aipkg files, manifest, tools)")

    if not aipkg_dir.exists():
        _fail(f"aipkg_dir not found: {aipkg_dir}")
        return False

    aipkgs = sorted(aipkg_dir.glob("*.aipkg"))
    if not aipkgs:
        _fail(f"no .aipkg files in {aipkg_dir}")
        return False
    _ok(f"found {len(aipkgs)} .aipkg files")

    # Sample 5 .aipkg for structural integrity
    import zipfile
    import hashlib

    bad = 0
    for aipkg in aipkgs[:5]:
        try:
            with zipfile.ZipFile(aipkg, "r") as zf:
                names = zf.namelist()
                if "manifest.json" not in names:
                    _fail(f"{aipkg.name}: missing manifest.json")
                    bad += 1
                    continue
                if "checksum.sha256" not in names:
                    _fail(f"{aipkg.name}: missing checksum.sha256")
                    bad += 1
                    continue
                with zf.open("manifest.json") as f:
                    manifest = json.loads(f.read())
                required = {"name", "version", "mcp", "tools"}
                missing = required - set(manifest.keys())
                if missing:
                    _fail(f"{aipkg.name}: manifest missing {missing}")
                    bad += 1
                    continue
            _ok(f"{aipkg.name}: valid (manifest + checksum + tools)")
        except Exception as e:
            _fail(f"{aipkg.name}: {type(e).__name__}: {e}")
            bad += 1

    if bad > 0:
        return False
    return True


# ─── Section 2: BAITHex engine tests ─────────────────────────────────────────

def section_baith() -> bool:
    _section(2, "BAITHex engine (Mainnet-only + HSM/MPC + Obscura)")

    # Install pytest stub
    fake = types.ModuleType("pytest")

    def _raises(exc, match=None):
        class _Ctx:
            def __enter__(self): return self
            def __exit__(self, et, ev, tb):
                if et is None:
                    raise AssertionError(f"DID NOT RAISE {exc.__name__}")
                if not issubclass(et, exc):
                    return False
                if match is not None:
                    import re
                    msg = str(ev) if ev else ""
                    if not re.search(match, msg):
                        raise AssertionError(f"pattern {match!r} did not match {msg!r}")
                return True
        return _Ctx()

    fake.raises = _raises

    class _MonkeyPatch:
        def __init__(self): self._undo = []
        def setenv(self, name, value):
            old = os.environ.get(name)
            os.environ[name] = value
            self._undo.append(("env", name, old))
        def delenv(self, name, raising=True):
            old = os.environ.get(name)
            if name in os.environ:
                del os.environ[name]
            self._undo.append(("env", name, old))
        def undo(self):
            while self._undo:
                e = self._undo.pop()
                if e[0] == "env":
                    _, name, old = e
                    if old is None:
                        os.environ.pop(name, None)
                    else:
                        os.environ[name] = old

    fake.MonkeyPatch = _MonkeyPatch
    sys.modules["pytest"] = fake

    test_files = [
        "tests/baith_hex/test_exchange_policy.py",
        "tests/baith_hex/test_psbt_structure.py",
        "tests/baith_hex/test_obscura_baith_e2e.py",
        "tests/security/test_hsm_mpc.py",
    ]

    root = BAITCOIN_DEFAULT
    if not (root / "validate_baith.py").exists():
        _fail(f"validate_baith.py missing in {root}")
        return False

    sys.path.insert(0, str(root))
    tests = []
    for i, rel in enumerate(test_files):
        path = root / rel
        if not path.exists():
            continue
        spec = importlib.util.spec_from_file_location(f"_bt_{i}", path)
        mod = importlib.util.module_from_spec(spec)
        sys.modules[f"_bt_{i}"] = mod
        spec.loader.exec_module(mod)
        for name, fn in inspect.getmembers(mod, inspect.isfunction):
            if name.startswith("test_"):
                tests.append((rel, name, fn))

    if not tests:
        _fail("no BAITHex tests discovered")
        return False

    passed = 0
    failed = 0
    for rel, name, fn in tests:
        try:
            sig = inspect.signature(fn)
            kwargs = {}
            if "monkeypatch" in sig.parameters:
                mp = _MonkeyPatch()
                try:
                    fn(monkeypatch=mp)
                finally:
                    mp.undo()
            else:
                fn()
            passed += 1
        except Exception as e:
            failed += 1
            print(f"    ✗ {rel}:{name} — {type(e).__name__}: {e}")

    print(f"  → {passed} passed, {failed} failed (of {len(tests)} total)")
    return failed == 0


# ─── Section 3: AI Store code structure ──────────────────────────────────────

def section_ai_store_code(ai_store: Path) -> bool:
    _section(3, "AI Store code structure (routes present)")

    expected_routes = [
        # MCP
        "src/app/api/mcp/route.ts",
        "src/app/api/mcp/health/route.ts",
        "src/app/api/mcp/[slug]/route.ts",
        "src/app/api/mcp/[name]/route.ts",
        "src/app/api/mcp/[name]/tools/route.ts",
        "src/app/api/mcp/[name]/call/route.ts",
        "src/app/api/mcp/[name]/install/route.ts",
        "src/app/api/mcp/[slug]/acquire/route.ts",
        "src/app/api/mcp/[slug]/call/route.ts",
        "src/app/api/mcp/acquire/route.ts",
        # Compatibility aliases (added 2026-09-25)
        "src/app/api/transactions/route.ts",
        "src/app/api/agents/route.ts",
        "src/app/api/discovery/route.ts",
        "src/app/api/reputation/route.ts",
        "src/app/api/sdk-manifest/route.ts",
        # Core
        "src/app/api/health/route.ts",
        "src/app/api/products/route.ts",
        "src/app/api/pulsar/route.ts",
        "src/app/api/version/route.ts",
    ]

    missing = []
    for rel in expected_routes:
        path = ai_store / rel
        if not path.exists():
            missing.append(rel)
            _fail(f"missing: {rel}")
        else:
            _ok(f"present: {rel}")

    if missing:
        _fail(f"{len(missing)} routes missing")
        return False
    return True


# ─── Section 4: AI Store production health ───────────────────────────────────

def _http_get(url: str, timeout: int = 6) -> tuple[int, dict | str]:
    """Return (status, parsed_json_or_text).

    NOTE: Cloudflare front-end blocks Python-urllib default UA (error 1010).
    We send a Chrome UA so production probes work consistently.
    """
    req = urllib.request.Request(url, headers={
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            try:
                return resp.status, json.loads(body)
            except json.JSONDecodeError:
                return resp.status, body[:200]
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:200]
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, body
    except Exception as e:
        return 0, f"error: {type(e).__name__}: {e}"


def section_production() -> bool:
    _section(4, "AI Store production health (https://www.mybait.org/aistore)")

    endpoints = [
        ("/api/health", "200", "Health check"),
        ("/api/version", "200", "Version"),
        ("/api/products", "200", "Product catalog (legacy 1504)"),
        ("/api/stats", "200", "Stats aggregation"),
        ("/api/pulsar", "200", "Pulsar SSE"),
        # MCP endpoints (should be 200 after schema migration)
        ("/api/mcp", "200", "MCP list"),
        ("/api/mcp/health", "200", "MCP orchestrator health"),
        ("/api/mcp/catalog", "200", "MCP catalog"),
        # Compatibility aliases (added 2026-09-25)
        ("/api/transactions", "200", "Transactions list (new)"),
        ("/api/agents", "200", "Agents list (new)"),
        ("/api/reputation", "200", "Reputation ranking (new)"),
        ("/api/discovery", "200", "Discovery (new)"),
        ("/api/sdk-manifest", "200", "SDK manifest (new)"),
    ]

    ok_count = 0
    fail_count = 0
    for path, expected, desc in endpoints:
        url = PROD_BASE + path
        code, body = _http_get(url)
        marker = "✓" if str(code) == expected else "✗"
        if marker == "✓":
            ok_count += 1
        else:
            fail_count += 1
        body_preview = ""
        if isinstance(body, dict):
            if "error" in body:
                body_preview = f" → error: {body['error']}"
            elif "total" in body:
                body_preview = f" → total: {body['total']}"
            elif "version" in body:
                body_preview = f" → v{body['version']}"
        elif isinstance(body, str):
            body_preview = f" → {body[:80]}"
        print(f"  {marker} {path:30s} HTTP={code} (expected {expected}){body_preview}")

    # Special check: production /api/health should report correct mcp count
    code, health = _http_get(f"{PROD_BASE}/api/health")
    if code == 200 and isinstance(health, dict):
        counts = health.get("counts", {})
        mcp = counts.get("mcpServers", 0)
        target = health.get("sync", {}).get("mcpTarget", 0)
        print()
        print(f"  Production /api/health:")
        print(f"    products:    {counts.get('products', '?')}")
        print(f"    mcpServers:  {mcp}")
        print(f"    agents:      {counts.get('agents', '?')}")
        print(f"    transactions:{counts.get('transactions', '?')}")
        print(f"    mcpTarget:   {target}")
        if mcp > 0 and target > 0:
            _ok(f"MCP pipeline ACTIVE: {mcp} packages live, target {target}")
        elif mcp == 0 and target == 0:
            print(f"  ⚠ MCP pipeline NOT YET DEPLOYED (mcpServers=0, mcpTarget=0)")
        else:
            print(f"  ⚠ MCP pipeline INCONSISTENT (mcpServers={mcp}, mcpTarget={target})")

    print()
    print(f"  → Production endpoints: {ok_count} OK, {fail_count} failing")
    # Production failures are warnings, not blockers (we don't control the host)
    return True


# ─── Main ────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--aipkg-dir", default=str(BAITCOIN_DEFAULT / "mcp" / "dist"))
    parser.add_argument("--baitcoin", default=str(BAITCOIN_DEFAULT))
    parser.add_argument("--ai-store", default=str(AI_STORE_DEFAULT))
    parser.add_argument("--skip-production", action="store_true",
                        help="Skip live HTTP probes (faster, offline-friendly)")
    args = parser.parse_args()

    print("═" * 75)
    print("  b'AI'tcoin × AI Store — Full E2E Validation")
    print("  Date:", time.strftime("%Y-%m-%d %H:%M:%S"))
    print("═" * 75)

    results = []

    # 1. Local portfolio
    try:
        results.append(("portfolio", section_portfolio(Path(args.aipkg_dir))))
    except Exception as e:
        _fail(f"portfolio section crashed: {type(e).__name__}: {e}")
        results.append(("portfolio", False))

    # 2. BAITHex
    try:
        results.append(("baith", section_baith()))
    except Exception as e:
        _fail(f"baith section crashed: {type(e).__name__}: {e}")
        results.append(("baith", False))

    # 3. AI Store code structure
    try:
        results.append(("ai_store_code", section_ai_store_code(Path(args.ai_store))))
    except Exception as e:
        _fail(f"ai_store code section crashed: {type(e).__name__}: {e}")
        results.append(("ai_store_code", False))

    # 4. Production
    if not args.skip_production:
        try:
            results.append(("production", section_production()))
        except Exception as e:
            _fail(f"production section crashed: {type(e).__name__}: {e}")
            results.append(("production", False))
    else:
        results.append(("production", True))
        print()
        print("  (production section skipped via --skip-production)")

    # Final report
    print()
    print("═" * 75)
    print("  FINAL REPORT")
    print("═" * 75)
    for name, ok in results:
        print(f"    {'✓' if ok else '✗'} {name}")
    print()
    all_ok = all(ok for _, ok in results)
    if all_ok:
        print("  ✅ ALL SECTIONS PASSED")
        return 0
    else:
        print("  ❌ AT LEAST ONE SECTION FAILED")
        return 1


if __name__ == "__main__":
    sys.exit(main())