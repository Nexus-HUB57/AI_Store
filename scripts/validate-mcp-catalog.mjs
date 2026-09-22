#!/usr/bin/env node
/**
 * Deterministic cross-check for the six AI Store MCP packages.
 * Validates manifests against server tool declarations and exercises the .aipkg packer.
 * No database writes, network calls, broadcasts, or real-fund operations are performed.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const servers = ["catalog", "publisher", "pulsar", "reviews", "referral", "agent_auth"];
const outDir = join(root, ".mcp-validation-out");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

for (const server of servers) {
  const dir = join(root, "mcp", "src", "servers", server);
  const manifestPath = join(dir, "manifest.json");
  const sourcePath = join(dir, "server.ts");
  check(existsSync(manifestPath), `${server}: manifest.json is missing`);
  check(existsSync(sourcePath), `${server}: server.ts is missing`);
  if (!existsSync(manifestPath) || !existsSync(sourcePath)) continue;

  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestPath, "utf8")); }
  catch (error) { failures.push(`${server}: invalid JSON (${error.message})`); continue; }

  check(manifest.aipkg === "1.0", `${server}: aipkg must be 1.0`);
  check(manifest.kind === "mcp", `${server}: kind must be mcp`);
  check(manifest.name === `mcp-${server.replace("_", "-")}`, `${server}: name does not match directory`);
  check(manifest.mcp?.transport === "stdio", `${server}: transport must be stdio`);
  check(manifest.mcp?.command === "bun", `${server}: command must be bun`);
  check(Array.isArray(manifest.tools) && manifest.tools.length > 0, `${server}: tools list is empty`);

  const source = readFileSync(sourcePath, "utf8");
  const declared = [...source.matchAll(/server\.tool\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const listed = (manifest.tools ?? []).map((tool) => tool.name);
  check(declared.length === listed.length, `${server}: manifest has ${listed.length} tools, source has ${declared.length}`);
  check(declared.every((name) => listed.includes(name)), `${server}: manifest tools do not cover source declarations`);
  check(listed.every((name) => declared.includes(name)), `${server}: manifest contains undeclared tools`);

  execFileSync(process.execPath, [join(root, "scripts", "pack-aipkg.mjs"), `mcp-${server.replace("_", "-")}`, "--out", outDir], { cwd: root, stdio: "pipe" });
  const archive = join(outDir, `${manifest.name}-${manifest.version}.aipkg`);
  check(existsSync(archive), `${server}: packer did not create ${archive}`);
  if (existsSync(archive)) {
    const entries = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" }).trim().split("\n");
    check(entries.includes("manifest.json"), `${server}: package has no manifest.json`);
    check(entries.some((entry) => entry.endsWith("server.ts")), `${server}: package has no server source`);
    check(entries.includes("checksum.sha256"), `${server}: package has no checksum.sha256`);
  }
}

rmSync(outDir, { recursive: true, force: true });
if (failures.length) {
  console.error("❌ MCP catalog validation failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`✅ MCP catalog E2E validation passed: ${servers.length} manifests, ${servers.length} packages, tool declarations aligned.`);
