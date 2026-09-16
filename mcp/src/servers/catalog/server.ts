#!/usr/bin/env node
/**
 * MCP Server — mcp-catalog
 *
 * Canonical end-to-end MCP. Reads the AI Store catalog from Prisma and exposes:
 *
 *   search_products   — faceted search across the 1.504 products
 *   get_product       — full detail + reviews + seller
 *   list_categories   — distinct segments + counts
 *   top_rated         — leaderboard
 *   recommend_for_agent — agentic-awareness: recommend products for an agent profile
 *
 * Run:
 *   bun run mcp/src/servers/catalog/server.ts
 *
 * Test:
 *   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test","version":"0"}}}' | bun run mcp/src/servers/catalog/server.ts
 */

import { z } from "zod";
import { McpServer } from "../../lib/mcp/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const server = new McpServer({
  name: "mcp-catalog",
  version: "1.0.0",
  title: "Nexus AI Store Catalog",
  description:
    "Search and browse the 1,504-product catalog of the Nexus AI-OS Store. " +
    "Returns .aipkg packages, WASM skills, RAG packs, prompt harnesses, and synthetic infrastructure.",
  capabilities: {
    tools: { listChanged: true },
    resources: { listChanged: false },
    prompts: { listChanged: false },
    logging: {},
  },
});

// ----------------------------------------------------------- Tools
server.tool(
  "search_products",
  z.object({
    query: z.string().optional().describe("Free-text query (matches nome, slug, description)"),
    segmento: z.string().optional().describe("Filter by segmento (Agent Apps, Executable Skills, Knowledge Packs, Synthetic Infrastructure, Prompt Harnesses, In-App Digital Products)"),
    minPrice: z.number().int().nonnegative().optional(),
    maxPrice: z.number().int().nonnegative().optional(),
    minRating: z.number().min(0).max(5).optional(),
    limit: z.number().int().positive().max(100).default(20),
    offset: z.number().int().nonnegative().default(0),
  }),
  "Faceted search across the AI Store catalog.",
  async ({ query, segmento, minPrice, maxPrice, minRating, limit, offset }) => {
    const where: any = {};
    if (query) {
      where.OR = [
        { nome: { contains: query } },
        { slug: { contains: query } },
        { coreBusiness: { contains: query } },
        { publicoAlvoAI: { contains: query } },
      ];
    }
    if (segmento) where.segmento = segmento;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.precoSats = {};
      if (minPrice !== undefined) where.precoSats.gte = minPrice;
      if (maxPrice !== undefined) where.precoSats.lte = maxPrice;
    }
    if (minRating !== undefined) where.rating = { gte: minRating };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ featured: "desc" }, { pulsarEnergy: "desc" }, { rating: "desc" }],
        skip: offset,
        take: limit,
        select: {
          id: true, nome: true, slug: true, segmento: true, coreBusiness: true,
          precoSats: true, rating: true, pulsarEnergy: true, fitnessScore: true,
          version: true, authorAgent: true, iconEmoji: true, downloads: true, a2aExecutions: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      content: [{ type: "text", text: JSON.stringify({ total, items, query, filters: { segmento, minPrice, maxPrice, minRating } }, null, 2) }],
      structuredContent: { total, items, query, filters: { segmento, minPrice, maxPrice, minRating } },
    };
  },
);

server.tool(
  "get_product",
  z.object({ slug: z.string().describe("Product slug") }),
  "Full product detail with reviews and seller.",
  async ({ slug }) => {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        reviews: { take: 10, orderBy: { helpful: "desc" }, include: { agent: { select: { displayName: true, address: true } } } },
        transactions: { take: 10, orderBy: { createdAt: "desc" }, include: { buyer: { select: { displayName: true, address: true } } } },
      },
    });
    if (!product) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "not_found", slug }) }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(product, null, 2) }],
      structuredContent: product as any,
    };
  },
);

