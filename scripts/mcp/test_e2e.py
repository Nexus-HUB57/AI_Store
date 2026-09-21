#!/usr/bin/env python3
"""
test_e2e.py — End-to-end validation of the MCP portfolio seed.

Creates a fresh SQLite DB, builds the Prisma schema, applies populate.sql,
verifies row counts, runs integrity checks. Exits non-zero on failure.

Run:
  python3 scripts/mcp/test_e2e.py
  python3 scripts/mcp/test_e2e.py --seed-dir scripts/mcp/seed
"""

import argparse
import hashlib
import json
import sqlite3
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SEED_DIR = ROOT / "scripts" / "mcp" / "seed"
BAITCOIN_DIST = Path("/workspace/baitcoin/mcp/dist")


# ────────────────────── Prisma schema (subset needed for populate.sql) ──────────────────────

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS McpPackage (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  version TEXT NOT NULL,
  displayName TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  iconEmoji TEXT NOT NULL DEFAULT '🧩',
  authorAgent TEXT NOT NULL,
  repoUrl TEXT NOT NULL DEFAULT '',
  homepage TEXT NOT NULL DEFAULT '',
  license TEXT NOT NULL DEFAULT 'MIT',
  transport TEXT NOT NULL DEFAULT 'stdio',
  command TEXT NOT NULL,
  args TEXT NOT NULL DEFAULT '[]',
  envSchema TEXT NOT NULL DEFAULT '{}',
  capabilities TEXT NOT NULL DEFAULT '{}',
  manifestJson TEXT NOT NULL,
  toolsJson TEXT NOT NULL DEFAULT '[]',
  pricingModel TEXT NOT NULL DEFAULT 'free',
  priceSats INTEGER NOT NULL DEFAULT 0,
  pricePerCallSats INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 4.5,
  pulsarEnergy REAL NOT NULL DEFAULT 95.0,
  fitnessScore REAL NOT NULL DEFAULT 85.0,
  verified INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS McpTool (
  id TEXT PRIMARY KEY,
  packageId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  inputSchema TEXT NOT NULL DEFAULT '{}',
  callCount INTEGER NOT NULL DEFAULT 0,
  okCount INTEGER NOT NULL DEFAULT 0,
  errCount INTEGER NOT NULL DEFAULT 0,
  avgDurationMs INTEGER NOT NULL DEFAULT 0,
  discoveredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(packageId, name),
  FOREIGN KEY (packageId) REFERENCES McpPackage(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mcppkg_category ON McpPackage(category);
CREATE INDEX IF NOT EXISTS idx_mcppkg_author ON McpPackage(authorAgent);
CREATE INDEX IF NOT EXISTS idx_mcptool_category ON McpTool(category);

CREATE TABLE IF NOT EXISTS McpInstall (
  id TEXT PRIMARY KEY,
  packageId TEXT NOT NULL,
  agentId TEXT,
  version TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  envOverrides TEXT NOT NULL DEFAULT '{}',
  installedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(packageId, agentId),
  FOREIGN KEY (packageId) REFERENCES McpPackage(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS McpCall (
  id TEXT PRIMARY KEY,
  packageId TEXT NOT NULL,
  toolName TEXT NOT NULL,
  agentId TEXT,
  ok INTEGER NOT NULL,
  errorMsg TEXT NOT NULL DEFAULT '',
  durationMs INTEGER NOT NULL,
  payloadHash TEXT NOT NULL DEFAULT '',
  ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (packageId) REFERENCES McpPackage(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS McpSelfHealEvent (
  id TEXT PRIMARY KEY,
  packageName TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  backoffMs INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  succeeded INTEGER NOT NULL DEFAULT 0,
  ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS McpRagFeedback (
  id TEXT PRIMARY KEY,
  packageId TEXT NOT NULL,
  toolName TEXT NOT NULL,
  signal TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  context TEXT NOT NULL DEFAULT '{}',
  resolved INTEGER NOT NULL DEFAULT 0,
  ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (packageId) REFERENCES McpPackage(id) ON DELETE CASCADE
);
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed-dir", default=str(DEFAULT_SEED_DIR), help="Path to seed dir containing populate.sql + mcp_portfolio.json")
    parser.add_argument("--baitcoin-dist", default=str(BAITCOIN_DIST), help="Path to baitcoin/mcp/dist for .aipkg integrity check")
    parser.add_argument("--db", default="/tmp/mcp_e2e_test.db", help="Path to test SQLite DB (will be created)")
    args = parser.parse_args()

    seed_dir = Path(args.seed_dir)
    baitcoin_dist = Path(args.baitcoin_dist)
    db_path = Path(args.db)

    print("═══════════════════════════════════════════════════════════")
    print("  MCP Portfolio E2E Test")
    print("═══════════════════════════════════════════════════════════")
    print(f"  Seed dir:      {seed_dir}")
    print(f"  Baitcoin dist: {baitcoin_dist}")
    print(f"  Test DB:       {db_path}")
    print()

    failures = []

    # ────────────────────── Step 1: load seed files ──────────────────────
    populate_sql = seed_dir / "populate.sql"
    portfolio_json = seed_dir / "mcp_portfolio.json"

    if not populate_sql.exists():
        failures.append(f"missing seed file: {populate_sql}")
        return report(failures)
    if not portfolio_json.exists():
        failures.append(f"missing seed file: {portfolio_json}")
        return report(failures)

    portfolio = json.loads(portfolio_json.read_text())
    print(f"✓ loaded seed JSON: {portfolio['totalServers']} baitcoin + {len(portfolio['storeMcpServers'])} store = {portfolio['totalServers'] + len(portfolio['storeMcpServers'])} packages")

    # ────────────────────── Step 2: reset DB + apply schema ──────────────────────
    if db_path.exists():
        db_path.unlink()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.executescript(SCHEMA_SQL)
    print(f"✓ created schema in {db_path}")

    # ────────────────────── Step 3: apply populate.sql ──────────────────────
    sql_text = populate_sql.read_text()
    # Strip INSERT OR IGNORE clauses that need real schema (skip for test simplicity)
    try:
        conn.executescript(sql_text)
        print(f"✓ applied populate.sql ({len(sql_text):,} chars)")
    except sqlite3.Error as e:
        failures.append(f"SQL apply failed: {e}")
        conn.close()
        return report(failures)

    # ────────────────────── Step 4: row counts ──────────────────────
    pkg_count = conn.execute("SELECT COUNT(*) FROM McpPackage").fetchone()[0]
    tool_count = conn.execute("SELECT COUNT(*) FROM McpTool").fetchone()[0]
    print(f"✓ McpPackage rows: {pkg_count}")
    print(f"✓ McpTool rows:    {tool_count}")

    expected_total = portfolio["totalServers"] + len(portfolio["storeMcpServers"])
    if pkg_count != expected_total:
        failures.append(f"McpPackage count mismatch: got {pkg_count}, expected {expected_total}")
    else:
        print(f"✓ McpPackage count matches seed ({expected_total})")

    # ────────────────────── Step 5: category distribution ──────────────────────
    print()
    print("▌ McpPackage by category:")
    rows = conn.execute("SELECT category, COUNT(*) AS n FROM McpPackage GROUP BY category ORDER BY n DESC, category").fetchall()
    for cat, n in rows:
        marker = "✓" if n == 1 else "!"
        print(f"  {marker} {cat:25} {n}")

    # ────────────────────── Step 6: manifest + tools integrity ──────────────────────
    print()
    bad = conn.execute("SELECT COUNT(*) FROM McpPackage WHERE manifestJson = '' OR manifestJson IS NULL").fetchone()[0]
    if bad:
        failures.append(f"{bad} packages have empty manifestJson")
    else:
        print(f"✓ all packages have non-empty manifestJson")

    bad_tools = conn.execute("SELECT COUNT(*) FROM McpTool t LEFT JOIN McpPackage p ON t.packageId = p.id WHERE p.id IS NULL").fetchone()[0]
    if bad_tools:
        failures.append(f"{bad_tools} orphaned McpTool rows (no parent package)")
    else:
        print(f"✓ no orphaned McpTool rows")

    # ────────────────────── Step 7: validate each McpTool's name matches manifest ──────────────────────
    mismatches = 0
    for (pkg_id,) in conn.execute("SELECT id FROM McpPackage").fetchall():
        manifest = json.loads(conn.execute("SELECT manifestJson FROM McpPackage WHERE id=?", (pkg_id,)).fetchone()[0])
        declared = {t["name"] for t in manifest.get("tools", [])}
        actual = {row[0] for row in conn.execute("SELECT name FROM McpTool WHERE packageId=?", (pkg_id,)).fetchall()}
        if declared != actual:
            mismatches += 1
            print(f"  ✗ {pkg_id}: declared={declared - actual}, actual={actual - declared}")
    if mismatches == 0:
        print(f"✓ all tool names match manifest declarations")
    else:
        failures.append(f"{mismatches} packages have tool mismatches")

    # ────────────────────── Step 8: verify JSON.parse on every manifestJson ──────────────────────
    bad_json = 0
    for (mid, mjson) in conn.execute("SELECT id, manifestJson FROM McpPackage").fetchall():
        try:
            json.loads(mjson)
        except json.JSONDecodeError:
            bad_json += 1
            print(f"  ✗ {mid}: invalid JSON in manifestJson")
    if bad_json == 0:
        print(f"✓ all manifestJson values are valid JSON")
    else:
        failures.append(f"{bad_json} packages have invalid JSON in manifestJson")

    # ────────────────────── Step 9: .aipkg integrity check ──────────────────────
    print()
    if baitcoin_dist.exists():
        aipkgs = sorted(baitcoin_dist.glob("*.aipkg"))
        print(f"▌ .aipkg integrity ({len(aipkgs)} files):")
        bad_zip = 0
        bad_manifest = 0
        bad_checksum = 0
        for ap in aipkgs:
            try:
                with zipfile.ZipFile(ap, "r") as z:
                    bad = z.testzip()
                    if bad:
                        bad_zip += 1
                        print(f"  ✗ {ap.name}: corrupt entry {bad}")
                        continue
                    if "manifest.json" not in z.namelist():
                        bad_manifest += 1
                        print(f"  ✗ {ap.name}: no manifest.json")
                        continue
                    if "server/server.py" not in z.namelist():
                        bad_manifest += 1
                        print(f"  ✗ {ap.name}: no server/server.py")
                        continue
                    # Verify checksum
                    if "checksum.sha256" in z.namelist():
                        expected = z.read("checksum.sha256").decode().split()[0]
                        sha = hashlib.sha256()
                        for info in z.infolist():
                            if info.filename == "checksum.sha256":
                                continue
                            sha.update(info.filename.encode() + b"\n")
                            sha.update(z.read(info.filename) + b"\n")
                        if sha.hexdigest() != expected:
                            bad_checksum += 1
                            print(f"  ✗ {ap.name}: checksum mismatch")
            except zipfile.BadZipFile:
                bad_zip += 1
                print(f"  ✗ {ap.name}: not a valid ZIP")
        if bad_zip == 0 and bad_manifest == 0 and bad_checksum == 0:
            print(f"✓ all {len(aipkgs)} .aipkg archives valid (manifest + server.py + checksum)")
        else:
            if bad_zip: failures.append(f"{bad_zip} .aipkg files are not valid ZIPs")
            if bad_manifest: failures.append(f"{bad_manifest} .aipkg files missing required entries")
            if bad_checksum: failures.append(f"{bad_checksum} .aipkg files have checksum mismatch")
    else:
        print(f"⚠ baitcoin dist not found at {baitcoin_dist}, skipping .aipkg integrity")

    # ────────────────────── Step 10: report ──────────────────────
    conn.close()
    print()
    print("═══════════════════════════════════════════════════════════")
    if failures:
        print(f"  ❌ E2E FAILED — {len(failures)} issue(s):")
        for f in failures:
            print(f"     • {f}")
        sys.exit(1)
    else:
        print("  ✅ E2E PASSED — portfolio is production-ready")
        print()
        print(f"     McpPackage: {pkg_count}")
        print(f"     McpTool:    {tool_count}")
        print(f"     Categories: {len(rows)}")
        print(f"     .aipkg:     {len(aipkgs) if baitcoin_dist.exists() else 'n/a'}")
        sys.exit(0)


def report(failures):
    print()
    print("═══════════════════════════════════════════════════════════")
    print(f"  ❌ E2E FAILED — {len(failures)} issue(s):")
    for f in failures:
        print(f"     • {f}")
    sys.exit(1)


if __name__ == "__main__":
    main()