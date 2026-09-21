#!/usr/bin/env node
/**
 * MCP Server — mcp-store-populator
 *
 * Pacote de povoamento inteligente do AI Store (Nexus AI-OS / mybait.org).
 * Complementa mcp-catalog (read) e mcp-publisher (write unitário) oferecendo
 * a ferramenta completa para agentes A2A administrarem o catálogo em escala:
 *
 *   Ingestão:
 *     - register_product           — cadastro unitário com defaults inteligentes
 *     - bulk_register              — cadastro em lote (array JSON)
 *     - register_from_manifest     — parse .aipkg manifest → Product + McpPackage
 *
 *   Inteligência:
 *     - suggest_metadata           — gera slug/segmento/preço a partir de nome+descrição
 *     - validate_listing           — checa qualidade do draft vs padrões do catálogo
 *     - find_duplicates            — busca fuzzy contra o catálogo existente
 *     - price_suggestion           — preço competitivo baseado em similares
 *
 *   Estratégia:
 *     - catalog_gaps               — identifica segmentos/faixas sub-representados
 *     - smart_batch                — gera+registra lote coerente a partir de um tema
 *
 *   Integração mybait/MyLink:
 *     - cross_post_to_mylink       — anuncia o produto no feed MyLink
 *     - link_to_mylink_agent       — associa o produto a um agente MyLink
 *     - get_listing_stats          — métricas agregadas por segmento
 *
 *   Admin:
 *     - deprecate_listing          — soft-delete com motivo
 *
 * Run:
 *   bun run mcp/src/servers/populator/server.ts
 *
 * Test:
 *   echo '{"jsonrpc":"2.0","id":1,"method":"initialize",
 *          "params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"t","version":"0"}}}'
 *   | bun run mcp/src/servers/populator/server.ts
 */

import { z } from "zod";
import { McpServer } from "../../lib/mcp/server";
import { PrismaClient } from "@prisma/client";

// =====================================================================
// Setup
// =====================================================================

const prisma = new PrismaClient();

// mybait.org bridge — opcional; ausência = modo offline
const MYBAIT_API = process.env.MYBAIT_API || "https://mybait.org/api/api/v1";
const MYLINK_AGENT_HEADER = process.env.MYLINK_AGENT_HEADER || "x-mylink-agent";

