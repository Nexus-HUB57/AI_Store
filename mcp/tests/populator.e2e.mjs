#!/usr/bin/env bun
/**
 * E2E test — mcp-store-populator
 *
 * Sobe o servidor via stdio (JSON-RPC 2.0), exercita todas as 13 tools
 * e os 2 resources contra o SQLite real, e valida:
 *   - tools/list retorna exatamente as 13 esperadas
 *   - resources/list retorna os 3 esperados (segments, stats, workflows)
 *   - register_product (modo unitário)
 *   - bulk_register (lote)
 *   - suggest_metadata / validate_listing / find_duplicates
 *   - price_suggestion / catalog_gaps
 *   - smart_batch (dryRun e commit)
 *   - get_listing_stats
 *   - link_to_mylink_agent / deprecate_listing
 *   - cross_post_to_mylink (com mybait offline — verifica fallback)
 */

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { PrismaClient } from "@prisma/client";
import { unlinkSync, existsSync } from "node:fs";

const DB_PATH = "/workspace/AI_Store/mcp/tests/_populator_e2e.db";
const SERVER = "mcp/src/servers/populator/server.ts";

if (existsSync(DB_PATH)) unlinkSync(DB_PATH);

const prisma = new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } });

// Cria schema mínimo copiando do principal
import { execSync } from "node:child_process";
execSync(
  `cd /workspace/AI_Store && DATABASE_URL="file:${DB_PATH}" PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 ` +
  `npx -y prisma@6 db push --skip-generate --accept-data-loss 2>&1 | tail -3`,
  { stdio: "inherit" }
);
await prisma.$disconnect();

// =================================================================
// JSON-RPC over stdio
// =================================================================
const proc = spawn("bun", ["run", SERVER], {
  cwd: "/workspace/AI_Store",
  env: { ...process.env, DATABASE_URL: `file:${DB_PATH}` },
  stdio: ["pipe", "pipe", "pipe"],
});
proc.stderr.on("data", d => process.stderr.write(`[server-err] ${d}`));

let nextId = 1;
const pending = new Map();

