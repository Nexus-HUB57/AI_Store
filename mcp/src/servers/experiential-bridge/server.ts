#!/usr/bin/env node
/**
 * MCP Server — experiential-bridge
 *
 * Wrapper MCP para o gateway AI-to-AI experientiallabs/experiential.
 * Encapsula a CLI `exp` (capture/build/optimize) e expõe o mirror
 * sincronizado (traces + routers) da AI Store.
 *
 * Tools:
 *   exp_capture       — inicia captura de agent traces
 *   exp_build         — compõe frozen router a partir de traces
 *   exp_optimize      — re-fit router com novos traces
 *   exp_sync          — sincroniza artefatos para AI Store
 *   exp_list_traces   — lista traces do mirror
 *   exp_list_routers  — lista routers do mirror
 *
 * Run:
 *   bun run mcp/src/servers/experiential-bridge/server.ts
 */

import { z } from "zod";
import { McpServer } from "../../lib/mcp/server";

const AISTORE_URL = process.env.AISTORE_URL || "http://localhost:3000";
const EXP_ROOT = process.env.EXP_ROOT || `${process.env.HOME || "/tmp"}/.exp`;
const EXP_TIMEOUT_MS = Number(process.env.EXP_TIMEOUT_MS || 120_000);

const server = new McpServer({
  name: "experiential-bridge",
  version: "0.7.130",
  title: "Experiential Bridge",
  description:
    "Wrapper para experientiallabs/experiential (model router AI-to-AI). Capture/build/optimize + mirror sync.",
});

// --- subprocess helper -----------------------------------------------------

async function execExp(args: string[]): Promise<string> {
  const proc = Bun.spawn(["exp", ...args], {
    cwd: EXP_ROOT,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: "1",
      EXP_NON_INTERACTIVE: "1",
      EXP_ROOT,
    },
    stdout: "pipe",
    stderr: "pipe",
    timeout: EXP_TIMEOUT_MS,
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`exp ${args.join(" ")} exit ${code}: ${stderr.trim() || stdout.trim()}`);
  }
  return stdout.trim();
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

// --- tool definitions ------------------------------------------------------

server.tool(
  "exp_capture",
  "Captura agent traces via gateway AI-to-AI (experiential).",
  {
    identity: z.string().describe("Identidade do agente (ex.: chimera7-defi)"),
    project: z.string().optional().describe("Projeto do agente"),
    source: z.enum(["gateway", "sdk", "jsonl"]).default("gateway"),
  },
  async ({ identity, project, source }) => {
    const args = ["capture", "start", "--identity", identity, "--source", source];
    if (project) args.push("--project", project);
    const stdout = await execExp(args);
    return { content: [{ type: "text", text: stdout || "capture iniciado" }] };
  },
);

server.tool(
  "exp_build",
  "Compõe um frozen model router a partir de traces.",
  {
    project: z.string().describe("Projeto alvo (obrigatório)"),
    trace_file: z.string().optional().describe("Caminho para arquivo .jsonl de traces"),
    judge: z.string().optional().describe("Modelo juiz (alias)"),
    embedder: z.string().optional().describe("Modelo de embedding (alias)"),
    top_k: z.number().int().min(1).default(5),
  },
  async ({ project, trace_file, judge, embedder, top_k }) => {
    const args = ["build", project, "--top-k", String(top_k)];
    if (trace_file) args.push("--trace-file", trace_file);
    if (judge) args.push("--judge", judge);
    if (embedder) args.push("--embedder", embedder);
    const stdout = await execExp(args);
    return { content: [{ type: "text", text: stdout || "build concluído" }] };
  },
);

server.tool(
  "exp_optimize",
  "Otimiza router existente com novos traces (re-fit).",
  {
    router_id: z.string().describe("Router ID para otimizar"),
    new_traces: z.number().int().optional().describe("Quantos traces novos considerar"),
    budget_usd: z.number().min(0.01).default(1.0),
  },
  async ({ router_id, new_traces, budget_usd }) => {
    const args = ["optimize", "fit", "--router", router_id, "--max-build-cost-usd", String(budget_usd)];
    if (new_traces) args.push("--new-traces", String(new_traces));
    const stdout = await execExp(args);
    return { content: [{ type: "text", text: stdout || "optimize concluído" }] };
  },
);

server.tool(
  "exp_sync",
  "Sincroniza artefatos locais do experiential para a AI Store (POST /api/experiential/sync).",
  {
    trigger: z.string().default("manual"),
  },
  async ({ trigger }) => {
    const res = await fetch(`${AISTORE_URL}/api/experiential/sync`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trigger }),
    });
    const data = await res.json();
    return {
      content: [{
        type: "text",
        text: JSON.stringify(data, null, 2),
      }],
    };
  },
);

server.tool(
  "exp_list_traces",
  "Lista traces sincronizados (mirror na AI Store).",
  {
    project: z.string().optional(),
    model: z.string().optional(),
    limit: z.number().int().min(1).max(500).default(100),
  },
  async ({ project, model, limit }) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (project) params.set("project", project);
    if (model) params.set("model", model);
    const data = await fetchJson(`${AISTORE_URL}/api/experiential/traces?${params}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "exp_list_routers",
  "Lista frozen routers sincronizados.",
  {
    project: z.string().optional(),
    status: z.enum(["built", "serving", "archived"]).optional(),
    limit: z.number().int().min(1).max(500).default(100),
  },
  async ({ project, status, limit }) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (project) params.set("project", project);
    if (status) params.set("status", status);
    const data = await fetchJson(`${AISTORE_URL}/api/experiential/routers?${params}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.start();