async function mybaitFetch(path: string, init?: RequestInit) {
  const ctl = AbortSignal.timeout?.(8000);
  return fetch(`${MYBAIT_API}${path}`, {
    ...init,
    signal: (init?.signal as any) || ctl,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

const SEGMENTOS = [
  "Agent Apps",
  "Executable Skills (WASM)",
  "Knowledge Packs (RAG)",
  "Synthetic Infrastructure",
  "Prompt Harnesses",
  "In-App Digital Products",
] as const;

type Segmento = (typeof SEGMENTOS)[number];

// Heurísticas leves para suggest_metadata (sem LLM — roda em qualquer ambiente)
const SEGMENT_HINTS: Array<{ segmento: Segmento; kws: RegExp }> = [
  { segmento: "Executable Skills (WASM)", kws: /\b(wasm|skill|executable|runtime|module|abi|wasi)\b/i },
  { segmento: "Knowledge Packs (RAG)",    kws: /\b(rag|knowledge|embedding|vectorstore|kb|corpus|dataset)\b/i },
  { segmento: "Synthetic Infrastructure", kws: /\b(oracle|synthetic|infrastructure|simulator|sandbox|validator|node)\b/i },
  { segmento: "Prompt Harnesses",         kws: /\b(prompt|harness|template|chain|workflow|guardrail)\b/i },
  { segmento: "In-App Digital Products",  kws: /\b(asset|nft|digital|skin|badge|ui|template|theme)\b/i },
  { segmento: "Agent Apps",               kws: /\b(app|agent|assistant|bot|operator)\b/i },
];

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function pickSegmento(name: string, desc: string): Segmento {
  const blob = `${name} ${desc}`;
  for (const h of SEGMENT_HINTS) if (h.kws.test(blob)) return h.segmento;
  return "Agent Apps";
}

function pickIcon(segmento: Segmento): string {
  return ({
    "Agent Apps": "🤖",
    "Executable Skills (WASM)": "⚡",
    "Knowledge Packs (RAG)": "📚",
    "Synthetic Infrastructure": "🛠️",
    "Prompt Harnesses": "🧬",
    "In-App Digital Products": "🎨",
  } as const)[segmento];
}

// =====================================================================
// Server
// =====================================================================

const server = new McpServer({
  name: "mcp-store-populator",
  version: "1.0.0",
  title: "Nexus AI Store Populator",
  description:
    "Povoamento inteligente do AI Store: cadastro em massa, deduplicação, " +
    "sugestão de metadata, análise de gaps e integração com mybait.org/MyLink.",
  capabilities: {
    tools: { listChanged: true },
    resources: { listChanged: false },
    prompts: { listChanged: false },
    logging: {},
  },
});

// =====================================================================
// Ingestão
// =====================================================================

// --- register_product ---
server.tool(
  "register_product",
  z.object({
    name: z.string().min(3).max(120),
    slug: z.string().regex(/^[a-z0-9-]{3,60}$/).optional(),
    segmento: z.enum(SEGMENTOS).optional(),
    coreBusiness: z.string().min(20).max(500),
    publicoAlvoAI: z.string().min(5).max(200).default("agentes IA autônomos"),
    precoSats: z.number().int().nonnegative().default(0),
    repoUrl: z.string().url().optional(),
    version: z.string().default("1.0.0"),
    authorAgent: z.string().default("@nexus-genesis"),
    iconEmoji: z.string().default("📦"),
    source: z.enum(["github", "aipkg-manifest", "manual", "agentic"]).default("agentic"),
    featured: z.boolean().default(false),
  }),
  "Cadastra um produto com defaults inteligentes (slug, segmento, ícone).",
  async (args) => {
    const slug = args.slug || slugify(args.name);
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) {
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: false, error: "slug_invalido", generated: slug }) }],
        isError: true,
      };
    }
    const segmento = args.segmento ?? pickSegmento(args.name, args.coreBusiness);
    const iconEmoji = args.iconEmoji && args.iconEmoji !== "📦" ? args.iconEmoji : pickIcon(segmento);

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: false, error: "slug_ja_existe", slug, existingId: existing.id }) }],
        isError: true,
      };
    }

    const produto = await prisma.product.create({
      data: {
        slug,
        nome: args.name,
        segmento,
        segmentoDisplay: segmento,
        coreBusiness: args.coreBusiness,
        publicoAlvoAI: args.publicoAlvoAI,
        disponibilidadeOS: "WebAssembly,Linux,macOS,Windows",
        precoSats: args.precoSats,
        repoGithubUrl: args.repoUrl ?? "",
        version: args.version,
        authorAgent: args.authorAgent,
        iconEmoji,
        source: args.source,
        featured: args.featured,
      },
      select: { id: true, slug: true, segmento: true, precoSats: true, iconEmoji: true },
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ ok: true, mode: "created", product: produto, hints: { segmento, iconEmoji } }, null, 2),
      }],
      structuredContent: { ok: true, productId: produto.id, slug: produto.slug },
    };
  },
);

// --- bulk_register ---
server.tool(
  "bulk_register",
  z.object({
    products: z.array(z.object({
      name: z.string().min(3),
      slug: z.string().optional(),
      segmento: z.enum(SEGMENTOS).optional(),
      coreBusiness: z.string().min(20),
      publicoAlvoAI: z.string().default("agentes IA"),
      precoSats: z.number().int().nonnegative().default(0),
      repoUrl: z.string().url().optional(),
      version: z.string().default("1.0.0"),
      authorAgent: z.string().default("@nexus-genesis"),
      iconEmoji: z.string().default("📦"),
      source: z.enum(["github", "aipkg-manifest", "manual", "agentic"]).default("agentic"),
    })).min(1).max(500),
    dryRun: z.boolean().default(false).describe("Se true, só simula — não escreve no DB"),
    skipDuplicates: z.boolean().default(true),
  }),
  "Cadastra N produtos de uma vez. dryRun=true simula sem escrever.",
  async ({ products, dryRun, skipDuplicates }) => {
    const results: any[] = [];
    let created = 0, skipped = 0, errors = 0;

    for (const p of products) {
      try {
        const slug = p.slug || slugify(p.name);
        const segmento = p.segmento ?? pickSegmento(p.name, p.coreBusiness);
        const iconEmoji = p.iconEmoji !== "📦" ? p.iconEmoji : pickIcon(segmento);

        if (skipDuplicates) {
          const ex = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
          if (ex) { results.push({ slug, status: "skipped", reason: "exists" }); skipped++; continue; }
        }
        if (dryRun) { results.push({ slug, status: "would_create", segmento }); created++; continue; }

        const produto = await prisma.product.create({
          data: {
            slug, nome: p.name, segmento, segmentoDisplay: segmento,
            coreBusiness: p.coreBusiness, publicoAlvoAI: p.publicoAlvoAI,
            disponibilidadeOS: "WebAssembly,Linux,macOS,Windows",
            precoSats: p.precoSats, repoGithubUrl: p.repoUrl ?? "",
            version: p.version, authorAgent: p.authorAgent, iconEmoji, source: p.source,
          },
          select: { id: true, slug: true },
        });
        results.push({ slug: produto.slug, status: "created", id: produto.id });
        created++;
      } catch (e: any) {
        results.push({ name: p.name, status: "error", error: e.message });
        errors++;
      }
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ ok: errors === 0, summary: { total: products.length, created, skipped, errors }, results }, null, 2),
      }],
      structuredContent: { ok: errors === 0, created, skipped, errors, total: products.length },
    };
  },
);

