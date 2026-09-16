#!/usr/bin/env node
/**
 * pack-aipkg.mjs — Package an MCP server as a portable .aipkg archive.
 *
 * Usage:
 *   node scripts/pack-aipkg.mjs <mcp-name> [--out out/] [--baitcoin-root ../b-AI-tcoin-AI-to-AI-]
 *
 * Produces <mcp-name>-<version>.aipkg containing:
 *   manifest.json
 *   server/<runtime files>
 *   README.md (optional)
 *   checksum.sha256
 */

import { readdir, readFile, writeFile, stat, mkdir } from "node:fs/promises";
import path from "node:path";
import { createWriteStream } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: node scripts/pack-aipkg.mjs <mcp-name> [--out DIR] [--baitcoin-root DIR]");
  process.exit(2);
}

const mcpName = args[0];
const outDirIdx = args.indexOf("--out");
const outDir = outDirIdx >= 0 ? args[outDirIdx + 1] : "out";
const rootIdx = args.indexOf("--baitcoin-root");
const baitcoinRoot = rootIdx >= 0 ? args[rootIdx + 1] : "../b-AI-tcoin-AI-to-AI-";

const isBaitcoin = !["mcp-catalog", "mcp-publisher", "mcp-pulsar", "mcp-reviews", "mcp-referral", "mcp-agent-auth"].includes(mcpName);

const manifestPath = isBaitcoin
  ? path.join(baitcoinRoot, "mcp", "servers", mcpName, "manifest.json")
  : path.join("mcp/src/servers", mcpName, "manifest.json");

let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
} catch (e) {
  console.error(`cannot read manifest: ${manifestPath}`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, `${mcpName}-${manifest.version}.aipkg`);

// Minimal zip writer (store-only, no compression)
function zip(files, outPath) {
  return new Promise((resolve, reject) => {
    const out = createWriteStream(outPath);
    const central: Buffer[] = [];
    let offset = 0;

    function crc32(buf) {
      let c = 0xffffffff;
      for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
      return (c ^ 0xffffffff) >>> 0;
    }
    const table = (() => {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c >>> 0;
      }
      return t;
    })();

    (async () => {
      for (const f of files) {
        const data = f.data;
        const nameBuf = Buffer.from(f.name, "utf-8");
        const crc = crc32(data);

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);  // local file header
        local.writeUInt16LE(20, 4);          // version
        local.writeUInt16LE(0, 6);           // flags
        local.writeUInt16LE(0, 8);           // method (store)
        local.writeUInt16LE(0, 10);          // time
        local.writeUInt16LE(0, 12);          // date
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(data.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28);          // extra

        await new Promise<void>((res) => out.write(Buffer.concat([local, nameBuf, data]), () => res()));
        central.push(Buffer.concat([local, nameBuf]));
        offset += 30 + nameBuf.length + data.length;
      }

      const centralBuf = Buffer.concat(central);
      const eocd = Buffer.alloc(22);
      eocd.writeUInt32LE(0x06054b50, 0);
      eocd.writeUInt16LE(0, 4);
      eocd.writeUInt16LE(0, 6);
      eocd.writeUInt16LE(files.length, 8);
      eocd.writeUInt16LE(files.length, 10);
      eocd.writeUInt32LE(centralBuf.length, 12);
      eocd.writeUInt32LE(offset, 16);
      eocd.writeUInt16LE(0, 20);

      out.end(Buffer.concat([centralBuf, eocd]), () => resolve());
    })().catch(reject);

    out.on("error", reject);
  });
}

const serverDir = isBaitcoin
  ? path.join(baitcoinRoot, "mcp", "servers", mcpName)
  : path.join("mcp/src/servers", mcpName);

const entries: { name: string; data: Buffer }[] = [];
entries.push({ name: "manifest.json", data: Buffer.from(JSON.stringify(manifest, null, 2), "utf-8") });

// Walk the server dir and include server.py + manifest.json + README.md
async function walk(dir: string, prefix: string) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await walk(full, prefix + ent.name + "/");
    } else if (ent.name.endsWith(".py") || ent.name.endsWith(".ts") || ent.name === "README.md") {
      const data = await readFile(full);
      entries.push({ name: prefix + ent.name, data });
    }
  }
}
await walk(serverDir, "server/");

// Compute manifest hash
const sha = createHash("sha256");
for (const e of entries) sha.update(e.name + "\n" + e.data.toString("binary") + "\n");
const hash = sha.digest("hex");
entries.push({ name: "checksum.sha256", data: Buffer.from(`${hash}  .\n`, "utf-8") });

await zip(entries, outFile);
console.log(`✓ packed ${mcpName} v${manifest.version} → ${outFile}`);
console.log(`  entries: ${entries.length}, sha256: ${hash.slice(0, 16)}...`);