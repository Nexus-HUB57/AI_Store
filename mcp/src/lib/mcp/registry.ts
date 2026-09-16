/**
 * MCP Registry — durable catalog of installed MCP servers.
 *
 * Backed by a JSON file under data/mcp-registry.json by default.
 * Can be swapped for Prisma/Postgres in production (see PrismaMcpRegistry).
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { AipkgMcpManifest } from "./types";

export interface InstalledMcp {
  manifest: AipkgMcpManifest;
  installedAt: number;
  updatedAt: number;
  installPath: string;
  enabled: boolean;
}

export interface McpRegistry {
  register(manifest: AipkgMcpManifest): Promise<InstalledMcp>;
  unregister(name: string): Promise<void>;
  get(name: string): Promise<InstalledMcp | undefined>;
  list(): Promise<InstalledMcp[]>;
  setEnabled(name: string, enabled: boolean): Promise<void>;
}

export class JsonFileMcpRegistry implements McpRegistry {
  private cache: InstalledMcp[] | null = null;

  constructor(private filePath: string = path.join(process.cwd(), "data", "mcp-registry.json")) {}

  private async load(): Promise<InstalledMcp[]> {
    if (this.cache) return this.cache;
    try {
      const txt = await readFile(this.filePath, "utf-8");
      this.cache = JSON.parse(txt);
      return this.cache!;
    } catch {
      this.cache = [];
      return this.cache;
    }
  }

  private async save(): Promise<void> {
    if (!this.cache) return;
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.cache, null, 2), "utf-8");
  }

  async register(manifest: AipkgMcpManifest): Promise<InstalledMcp> {
    const list = await this.load();
    const idx = list.findIndex((m) => m.manifest.name === manifest.name);
    const installed: InstalledMcp = {
      manifest,
      installedAt: idx >= 0 ? list[idx].installedAt : Date.now(),
      updatedAt: Date.now(),
      installPath: path.join("mcp-store", manifest.name, manifest.version),
      enabled: idx >= 0 ? list[idx].enabled : true,
    };
    if (idx >= 0) list[idx] = installed;
    else list.push(installed);
    await this.save();
    return installed;
  }

  async unregister(name: string): Promise<void> {
    const list = await this.load();
    this.cache = list.filter((m) => m.manifest.name !== name);
    await this.save();
  }

  async get(name: string): Promise<InstalledMcp | undefined> {
    const list = await this.load();
    return list.find((m) => m.manifest.name === name);
  }

  async list(): Promise<InstalledMcp[]> {
    return await this.load();
  }

  async setEnabled(name: string, enabled: boolean): Promise<void> {
    const list = await this.load();
    const item = list.find((m) => m.manifest.name === name);
    if (item) {
      item.enabled = enabled;
      item.updatedAt = Date.now();
      await this.save();
    }
  }
}