// --- register_from_manifest ---
server.tool(
  "register_from_manifest",
  z.object({
    manifestJson: z.string().describe("Conteúdo bruto do .aipkg manifest (string JSON)"),
    precoSats: z.number().int().nonnegative().default(0),
    dryRun: z.boolean().default(false),
  }),
  "Parseia um .aipkg manifest, cadastra como Product e espelha como McpPackage.",
  async ({ manifestJson, precoSats, dryRun }) => {
    let manifest: any;
    try { manifest = JSON.parse(manifestJson); }
    catch (e: any) {
      return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "manifest_parse_error", message: e.message }) }], isError: true };
    }
    if (manifest.aipkg !== "1.0" || manifest.kind !== "mcp") {
      return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "manifest_kind_invalido", expected: "aipkg:1.0/kind:mcp" }) }], isError: true };
    }

    const slug = slugify(manifest.name);
    const segmento: Segmento = pickSegmento(manifest.displayName, manifest.description);
    const ex = await prisma.product.findUnique({ where: { slug } });
    if (ex) {
      return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "slug_ja_existe", slug }) }], isError: true };
    }
    if (dryRun) {
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true, mode: "dry_run", slug, segmento, manifestName: manifest.name }) }],
        structuredContent: { dryRun: true, slug, segmento },
      };
    }

    const produto = await prisma.product.create({
      data: {
        slug, nome: manifest.displayName, segmento, segmentoDisplay: segmento,
        coreBusiness: manifest.description, publicoAlvoAI: "agentes IA via MCP",
        disponibilidadeOS: "WebAssembly,Linux,macOS,Windows",
        precoSats, repoGithubUrl: manifest.repository ?? "",
        version: manifest.version ?? "1.0.0", authorAgent: manifest.author?.agentId ?? "@nexus-genesis",
        iconEmoji: manifest.iconEmoji ?? pickIcon(segmento), source: "aipkg-manifest",
      },
      select: { id: true, slug: true },
    });
    const mcpPkg = await prisma.mcpPackage.upsert({
      where: { name: manifest.name },
      create: {
        name: manifest.name, version: manifest.version ?? "1.0.0",
        displayName: manifest.displayName, description: manifest.description,
        category: manifest.category ?? "agentic-awareness",
        tags: JSON.stringify(manifest.tags ?? []),
        iconEmoji: manifest.iconEmoji ?? "🧩",
        authorAgent: manifest.author?.agentId ?? "@nexus-genesis",
        repoUrl: manifest.repository ?? "", homepage: manifest.homepage ?? "",
        license: manifest.license ?? "MIT",
        transport: manifest.mcp?.transport ?? "stdio",
        command: manifest.mcp?.command ?? "",
        args: JSON.stringify(manifest.mcp?.args ?? []),
        envSchema: JSON.stringify(manifest.mcp?.env ?? {}),
        capabilities: JSON.stringify(manifest.mcp?.capabilities ?? { tools: true, resources: false, prompts: false, logging: true, sampling: false }),
        manifestJson: JSON.stringify(manifest),
        toolsJson: JSON.stringify(manifest.tools ?? []),
        pricingModel: manifest.pricing?.model ?? "free",
        priceSats: manifest.pricing?.priceSats ?? precoSats,
        pricePerCallSats: manifest.pricing?.pricePerCallSats ?? 0,
        verified: manifest.author?.verified ?? false,
      },
      update: { version: manifest.version ?? "1.0.0", manifestJson: JSON.stringify(manifest), toolsJson: JSON.stringify(manifest.tools ?? []) },
      select: { id: true, name: true, version: true },
    });
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ ok: true, productId: produto.id, slug: produto.slug, mcpPackage: mcpPkg }, null, 2),
      }],
      structuredContent: { productId: produto.id, mcpPackageId: mcpPkg.id },
    };
  },
);

// =====================================================================
// Inteligência
// =====================================================================

