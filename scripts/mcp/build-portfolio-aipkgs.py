#!/usr/bin/env python3
"""Build the 34 portfolio MCPs as verifiable .aipkg archives.

The archive format matches the existing AI Store packer:
manifest.json, server sources under server/, and checksum.sha256.
The script intentionally packages source plus manifest; Python/Bun host
runtimes and external dependencies remain declared by the manifest command.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STORE_SERVERS = {
    "mcp-catalog": "catalog",
    "mcp-publisher": "publisher",
    "mcp-pulsar": "pulsar",
    "mcp-reviews": "reviews",
    "mcp-referral": "referral",
    "mcp-agent-auth": "agent_auth",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--store-root", type=Path, default=ROOT)
    parser.add_argument("--baitcoin-root", type=Path, default=ROOT.parent / "b-AI-tcoin-AI-to-AI")
    parser.add_argument("--seed", type=Path, default=ROOT / "scripts/mcp/seed/mcp_portfolio.json")
    parser.add_argument("--out", type=Path, default=ROOT / "artifacts/mcp-portfolio-aipkg")
    parser.add_argument("--clean", action="store_true", help="remove old .aipkg files before building")
    return parser.parse_args()


def manifest_for(entry: dict) -> dict:
    raw = entry.get("manifestJson")
    if isinstance(raw, str) and raw:
        manifest = json.loads(raw)
    else:
        tools = json.loads(entry.get("toolsJson", "[]"))
        manifest = {
            "aipkg": "1.0",
            "kind": "mcp",
            "name": entry["name"],
            "version": entry["version"],
            "displayName": entry["displayName"],
            "description": entry["description"],
            "author": {"agentId": entry["authorAgent"], "displayName": "Nexus Genesis", "verified": bool(entry.get("verified"))},
            "category": entry["category"],
            "tags": entry.get("tags", []),
            "iconEmoji": entry.get("iconEmoji", "🧩"),
            "license": entry.get("license", "MIT"),
            "repository": entry.get("repoUrl", ""),
            "homepage": entry.get("homepage", ""),
            "mcp": {
                "transport": entry.get("transport", "stdio"),
                "command": entry.get("command", ""),
                "args": entry.get("args", []),
                "env": entry.get("envSchema", {}),
                "capabilities": entry.get("capabilities", {}),
                "minProtocolVersion": "2024-11-05",
            },
            "runtime": {"memoryMb": 256, "cpuMillicores": 500, "timeoutMs": 30000, "sandbox": "process"},
            "tools": tools,
            "pricing": {
                "model": entry.get("pricingModel", "free"),
                "priceSats": entry.get("priceSats", 0),
                "pricePerCallSats": entry.get("pricePerCallSats", 0),
            },
            "telemetry": {"emitTo": "pulsar", "includeCallPayload": False, "sampleRate": 1},
        }
    # The seed is the source of truth for prices; keep manifest and DB aligned.
    manifest.setdefault("pricing", {})
    manifest["pricing"].update({
        "model": entry.get("pricingModel", manifest["pricing"].get("model", "free")),
        "priceSats": entry.get("priceSats", manifest["pricing"].get("priceSats", 0)),
        "pricePerCallSats": entry.get("pricePerCallSats", manifest["pricing"].get("pricePerCallSats", 0)),
    })
    return manifest


def source_dir(entry: dict, store_root: Path, baitcoin_root: Path) -> Path:
    name = entry["name"]
    if name in STORE_SERVERS:
        return store_root / "mcp/src/servers" / STORE_SERVERS[name]
    return baitcoin_root / "mcp/servers" / name.removeprefix("mcp-")


def payload_files(directory: Path) -> list[tuple[str, bytes]]:
    files: list[tuple[str, bytes]] = []
    for path in sorted(directory.rglob("*")):
        if not path.is_file() or path.name == "manifest.json":
            continue
        if path.suffix not in {".py", ".ts", ".json"} and path.name != "README.md":
            continue
        files.append((f"server/{path.relative_to(directory).as_posix()}", path.read_bytes()))
    if not files:
        raise RuntimeError(f"no executable source files found in {directory}")
    return files


def checksum(files: list[tuple[str, bytes]]) -> str:
    digest = hashlib.sha256()
    for name, data in files:
        digest.update(name.encode())
        digest.update(b"\n")
        digest.update(data)
        digest.update(b"\n")
    return digest.hexdigest()


def build(entry: dict, store_root: Path, baitcoin_root: Path, out: Path) -> Path:
    manifest = manifest_for(entry)
    if manifest.get("name") != entry["name"]:
        raise RuntimeError(f"manifest name mismatch for {entry['name']}")
    directory = source_dir(entry, store_root, baitcoin_root)
    if not directory.is_dir():
        raise RuntimeError(f"source directory missing for {entry['name']}: {directory}")
    files = [("manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False).encode())]
    files.extend(payload_files(directory))
    digest = checksum(files)
    files.append(("checksum.sha256", f"{digest}  .\n".encode()))
    target = out / f"{entry['name']}-{entry['version']}.aipkg"
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_STORED) as archive:
        for name, data in files:
            info = zipfile.ZipInfo(name)
            info.date_time = (1980, 1, 1, 0, 0, 0)
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    return target


def verify(path: Path) -> None:
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if "manifest.json" not in names or "checksum.sha256" not in names:
            raise RuntimeError(f"{path.name}: missing manifest/checksum")
        source_names = [(n, archive.read(n)) for n in names if n != "checksum.sha256"]
        expected = archive.read("checksum.sha256").decode().split()[0]
        actual = checksum(source_names)
        if expected != actual:
            raise RuntimeError(f"{path.name}: checksum mismatch")
        manifest = json.loads(archive.read("manifest.json"))
        if manifest.get("kind") != "mcp" or not any(n.startswith("server/") for n in names):
            raise RuntimeError(f"{path.name}: invalid executable MCP payload")


def main() -> None:
    args = parse_args()
    seed = json.loads(args.seed.read_text())
    entries = seed["packages"] + seed["storeMcpServers"]
    if len(entries) != 34:
        raise SystemExit(f"expected 34 portfolio entries, got {len(entries)}")
    if args.clean and args.out.exists():
        for old in args.out.glob("*.aipkg"):
            old.unlink()
    args.out.mkdir(parents=True, exist_ok=True)
    built = []
    for entry in entries:
        path = build(entry, args.store_root, args.baitcoin_root, args.out)
        verify(path)
        built.append(path)
        print(f"✓ {path.name} ({path.stat().st_size} bytes)")
    print(f"✅ built and verified {len(built)} .aipkg archives in {args.out}")


if __name__ == "__main__":
    main()