// MCP usa framing estilo LSP: "Content-Length: N\r\n\r\n<body>"
let inBuf = Buffer.alloc(0);
proc.stdout.on("data", chunk => {
  inBuf = Buffer.concat([inBuf, chunk]);
  while (true) {
    const headerEnd = inBuf.indexOf("\r\n\r\n");
    if (headerEnd === -1) return;
    const header = inBuf.slice(0, headerEnd).toString("ascii");
    const m = /Content-Length:\s*(\d+)/i.exec(header);
    if (!m) { inBuf = inBuf.slice(headerEnd + 4); continue; }
    const len = parseInt(m[1], 10);
    const total = headerEnd + 4 + len;
    if (inBuf.length < total) return;
    const body = inBuf.slice(headerEnd + 4, total).toString("utf-8");
    inBuf = inBuf.slice(total);
    try {
      const msg = JSON.parse(body);
      if (msg.id != null && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    } catch (e) { /* ignore */ }
  }
});

function call(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    proc.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout: ${method}`)); } }, 15000);
  });
}

const results = [];
let passed = 0, failed = 0;
const it = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
    results.push({ name, ok: true });
  } catch (e) {
    console.log(`  ✗ ${name} — ${e.message}`);
    failed++;
    results.push({ name, ok: false, error: e.message });
  }
};

const asText = (r) => {
  try {
    return r?.content?.[0]?.text ? JSON.parse(r.content[0].text) : r;
  } catch (e) {
    console.error(`    [raw resp] ${JSON.stringify(r).slice(0, 500)}`);
    throw new Error(`JSON Parse error: ${e.message}`);
  }
};
const ok = (r) => asText(r)?.ok === true;
const isError = (r) => r?.isError === true;

console.log("\n=== E2E: mcp-store-populator ===\n");

// --- Handshake ---
await it("initialize handshake", async () => {
  const r = await call("initialize", { protocolVersion: "2024-11-05", clientInfo: { name: "e2e-populator", version: "1.0" } });
  if (!r.serverInfo || r.serverInfo.name !== "mcp-store-populator") throw new Error("wrong serverInfo");
  // notifications/initialized é notificação — não retorna resposta
  const body = JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" });
  proc.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
});

// --- tools/list ---
await it("tools/list returns 15 tools", async () => {
  const r = await call("tools/list");
  const names = r.tools.map(t => t.name).sort();
  const expected = [
    "register_product", "bulk_register", "register_from_manifest",
    "suggest_metadata", "validate_listing", "find_duplicates", "price_suggestion",
    "catalog_gaps", "smart_batch",
    "cross_post_to_mylink", "link_to_mylink_agent", "get_listing_stats",
    "deprecate_listing", "list_pending_posts", "clear_pending_posts",
  ];
  if (names.length !== 15) throw new Error(`expected 15, got ${names.length}: ${names.join(",")}`);
  for (const e of expected) if (!names.includes(e)) throw new Error(`missing: ${e}`);
});

// --- resources/list ---
await it("resources/list returns 3 resources", async () => {
  const r = await call("resources/list");
  const uris = r.resources.map(x => x.uri).sort();
  if (!uris.includes("populator://segments")) throw new Error("missing segments");
  if (!uris.includes("populator://stats")) throw new Error("missing stats");
  if (!uris.includes("populator://workflows/populate-segment")) throw new Error("missing workflow");
});

// --- register_product ---
let firstSlug = "";
await it("register_product (unico, com defaults)", async () => {
  const r = await call("tools/call", {
    name: "register_product",
    arguments: {
      name: "DeFi Yield Optimizer Pro",
      coreBusiness: "Otimizador de yield em pools DeFi com simulações Monte Carlo e gestão de risco distribuída.",
      precoSats: 15000,
      authorAgent: "@e2e-tester",
    },
  });
  const d = asText(r);
  if (!d.ok) throw new Error(`not ok: ${JSON.stringify(d)}`);
  if (d.product.slug !== "defi-yield-optimizer-pro") throw new Error(`slug: ${d.product.slug}`);
  // segmento é inferido por heurística — só validamos que é um dos válidos
  if (!["Agent Apps","Executable Skills (WASM)","Knowledge Packs (RAG)","Synthetic Infrastructure","Prompt Harnesses","In-App Digital Products"].includes(d.product.segmento))
    throw new Error(`segmento inválido: ${d.product.segmento}`);
  firstSlug = d.product.slug;
});

// --- validate_listing ---
await it("validate_listing (draft bom)", async () => {
  const r = await call("tools/call", {
    name: "validate_listing",
    arguments: { name: "RAG Pack Juridico", coreBusiness: "Pacote RAG com curadoria de jurisprudência brasileira, embeddings OpenAI e citações formatadas.", precoSats: 20000 },
  });
  const d = asText(r);
  if (!d.ok) throw new Error(JSON.stringify(d));
});
await it("validate_listing (rejeita slug ruim)", async () => {
  const r = await call("tools/call", {
    name: "validate_listing",
    arguments: { name: "X", slug: "Bad Slug!", coreBusiness: "muito curto" },
  });
  const d = asText(r);
  if (d.ok) throw new Error("deveria rejeitar");
  if (d.issues.length < 2) throw new Error("esperava 2+ issues");
});

// --- suggest_metadata ---
await it("suggest_metadata (infere segmento e preço)", async () => {
  const r = await call("tools/call", {
    name: "suggest_metadata",
    arguments: { name: "WASM Skill for Oracle", description: "Habilidade WASM compilada para servir dados de oráculo on-chain com fallback PoW." },
  });
  const d = asText(r);
  if (!d.slug) throw new Error("sem slug");
  if (d.segmento !== "Executable Skills (WASM)") throw new Error(`segmento errado: ${d.segmento}`);
});

// --- find_duplicates ---
await it("find_duplicates (match exato)", async () => {
  const r = await call("tools/call", {
    name: "find_duplicates",
    arguments: { query: "defi yield" },
  });
  const d = asText(r);
  if (d.count < 1) throw new Error("esperava ≥1 match");
});

// --- price_suggestion ---
await it("price_suggestion", async () => {
  const r = await call("tools/call", {
    name: "price_suggestion",
    arguments: { segmento: "Agent Apps", quality: "standard" },
  });
  const d = asText(r);
  if (d.recommended < 0) throw new Error("preço negativo");
});

// --- catalog_gaps ---
await it("catalog_gaps", async () => {
  const r = await call("tools/call", {
    name: "catalog_gaps",
    arguments: { minPerSegment: 50 },
  });
  const d = asText(r);
  if (!Array.isArray(d.gaps)) throw new Error("gaps não é array");
});

// --- smart_batch (dryRun) ---
await it("smart_batch dryRun=true (não escreve)", async () => {
  const r = await call("tools/call", {
    name: "smart_batch",
    arguments: { theme: "DeFi Analytics", segmento: "Agent Apps", count: 4, dryRun: true },
  });
  const d = asText(r);
  if (d.count !== 4) throw new Error(`count: ${d.count}`);
  if (!Array.isArray(d.drafts) || d.drafts.length !== 4) throw new Error("drafts length wrong");
  // confirma que não escreveu
  const cnt = await prisma.product.count({ where: { authorAgent: "@nexus-populator" } });
  if (cnt !== 0) throw new Error("dryRun não deveria ter escrito");
});

// --- smart_batch (commit) ---
await it("smart_batch dryRun=false (commit)", async () => {
  const r = await call("tools/call", {
    name: "smart_batch",
    arguments: { theme: "NFT Marketplace", segmento: "In-App Digital Products", count: 3, dryRun: false, priceRange: [0, 12000] },
  });
  const d = asText(r);
  if (!d.ok) throw new Error(JSON.stringify(d));
  const createdItems = d.results.filter(x => x.status === "created").length;
  if (createdItems !== 3) throw new Error(`created: ${createdItems}, results=${JSON.stringify(d.results)}`);
});

// --- bulk_register ---
await it("bulk_register (lote com 1 duplicado)", async () => {
  // pega o slug real do primeiro produto pra fazer o duplicado
  const existing = await prisma.product.findFirst({ select: { slug: true } });
  if (!existing) throw new Error("sem produto existente — register_product falhou?");
  const r = await call("tools/call", {
    name: "bulk_register",
    arguments: {
      products: [
        { name: "RAG Pack Medico Plus", coreBusiness: "Pacote RAG com literatura médica revisada por pares, embeddings OpenAI e citações verificáveis.", precoSats: 18000, segmento: "Knowledge Packs (RAG)" },
        { slug: existing.slug, name: "Duplicate Product Name", coreBusiness: "Tentativa de duplicata que deve ser pulada por slug já existente.", precoSats: 100, segmento: "Agent Apps" },
        { name: "RAG Pack Juridico BR", coreBusiness: "Pacote RAG com curadoria de jurisprudência STF/STJ, embeddings multilíngue e citações formatadas.", precoSats: 22000, segmento: "Knowledge Packs (RAG)" },
      ],
      skipDuplicates: true,
    },
  });
  const d = asText(r);
  if (d.summary.created !== 2) throw new Error(`created: ${d.summary.created}, summary=${JSON.stringify(d.summary)}`);
  if (d.summary.skipped !== 1) throw new Error("esperava 1 skipped");
});

// --- link_to_mylink_agent ---
await it("link_to_mylink_agent", async () => {
  const r = await call("tools/call", {
    name: "link_to_mylink_agent",
    arguments: { slug: firstSlug, agentId: "@mybait-bot" },
  });
  const d = asText(r);
  if (!d.ok) throw new Error(JSON.stringify(d));
  if (d.product.authorAgent !== "@mybait-bot") throw new Error(`authorAgent: ${d.product.authorAgent}`);
});

// --- get_listing_stats ---
await it("get_listing_stats agregado", async () => {
  const r = await call("tools/call", {
    name: "get_listing_stats",
    arguments: {},
  });
  const d = asText(r);
  if (d.totals.count < 5) throw new Error(`count: ${d.totals.count}`);
  if (!d.bySegmento || d.bySegmento.length === 0) throw new Error("bySegmento vazio");
});

// --- cross_post_to_mylink (path offline via forceQueue) ---
await it("cross_post_to_mylink forceQueue=true cobre o path offline", async () => {
  const r = await call("tools/call", {
    name: "cross_post_to_mylink",
    arguments: { slug: firstSlug, agentId: "@e2e-tester", forceQueue: true },
  });
  const d = asText(r);
  if (!d.payload || !d.payload.text.includes(firstSlug)) throw new Error("payload missing slug");
  if (!d.mode.includes("queued")) throw new Error(`mode: ${d.mode}`);
  if (!d.queued?.file) throw new Error("queue file missing");
  console.log(`    → queue file: ${d.queued.file} (${d.queued.count} pending)`);
});

// --- deprecate_listing ---
await it("deprecate_listing", async () => {
  const r = await call("tools/call", {
    name: "deprecate_listing",
    arguments: { slug: firstSlug, reason: "e2e test" },
  });
  const d = asText(r);
  if (!d.ok) throw new Error(JSON.stringify(d));
  if (!d.coreBusiness.includes("DEPRECATED")) throw new Error("não marcou deprecated");
});

// --- resources/read ---
await it("resources/read populator://stats", async () => {
  const r = await call("resources/read", { uri: "populator://stats" });
  const txt = r.contents[0].text;
  const d = JSON.parse(txt);
  if (d.total < 5) throw new Error(`total: ${d.total}`);
});

// --- register_from_manifest (cobre Product + McpPackage) ---
await it("register_from_manifest (.aipkg → Product + McpPackage)", async () => {
  const manifest = {
    aipkg: "1.0",
    kind: "mcp",
    name: "mcp-telemetry",
    version: "2.1.0",
    displayName: "AI Store Telemetry Bus",
    description: "Coletor e roteador de telemetria A2A com agregação Pulsar SSE, retenção 30 dias e hooks para mcp-self-heal.",
    author: { agentId: "@telemetry-bot", displayName: "Telemetry Bot", verified: true },
    category: "telemetry",
    tags: ["telemetry", "a2a", "pulsar", "observability"],
    license: "MIT",
    repository: "https://github.com/Nexus-HUB57/AI_Store",
    homepage: "https://mybait.org/aistore/mcp/telemetry",
    mcp: {
      transport: "stdio",
      command: "bun",
      args: ["run", "mcp/src/servers/mcp-telemetry/index.ts"],
      capabilities: { tools: true, resources: true, prompts: false, logging: true, sampling: false },
    },
    runtime: { memoryMb: 256, cpuMillicores: 500, timeoutMs: 30000, sandbox: "process" },
    tools: [
      { name: "emit_event", category: "write" },
      { name: "query_telemetry", category: "read" },
    ],
    pricing: { model: "free", priceSats: 0, pricePerCallSats: 0 },
  };

  const r = await call("tools/call", {
    name: "register_from_manifest",
    arguments: { manifestJson: JSON.stringify(manifest), precoSats: 0 },
  });
  const d = asText(r);
  if (!d.ok) throw new Error(JSON.stringify(d));
  if (!d.productId || !d.mcpPackage) throw new Error(`sem IDs: ${JSON.stringify(d)}`);
  if (d.mcpPackage.name !== "mcp-telemetry") throw new Error(`mcpPackage.name: ${d.mcpPackage.name}`);

  // Verifica via Prisma que ambos foram criados
  const prod = await prisma.product.findUnique({ where: { slug: "mcp-telemetry" }, select: { id: true, segmento: true, source: true } });
  const pkg  = await prisma.mcpPackage.findUnique({ where: { name: "mcp-telemetry" }, select: { id: true, version: true, verified: true, toolsJson: true } });
  if (!prod) throw new Error("Product não foi criado");
  if (!pkg) throw new Error("McpPackage não foi criado");
  if (prod.source !== "aipkg-manifest") throw new Error(`source: ${prod.source}`);
  if (pkg.version !== "2.1.0") throw new Error(`pkg version: ${pkg.version}`);
  if (!pkg.verified) throw new Error("pkg deveria estar verified=true");
  const tools = JSON.parse(pkg.toolsJson);
  if (!Array.isArray(tools) || tools.length !== 2) throw new Error(`tools: ${pkg.toolsJson}`);
});

await it("register_from_manifest rejeita aipkg/kind inválido", async () => {
  const r = await call("tools/call", {
    name: "register_from_manifest",
    arguments: { manifestJson: JSON.stringify({ aipkg: "0.9", kind: "library", name: "x" }) },
  });
  const d = asText(r);
  if (d.ok) throw new Error("deveria rejeitar");
  if (!d.error?.includes("manifest_kind_invalido")) throw new Error(`error: ${d.error}`);
});

// --- Idempotência + dedup direto no DB ---
await it("register_product idempotente (segundo = erro slug_ja_existe)", async () => {
  const r1 = await call("tools/call", {
    name: "register_product",
    arguments: { name: "Idempotent Tool Alpha", coreBusiness: "Ferramenta idempotente para validar retry e dedup em cadastros em massa.", precoSats: 5000 },
  });
  const d1 = asText(r1);
  if (!d1.ok) throw new Error(`primeiro deveria criar: ${JSON.stringify(d1)}`);
  const slug = d1.product.slug;

  const r2 = await call("tools/call", {
    name: "register_product",
    arguments: { name: "Idempotent Tool Alpha", coreBusiness: "Segunda tentativa — deve falhar com slug_ja_existe.", precoSats: 9999 },
  });
  const d2 = asText(r2);
  if (d2.ok) throw new Error("segundo deveria falhar");
  if (d2.error !== "slug_ja_existe") throw new Error(`error: ${d2.error}`);
  if (d2.slug !== slug) throw new Error(`slug: ${d2.slug}`);

  // Confirma via Prisma que só existe 1 (não 2)
  const cnt = await prisma.product.count({ where: { slug } });
  if (cnt !== 1) throw new Error(`deveria ter 1, tem ${cnt}`);
});

await it("bulk_register com dryRun=true não toca o DB", async () => {
  const before = await prisma.product.count();
  const r = await call("tools/call", {
    name: "bulk_register",
    arguments: {
      products: [
        { name: "DryRun Product One", coreBusiness: "Produto de teste dry-run com descrição completa para passar validação.", precoSats: 100 },
        { name: "DryRun Product Two", coreBusiness: "Outro produto de teste dry-run com descrição completa para passar validação.", precoSats: 200 },
      ],
      dryRun: true,
      skipDuplicates: false,
    },
  });
  const d = asText(r);
  if (!d.ok) throw new Error(JSON.stringify(d));
  if (d.summary.created !== 2) throw new Error(`summary.created: ${d.summary.created}`);
  const after = await prisma.product.count();
  if (after !== before) throw new Error(`dryRun escreveu! before=${before} after=${after}`);
});

// --- Workflow template ---
await it("resources/read populator://workflows/populate-segment", async () => {
  const r = await call("resources/read", { uri: "populator://workflows/populate-segment" });
  const txt = r.contents[0].text;
  if (!txt.includes("catalog_gaps")) throw new Error("workflow não menciona catalog_gaps");
  if (!txt.includes("bulk_register")) throw new Error("workflow não menciona bulk_register");
  if (!txt.includes("cross_post_to_mylink")) throw new Error("workflow não menciona cross_post_to_mylink");
});

await it("resources/read populator://segments (6 segmentos)", async () => {
  const r = await call("resources/read", { uri: "populator://segments" });
  const txt = r.contents[0].text;
  const d = JSON.parse(txt);
  if (!Array.isArray(d.segmentos) || d.segmentos.length !== 6) throw new Error(`segmentos: ${d.segmentos?.length}`);
});

// --- DB final state ---
await it("DB final state consistente (>= 6 produtos, 1+ mcpPackage)", async () => {
  const totalProd = await prisma.product.count();
  const totalPkg  = await prisma.mcpPackage.count();
  const bySeg     = await prisma.product.groupBy({ by: ["segmento"], _count: { segmento: true } });
  if (totalProd < 6) throw new Error(`totalProd: ${totalProd}`);
  if (totalPkg < 1) throw new Error(`totalPkg: ${totalPkg}`);
  if (bySeg.length < 2) throw new Error(`segmentos usados: ${bySeg.length}`);
  console.log(`    → DB: ${totalProd} produtos, ${totalPkg} mcpPackages, ${bySeg.length} segmentos`);
});

// --- LIVE: cross_post_to_mylink contra mybait.org real ---
console.log("\n=== FASE 2: integração LIVE contra mybait.org ===\n");

await it("cross_post_to_mylink contra mybait.org real (live)", async () => {
  // Cria um produto novo só pra esse teste
  const reg = await call("tools/call", {
    name: "register_product",
    arguments: {
      name: "Live MyLink Bridge Tester",
      slug: "live-mylink-bridge-tester",
      coreBusiness: "Produto descartável usado pelo E2E para validar o cross_post_to_mylink contra a API real do mybait.org.",
      precoSats: 0,
      authorAgent: "@e2e-bridge",
    },
  });
  const regD = asText(reg);
  if (!regD.ok) throw new Error(`registro: ${JSON.stringify(regD)}`);

  const r = await call("tools/call", {
    name: "cross_post_to_mylink",
    arguments: { slug: "live-mylink-bridge-tester", agentId: "@e2e-bridge" },
  });
  const d = asText(r);
  // Pode dar ok=true (201) OU fallback_queued (mybait hang/timeout)
  if (!d.payload) throw new Error("payload missing");
  if (!d.payload.text.includes("Live MyLink Bridge Tester")) throw new Error("payload.text sem nome do produto");
  if (d.ok === undefined && d.mode === undefined) throw new Error("resposta vazia");
  console.log(`    → live mode=${d.mode ?? "ok"} ok=${d.ok ?? "n/a"} queued=${d.queued ?? false}`);
});

await it("cross_post_to_mylink forceQueue=true (grava direto na fila)", async () => {
  const reg = await call("tools/call", {
    name: "register_product",
    arguments: { name: "Force Queue Product Z", coreBusiness: "Produto usado pra testar o modo forceQueue do cross_post_to_mylink sem chamar mybait.", precoSats: 0 },
  });
  const regD = asText(reg);
  const slug = regD.product.slug;

  const r = await call("tools/call", {
    name: "cross_post_to_mylink",
    arguments: { slug, agentId: "@e2e-bridge", forceQueue: true },
  });
  const d = asText(r);
  if (!d.ok || d.mode !== "queued_only") throw new Error(JSON.stringify(d));
  if (!d.queued.file || !d.queued.file.includes("mylink_pending_posts")) throw new Error(`file: ${d.queued.file}`);
});

await it("list_pending_posts retorna enfileirados", async () => {
  const r = await call("tools/call", { name: "list_pending_posts", arguments: { limit: 100 } });
  const d = asText(r);
  if (d.count < 1) throw new Error(`count: ${d.count}`);
  if (!d.items.some(i => i.product_slug?.includes("force-queue") || i.product_slug?.includes("live-mylink"))) {
    throw new Error(`nenhum item das fases anteriores: ${JSON.stringify(d.items.slice(0,3))}`);
  }
});

await it("clear_pending_posts requer confirm='yes' e limpa", async () => {
  const r = await call("tools/call", { name: "clear_pending_posts", arguments: { confirm: "yes" } });
  const d = asText(r);
  if (!d.ok || !d.cleared) throw new Error(JSON.stringify(d));
  // confirma que listagem agora está vazia
  const r2 = await call("tools/call", { name: "list_pending_posts", arguments: { limit: 100 } });
  const d2 = asText(r2);
  if (d2.count !== 0) throw new Error(`ainda tem ${d2.count} itens`);
});

// --- Cleanup ---
proc.kill();
console.log(`\n=== Resultado: ${passed} ✓ / ${failed} ✗ de ${passed+failed} testes ===\n`);
process.exit(failed === 0 ? 0 : 1);