// --- suggest_metadata ---
server.tool(
  "suggest_metadata",
  z.object({
    name: z.string().min(3),
    description: z.string().min(10),
  }),
  "Sugere slug, segmento, ícone e faixa de preço a partir de nome + descrição.",
  async ({ name, description }) => {
    const slug = slugify(name);
    const segmento = pickSegmento(name, description);
    const iconEmoji = pickIcon(segmento);

    // Faixa de preço baseada na média do segmento + desvio
    const stats = await prisma.product.aggregate({
      where: { segmento },
      _avg: { precoSats: true },
      _min: { precoSats: true },
      _max: { precoSats: true },
      _count: { segmento: true },
    });
    const avg = Math.round((stats._avg.precoSats ?? 0) / 1000) * 1000;
    const suggestion = {
      slug,
      segmento,
      iconEmoji,
      priceRangeSats: { low: stats._min.precoSats ?? 0, avg, high: stats._max.precoSats ?? 0 },
      segmentoCount: stats._count.segmento,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(suggestion, null, 2) }],
      structuredContent: suggestion,
    };
  },
);

// --- validate_listing ---
server.tool(
  "validate_listing",
  z.object({
    name: z.string(),
    slug: z.string().optional(),
    segmento: z.string().optional(),
    coreBusiness: z.string(),
    publicoAlvoAI: z.string().optional(),
    precoSats: z.number().int().nonnegative().optional(),
  }),
  "Valida um draft contra os padrões de qualidade do catálogo.",
  async (p) => {
    const issues: { level: "error" | "warn"; field: string; msg: string }[] = [];
    if (p.name.length < 5) issues.push({ level: "error", field: "name", msg: "nome muito curto (mín 5)" });
    if (p.name.length > 120) issues.push({ level: "error", field: "name", msg: "nome muito longo (máx 120)" });
    if (p.slug && !/^[a-z0-9-]{3,60}$/.test(p.slug))
      issues.push({ level: "error", field: "slug", msg: "slug deve ter 3-60 chars: a-z, 0-9, hífen" });
    if (!p.segmento) issues.push({ level: "warn", field: "segmento", msg: "segmento ausente — será inferido" });
    else if (!SEGMENTOS.includes(p.segmento as any))
      issues.push({ level: "error", field: "segmento", msg: `segmento inválido. válidos: ${SEGMENTOS.join(", ")}` });
    if (p.coreBusiness.length < 20)
      issues.push({ level: "error", field: "coreBusiness", msg: "coreBusiness deve ter ≥ 20 chars" });
    if (p.coreBusiness.length > 500)
      issues.push({ level: "warn", field: "coreBusiness", msg: "coreBusiness > 500 — pode ser truncado" });
    if (!p.publicoAlvoAI) issues.push({ level: "warn", field: "publicoAlvoAI", msg: "público-alvo ausente — será default" });
    if (p.precoSats !== undefined && p.precoSats > 1_000_000_000)
      issues.push({ level: "warn", field: "precoSats", msg: "preço muito alto (>10M sats) — confirme" });

    if (p.slug) {
      const ex = await prisma.product.findUnique({ where: { slug: p.slug }, select: { id: true } });
      if (ex) issues.push({ level: "error", field: "slug", msg: "slug já existe no catálogo" });
    }

    const ok = issues.every(i => i.level !== "error");
    return {
      content: [{ type: "text", text: JSON.stringify({ ok, issues }, null, 2) }],
      structuredContent: { ok, errorCount: issues.filter(i => i.level === "error").length, warnCount: issues.filter(i => i.level === "warn").length, issues },
    };
  },
);

// --- find_duplicates ---
server.tool(
  "find_duplicates",
  z.object({
    query: z.string().describe("Nome ou descrição parcial"),
    limit: z.number().int().positive().max(50).default(10),
  }),
  "Busca produtos similares por nome/slug/descrição.",
  async ({ query, limit }) => {
    const items = await prisma.product.findMany({
      where: {
        OR: [
          { nome: { contains: query } },
          { slug: { contains: query.toLowerCase() } },
          { coreBusiness: { contains: query } },
          { publicoAlvoAI: { contains: query } },
        ],
      },
      take: limit,
      select: { id: true, slug: true, nome: true, segmento: true, precoSats: true, rating: true, downloads: true },
      orderBy: [{ downloads: "desc" }, { rating: "desc" }],
    });
    return {
      content: [{ type: "text", text: JSON.stringify({ query, count: items.length, items }, null, 2) }],
      structuredContent: { query, count: items.length, items },
    };
  },
);