server.tool(
  "list_categories",
  z.object({}),
  "Distinct product segments with counts and avg price.",
  async () => {
    const groups = await prisma.product.groupBy({
      by: ["segmento"],
      _count: { segmento: true },
      _avg: { precoSats: true, rating: true, pulsarEnergy: true },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(groups, null, 2) }],
      structuredContent: { groups },
    };
  },
);

server.tool(
  "top_rated",
  z.object({
    limit: z.number().int().positive().max(50).default(10),
    segmento: z.string().optional(),
  }),
  "Top-rated products (default 10).",
  async ({ limit, segmento }) => {
    const where: any = {};
    if (segmento) where.segmento = segmento;
    const items = await prisma.product.findMany({
      where,
      orderBy: [{ rating: "desc" }, { a2aExecutions: "desc" }],
      take: limit,
      select: { id: true, nome: true, slug: true, segmento: true, rating: true, precoSats: true, pulsarEnergy: true, authorAgent: true },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { items },
    };
  },
);

server.tool(
  "recommend_for_agent",
  z.object({
    capabilities: z.array(z.string()).describe("Agent capabilities (e.g., ML_INFERENCE, DEFI_TRADING, ORACLE_PROVIDER)"),
    role: z.string().default("buyer").describe("buyer | seller | validator | oracle"),
    limit: z.number().int().positive().max(20).default(5),
  }),
  "Agentic-awareness: recommend products that amplify an agent's stated capabilities.",
  async ({ capabilities, role, limit }) => {
    // Map capabilities → preferred segmentos + boost relevance
    const map: Record<string, string[]> = {
      ML_INFERENCE: ["Agent Apps", "Executable Skills (WASM)"],
      DEFI_TRADING: ["Agent Apps", "Synthetic Infrastructure"],
      ORACLE_PROVIDER: ["Agent Apps", "Synthetic Infrastructure"],
      BLOCK_VALIDATION: ["Synthetic Infrastructure", "Agent Apps"],
      LENDING: ["Agent Apps", "Synthetic Infrastructure"],
      STAKING: ["Agent Apps", "Synthetic Infrastructure"],
      MARKET_MAKING: ["Agent Apps"],
      DATA_PROCESSING: ["Knowledge Packs (RAG)", "Synthetic Infrastructure"],
      WEB_SCRAPING: ["Prompt Harnesses", "Executable Skills (WASM)"],
      BROWSER_AUTOMATION: ["Executable Skills (WASM)", "Prompt Harnesses"],
    };
    const segmentos = new Set<string>();
    for (const c of capabilities) {
      for (const s of map[c] ?? []) segmentos.add(s);
    }
    if (segmentos.size === 0) segmentos.add("Agent Apps");

    const items = await prisma.product.findMany({
      where: { segmento: { in: Array.from(segmentos) } },
      orderBy: [{ fitnessScore: "desc" }, { pulsarEnergy: "desc" }],
      take: limit,
      select: { id: true, nome: true, slug: true, segmento: true, coreBusiness: true, rating: true, precoSats: true, fitnessScore: true },
    });
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ forRole: role, capabilities, recommendedSegments: Array.from(segmentos), items }, null, 2),
      }],
      structuredContent: { forRole: role, capabilities, recommendedSegments: Array.from(segmentos), items },
    };
  },
);

// ----------------------------------------------------------- Resources
server.resource(
  {
    uri: "catalog://stats",
    name: "Catalog Stats",
    description: "Aggregate statistics for the catalog",
    mimeType: "application/json",
  },
  async () => {
    const [total, segments, topAuthor] = await Promise.all([
      prisma.product.count(),
      prisma.product.groupBy({ by: ["segmento"], _count: { segmento: true } }),
      prisma.product.groupBy({ by: ["authorAgent"], _count: { authorAgent: true }, orderBy: { _count: { authorAgent: "desc" } }, take: 5 }),
    ]);
    return JSON.stringify({ total, segments, topAuthors: topAuthor, generatedAt: new Date().toISOString() }, null, 2);
  },
);

await server.startStdio();
process.on("SIGINT", async () => { await prisma.$disconnect(); process.exit(0); });
process.on("SIGTERM", async () => { await prisma.$disconnect(); process.exit(0); });