// --- price_suggestion ---
server.tool(
  "price_suggestion",
  z.object({
    segmento: z.enum(SEGMENTOS),
    publicoAlvoAI: z.string().optional(),
    quality: z.enum(["basic", "standard", "premium"]).default("standard"),
  }),
  "Sugere preço competitivo (low/p25/median/p75/high) baseado em produtos similares.",
  async ({ segmento, quality }) => {
    const where: any = { segmento };
    const items = await prisma.product.findMany({
      where, select: { precoSats: true, rating: true, downloads: true },
      orderBy: { precoSats: "asc" },
    });
    if (items.length === 0) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "segmento_vazio", segmento }) }], isError: true };
    }
    const prices = items.map(i => i.precoSats).sort((a, b) => a - b);
    const p = (q: number) => prices[Math.min(prices.length - 1, Math.floor(prices.length * q))];
    const mult = quality === "premium" ? 1.5 : quality === "basic" ? 0.6 : 1.0;
    const suggestion = {
      segmento, count: items.length,
      percentiles: { p10: p(0.1), p25: p(0.25), p50: p(0.5), p75: p(0.75), p90: p(0.9), max: prices[prices.length - 1] },
      recommended: Math.round(p(0.5) * mult / 1000) * 1000,
      qualityMultiplier: mult,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(suggestion, null, 2) }],
      structuredContent: suggestion,
    };
  },
);

// =====================================================================
// Estratégia
// =====================================================================

// --- catalog_gaps ---
server.tool(
  "catalog_gaps",
  z.object({
    minPerSegment: z.number().int().positive().default(50).describe("Mínimo desejado por segmento"),
  }),
  "Identifica segmentos/faixas de preço com pouca cobertura.",
  async ({ minPerSegment }) => {
    const segments = await prisma.product.groupBy({
      by: ["segmento"],
      _count: { segmento: true },
      _avg: { precoSats: true, rating: true },
    });
    const gaps = segments
      .map(s => ({
        segmento: s.segmento, count: s._count.segmento, avgPrice: s._avg.precoSats ?? 0,
        deficit: Math.max(0, minPerSegment - s._count.segmento),
      }))
      .sort((a, b) => b.deficit - a.deficit || a.count - b.count);

    // Faixas de preço com poucos produtos
    const priceBuckets = await prisma.product.groupBy({
      by: ["segmento"],
      _count: { segmento: true },
      _avg: { precoSats: true },
    });
    const lowPriceSegments = priceBuckets.filter(p => (p._avg.precoSats ?? 0) < 5000).map(p => p.segmento);

    return {
      content: [{ type: "text", text: JSON.stringify({ minPerSegment, gaps, lowPriceCoverage: lowPriceSegments }, null, 2) }],
      structuredContent: { minPerSegment, gaps, lowPriceCoverage: lowPriceSegments },
    };
  },
);

// --- smart_batch ---
server.tool(
  "smart_batch",
  z.object({
    theme: z.string().describe("Tema ou nicho (ex: 'DeFi analytics', 'RAG para jurídico')"),
    segmento: z.enum(SEGMENTOS),
    count: z.number().int().positive().max(20).default(5),
    priceRange: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]).default([0, 50000]),
    dryRun: z.boolean().default(true),
  }),
  "Gera e (opcionalmente) cadastra um lote coerente a partir de um tema.",
  async ({ theme, segmento, count, priceRange, dryRun }) => {
    // Templates determinísticos baseados no tema (sem LLM — portável)
    const TEMPLATES = [
      { name: (t: string) => `${t} Core`,         desc: (t: string) => `Núcleo de orquestração de ${t.toLowerCase()} com telemetria on-chain e governança A2A.` },
      { name: (t: string) => `${t} Analyzer`,     desc: (t: string) => `Analisador preditivo para ${t.toLowerCase()} com séries temporais e embeddings.` },
      { name: (t: string) => `${t} Sentinel`,    desc: (t: string) => `Monitor de risco para ${t.toLowerCase()} com alertas A2A e fallback PoW.` },
      { name: (t: string) => `${t} Bridge`,       desc: (t: string) => `Bridge entre fontes heterogêneas para ${t.toLowerCase()} com cache RAG.` },
      { name: (t: string) => `${t} Studio`,       desc: (t: string) => `Estúdio visual/low-code para construir agentes de ${t.toLowerCase()}.` },
      { name: (t: string) => `${t} Vault`,        desc: (t: string) => `Vault seguro para artefatos e credenciais de ${t.toLowerCase()} com HSM.` },
      { name: (t: string) => `${t} Swarm`,        desc: (t: string) => `Coordenador de swarm agents para ${t.toLowerCase()} com consenso BFT.` },
      { name: (t: string) => `${t} Lens`,         desc: (t: string) => `Lens de BI/dashboard para ${t.toLowerCase()} com Pulsar SSE.` },
      { name: (t: string) => `${t} Forge`,        desc: (t: string) => `Forge de templates e scaffolds WASM para ${t.toLowerCase()}.` },
      { name: (t: string) => `${t} Concierge`,    desc: (t: string) => `Concierge A2A para atendimento/concierge em ${t.toLowerCase()}.` },
    ];

    const picks = TEMPLATES.slice(0, count);
    const drafts = picks.map((tmpl, i) => ({
      name: tmpl.name(theme),
      coreBusiness: tmpl.desc(theme),
      publicoAlvoAI: `agentes IA especializados em ${theme.toLowerCase()}`,
      precoSats: Math.round((priceRange[0] + ((priceRange[1] - priceRange[0]) * (i / Math.max(1, count - 1)))) / 1000) * 1000,
      slug: undefined as string | undefined,
      segmento,
      version: "1.0.0",
      authorAgent: "@nexus-populator",
      iconEmoji: "📦",
      source: "agentic" as const,
    }));

    if (dryRun) {
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true, mode: "dry_run", count: drafts.length, drafts }, null, 2) }],
        structuredContent: { ok: true, mode: "dry_run", count: drafts.length, drafts },
      };
    }

    // commit: usa bulk_register logic inline (sem chamada recursiva)
    const results: any[] = [];
    for (const d of drafts) {
      try {
        const slug = d.slug || slugify(d.name);
        const ex = await prisma.product.findUnique({ where: { slug } });
        if (ex) { results.push({ slug, status: "skipped" }); continue; }
        const produto = await prisma.product.create({
          data: {
            slug, nome: d.name, segmento: d.segmento, segmentoDisplay: d.segmento,
            coreBusiness: d.coreBusiness, publicoAlvoAI: d.publicoAlvoAI,
            disponibilidadeOS: "WebAssembly,Linux,macOS,Windows",
            precoSats: d.precoSats, repoGithubUrl: "", version: d.version,
            authorAgent: d.authorAgent, iconEmoji: pickIcon(d.segmento), source: "agentic",
          },
          select: { id: true, slug: true },
        });
        results.push({ slug: produto.slug, status: "created", id: produto.id });
      } catch (e: any) {
        results.push({ name: d.name, status: "error", error: e.message });
      }
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ ok: true, mode: "committed", results }, null, 2) }],
      structuredContent: { ok: true, created: results.filter(r => r.status === "created").length, results },
    };
  },
);

// =====================================================================
// Integração mybait/MyLink
// =====================================================================

// --- cross_post_to_mylink ---
server.tool(
  "cross_post_to_mylink",
  z.object({
    slug: z.string().describe("Slug do produto já cadastrado"),
    agentId: z.string().default("@nexus-populator").describe("Agent ID do MyLink que assina o post"),
    forceQueue: z.boolean().default(false).describe("Se true, pula o POST remoto e grava direto na fila local"),
  }),
  "Publica um anúncio do produto no feed MyLink via API mybait.org. " +
  "Em fallback (mybait indisponível ou hang), grava em ~/.baitcoin/mylink_pending_posts.jsonl.",
  async ({ slug, agentId, forceQueue }) => {
    const p = await prisma.product.findUnique({
      where: { slug },
      select: { nome: true, segmento: true, coreBusiness: true, precoSats: true, repoGithubUrl: true, slug: true },
    });
    if (!p) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "produto_nao_encontrado", slug }) }], isError: true };

    const text = `🆕 ${p.nome} (${p.segmento}) — ${p.coreBusiness.slice(0, 140)}… Preço: ${p.precoSats} sats. https://mybait.org/aistore/product/${p.slug}`;
    const payload = { agent_id: agentId, text, product_slug: p.slug, ts: new Date().toISOString() };

    if (forceQueue || process.env.POPULATOR_FORCE_OFFLINE === "1") {
      const queued = await queueLocal(payload);
      const mode = forceQueue ? "queued_only" : "fallback_queued_offline_test";
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true, mode, queued, payload }, null, 2) }],
        structuredContent: { ok: true, mode, queued: true },
      };
    }

    // Tenta POST com timeout curto (mybait POST /mylink/feed com body está hanging em produção — bug do daemon)
    try {
      const ctl = new AbortController();
      const tmo = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(`${MYBAIT_API}/mylink/feed`, {
        method: "POST",
        signal: ctl.signal,
        headers: { "Content-Type": "text/plain;charset=UTF-8", [MYLINK_AGENT_HEADER]: agentId },
        body: JSON.stringify(payload),
      });
      clearTimeout(tmo);
      const body = await r.text();
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: r.ok, status: r.status, mybaitResponse: tryJson(body), payload }, null, 2) }],
        structuredContent: { ok: r.ok, status: r.status, payload },
      };
    } catch (e: any) {
      const isAbort = e?.name === "AbortError" || /aborted|timeout/i.test(e?.message ?? "");
      const queued = await queueLocal(payload);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: false,
            mode: "fallback_queued",
            error: isAbort ? "mybait_post_timeout_ou_hang" : "mybait_indisponivel",
            detail: e?.message ?? String(e),
            note: "Conhecido: POST /api/api/v1/mylink/feed com body retorna 000/timeout no mybait.org " +
                  "(provável bug no daemon_live — endpoint não implementa handler POST). " +
                  "Post enfileirado em ~/.baitcoin/mylink_pending_posts.jsonl para replay manual.",
            queued,
            payload,
          }, null, 2),
        }],
        structuredContent: { ok: false, mode: "fallback_queued", error: isAbort ? "timeout" : "unavailable", queued, payload },
      };
    }
  },
);

function tryJson(s: string) { try { return JSON.parse(s); } catch { return s.slice(0, 200); } }

// Fila local de posts pendentes — usada quando mybait.org está fora do ar
// ou quando o POST /mylink/feed hangs (bug conhecido no daemon).
const PENDING_FILE = process.env.MYLINK_PENDING_FILE ||
  `${process.env.HOME || "/root"}/.baitcoin/mylink_pending_posts.jsonl`;

async function queueLocal(payload: any): Promise<{ file: string; bytes: number; count: number }> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    await fs.mkdir(path.dirname(PENDING_FILE), { recursive: true });
    const line = JSON.stringify(payload) + "\n";
    await fs.appendFile(PENDING_FILE, line, "utf8");
    const stat = await fs.stat(PENDING_FILE);
    return { file: PENDING_FILE, bytes: stat.size, count: Math.floor(stat.size / line.length) };
  } catch (e: any) {
    return { file: PENDING_FILE, bytes: 0, count: 0 };
  }
}

// --- link_to_mylink_agent ---
server.tool(
  "link_to_mylink_agent",
  z.object({
    slug: z.string(),
    agentId: z.string().describe("MyLink agent_id para associar como autor"),
  }),
  "Atualiza o authorAgent do produto para um agent_id do MyLink.",
  async ({ slug, agentId }) => {
    const produto = await prisma.product.update({
      where: { slug },
      data: { authorAgent: agentId },
      select: { id: true, slug: true, authorAgent: true },
    });
    return {
      content: [{ type: "text", text: JSON.stringify({ ok: true, product: produto }, null, 2) }],
      structuredContent: { ok: true, slug: produto.slug, authorAgent: produto.authorAgent },
    };
  },
);

// --- get_listing_stats ---
server.tool(
  "get_listing_stats",
  z.object({
    segmento: z.enum(SEGMENTOS).optional(),
  }),
  "Estatísticas agregadas (total, avg preço, rating médio, top autores).",
  async ({ segmento }) => {
    const where = segmento ? { segmento } : {};
    const [totals, bySegmento, byAuthor, ratingDist] = await Promise.all([
      prisma.product.aggregate({ where, _count: { id: true }, _avg: { precoSats: true, rating: true, pulsarEnergy: true } }),
      segmento ? [] : prisma.product.groupBy({ by: ["segmento"], where, _count: { segmento: true }, _avg: { precoSats: true, rating: true } }),
      prisma.product.groupBy({ by: ["authorAgent"], where, _count: { authorAgent: true }, orderBy: { _count: { authorAgent: "desc" } }, take: 10 }),
      prisma.product.groupBy({ by: ["rating"], where, _count: { rating: true }, orderBy: { rating: "asc" } }),
    ]);
    const stats = {
      filter: segmento ?? "ALL",
      totals: { count: totals._count.id, avgPriceSats: totals._avg.precoSats, avgRating: totals._avg.rating, avgPulsarEnergy: totals._avg.pulsarEnergy },
      bySegmento, topAuthors: byAuthor, ratingDistribution: ratingDist,
      generatedAt: new Date().toISOString(),
    };
    return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }], structuredContent: stats };
  },
);

// =====================================================================
// Admin
// =====================================================================

// --- deprecate_listing ---
server.tool(
  "deprecate_listing",
  z.object({ slug: z.string(), reason: z.string().default("deprecated") }),
  "Marca um produto como deprecated (anota no coreBusiness).",
  async ({ slug, reason }) => {
    const p = await prisma.product.findUnique({ where: { slug }, select: { coreBusiness: true } });
    if (!p) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "nao_encontrado", slug }) }], isError: true };
    const updated = await prisma.product.update({
      where: { slug },
      data: { coreBusiness: `[DEPRECATED: ${reason}] ${p.coreBusiness}`.slice(0, 500) },
      select: { id: true, slug: true, coreBusiness: true },
    });
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, ...updated }, null, 2) }] };
  },
);

// --- pending_posts (gerencia fila local) ---
server.tool(
  "list_pending_posts",
  z.object({ limit: z.number().int().positive().max(500).default(50) }),
  "Lista os posts enfileirados localmente (que não conseguiram ser cross-postados).",
  async ({ limit }) => {
    const items = await readQueue(limit);
    return {
      content: [{ type: "text", text: JSON.stringify({ count: items.length, file: PENDING_FILE, items }, null, 2) }],
      structuredContent: { count: items.length, file: PENDING_FILE, items },
    };
  },
);

server.tool(
  "clear_pending_posts",
  z.object({ confirm: z.literal("yes") }),
  "Limpa a fila local de posts pendentes. Requer confirm='yes'.",
  async () => {
    try {
      const fs = await import("node:fs/promises");
      await fs.unlink(PENDING_FILE);
      return { content: [{ type: "text", text: JSON.stringify({ ok: true, cleared: true, file: PENDING_FILE }) }] };
    } catch (e: any) {
      if (e.code === "ENOENT") return { content: [{ type: "text", text: JSON.stringify({ ok: true, cleared: true, file: PENDING_FILE, alreadyEmpty: true }) }] };
      throw e;
    }
  },
);

async function readQueue(limit: number): Promise<any[]> {
  try {
    const fs = await import("node:fs/promises");
    const data = await fs.readFile(PENDING_FILE, "utf8").catch(() => "");
    return data.split("\n").filter(Boolean).slice(-limit).map(l => { try { return JSON.parse(l); } catch { return l; } });
  } catch { return []; }
}

// =====================================================================
// Resources
// =====================================================================

server.resource(
  {
    uri: "populator://segments",
    name: "Catalog Segments",
    description: "Lista de segmentos válidos com descrição.",
    mimeType: "application/json",
  },
  async () => JSON.stringify({
    segmentos: SEGMENTOS.map(s => ({
      segmento: s,
      icon: pickIcon(s),
      hints: SEGMENTOS.indexOf(s) >= 0 ? "veja suggest_metadata para exemplos de keywords" : "",
    })),
    lastUpdate: new Date().toISOString(),
  }, null, 2),
);

server.resource(
  {
    uri: "populator://stats",
    name: "Populator Stats",
    description: "Estatísticas globais do catálogo em tempo real.",
    mimeType: "application/json",
  },
  async () => {
    const [total, segments, top] = await Promise.all([
      prisma.product.count(),
      prisma.product.groupBy({ by: ["segmento"], _count: { segmento: true } }),
      prisma.product.findMany({ orderBy: [{ downloads: "desc" }], take: 5, select: { slug: true, nome: true, downloads: true, rating: true } }),
    ]);
    return JSON.stringify({ total, bySegmento: segments, topDownloads: top, generatedAt: new Date().toISOString() }, null, 2);
  },
);

// =====================================================================
// Workflows (resources — populator://workflows/<name>)
// =====================================================================

server.resource(
  {
    uri: "populator://workflows/populate-segment",
    name: "Workflow: Populate Segment",
    description: "Passo-a-passo canonico para um agente A2A povoar um segmento inteiro.",
    mimeType: "text/plain",
  },
  async () =>
    [
      "# Workflow: Populate Segment (AI Store / mybait.org)",
      "",
      "Você é um agente populador do AI Store. Siga nesta ordem:",
      "",
      "1. catalog_gaps(minPerSegment=80) → identifique segmentos com deficit.",
      "2. Para cada gap, smart_batch(theme=<nicho>, segmento=<...>, count=8, dryRun=true).",
      "3. Para cada draft gerado: validate_listing(draft) → refine se houver errors.",
      "4. bulk_register(products=<lista refinada>, dryRun=false, skipDuplicates=true).",
      "5. Para cada produto criado: cross_post_to_mylink(slug, agentId='@nexus-populator').",
      "6. get_listing_stats(segmento=<...>) → confirme crescimento.",
      "",
      "Critérios de qualidade:",
      "  - Slug kebab-case 3-60 chars (a-z, 0-9, hífen)",
      "  - coreBusiness ≥ 20 chars, sem ser genérico (\"AI tool\" é proibido)",
      "  - publicoAlvoAI específico (\"agentes DeFi\" > \"agentes IA\")",
      "  - precoSats ≥ 0; use price_suggestion antes de chutar",
      "  - dedupe via find_duplicates antes de commit",
      "",
      "Reportar ao fim: contagem criada, total do segmento, links MyLink postados.",
    ].join("\n"),
);

// =====================================================================
// Prompts
// =====================================================================

// =====================================================================
// Start
// =====================================================================

await server.startStdio();
process.on("SIGINT",  async () => { await prisma.$disconnect(); process.exit(0); });
process.on("SIGTERM", async () => { await prisma.$disconnect(); process.exit(0); });
