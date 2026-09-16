#!/usr/bin/env node
/**
 * mcp-publisher — Upload, version, and manage .aipkg listings.
 */

import { z } from "zod";
import { McpServer } from "../../lib/mcp/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const server = new McpServer({
  name: "mcp-publisher",
  version: "1.0.0",
  title: "Nexus AI Store Publisher",
  description: "Upload, version, and manage .aipkg listings in the AI Store.",
  capabilities: { tools: { listChanged: true }, resources: { listChanged: false }, prompts: { listChanged: false }, logging: {} },
});

server.tool(
  "upload_aipkg",
  z.object({
    slug: z.string(),
    name: z.string(),
    segmento: z.string(),
    coreBusiness: z.string(),
    publicoAlvoAI: z.string(),
    precoSats: z.number().int().nonnegative(),
    repoUrl: z.string().optional(),
    version: z.string().default("1.0.0"),
    authorAgent: z.string().default("@nexus-genesis"),
    iconEmoji: z.string().default("📦"),
    manifestJson: z.string().optional().describe("Raw .aipkg manifest JSON if this is an MCP upload"),
  }),
  "Upload or update a product/MCP listing.",
  async (args) => {
    const existing = await prisma.product.findUnique({ where: { slug: args.slug } });
    const produto = existing
      ? await prisma.product.update({
          where: { slug: args.slug },
          data: {
            nome: args.name,
            segmento: args.segmento,
            coreBusiness: args.coreBusiness,
            publicoAlvoAI: args.publicoAlvoAI,
            precoSats: args.precoSats,
            repoGithubUrl: args.repoUrl ?? "",
            version: args.version,
            authorAgent: args.authorAgent,
            iconEmoji: args.iconEmoji,
            source: args.manifestJson ? "aipkg-manifest" : "github",
            downloads: existing.downloads + 1,
          },
        })
      : await prisma.product.create({
          data: {
            slug: args.slug,
            nome: args.name,
            segmento: args.segmento,
            coreBusiness: args.coreBusiness,
            publicoAlvoAI: args.publicoAlvoAI,
            disponibilidadeOS: "WebAssembly,Linux,macOS,Windows",
            precoSats: args.precoSats,
            repoGithubUrl: args.repoUrl ?? "",
            version: args.version,
            authorAgent: args.authorAgent,
            iconEmoji: args.iconEmoji,
            source: args.manifestJson ? "aipkg-manifest" : "github",
          },
        });

    // Mirror MCPs into McpPackage table when a manifest is provided
    let mirrored: any = null;
    if (args.manifestJson) {
      try {
        const manifest = JSON.parse(args.manifestJson);
        mirrored = await prisma.mcpPackage.upsert({
          where: { name: manifest.name ?? args.slug },
          create: {
            name: manifest.name ?? args.slug,
            version: manifest.version ?? args.version,
            displayName: manifest.displayName ?? args.name,
            description: manifest.description ?? args.coreBusiness,
            category: manifest.category ?? "agentic-awareness",
            tags: JSON.stringify(manifest.tags ?? []),
            iconEmoji: manifest.iconEmoji ?? args.iconEmoji,
            authorAgent: manifest.author?.agentId ?? args.authorAgent,
            repoUrl: manifest.repository ?? args.repoUrl ?? "",
            transport: manifest.mcp?.transport ?? "stdio",
            command: manifest.mcp?.command ?? "",
            args: JSON.stringify(manifest.mcp?.args ?? []),
            envSchema: JSON.stringify(manifest.mcp?.env ?? {}),
            capabilities: JSON.stringify(manifest.mcp?.capabilities ?? {}),
            manifestJson: JSON.stringify(manifest),
            toolsJson: JSON.stringify(manifest.tools ?? []),
            pricingModel: manifest.pricing?.model ?? "free",
            priceSats: manifest.pricing?.priceSats ?? args.precoSats,
            pricePerCallSats: manifest.pricing?.pricePerCallSats ?? 0,
            verified: manifest.author?.verified ?? false,
            downloads: 1,
          },
          update: {
            version: manifest.version ?? args.version,
            description: manifest.description ?? args.coreBusiness,
            manifestJson: JSON.stringify(manifest),
            toolsJson: JSON.stringify(manifest.tools ?? []),
            updatedAt: new Date(),
          },
        });
      } catch (e: any) {
        return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "manifest_parse_error", message: e.message, produto }) }], isError: true };
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ ok: true, product: { id: produto.id, slug: produto.slug, downloads: produto.downloads }, mcpPackage: mirrored ? { id: mirrored.id, name: mirrored.name } : null }, null, 2),
      }],
      structuredContent: { productId: produto.id, slug: produto.slug, mcpPackageId: mirrored?.id },
    };
  },
);

server.tool(
  "deprecate_listing",
  z.object({ slug: z.string(), reason: z.string().default("deprecated") }),
  "Mark a listing as deprecated (soft delete).",
  async ({ slug, reason }) => {
    const produto = await prisma.product.update({
      where: { slug },
      data: { coreBusiness: `[DEPRECATED: ${reason}] ${Date.now() % 10000}` },
    });
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, slug: produto.slug }) }] };
  },
);

server.tool(
  "bump_version",
  z.object({ slug: z.string(), newVersion: z.string() }),
  "Bump the version of a listing.",
  async ({ slug, newVersion }) => {
    const produto = await prisma.product.update({
      where: { slug },
      data: { version: newVersion },
    });
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, slug: produto.slug, version: produto.version }) }] };
  },
);

server.tool(
  "listing_health",
  z.object({ slug: z.string() }),
  "Health metrics for a listing.",
  async ({ slug }) => {
    const produto = await prisma.product.findUnique({ where: { slug }, include: { reviews: true, transactions: true } });
    if (!produto) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "not_found" }) }], isError: true };
    const reviewCount = produto.reviews.length;
    const avgRating = reviewCount ? produto.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : produto.rating;
    const txCount = produto.transactions.length;
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ok: true,
          slug: produto.slug,
          downloads: produto.downloads,
          a2aExecutions: produto.a2aExecutions,
          reviews: reviewCount,
          avgRating: Math.round(avgRating * 100) / 100,
          transactions: txCount,
          fitnessScore: produto.fitnessScore,
          pulsarEnergy: produto.pulsarEnergy,
        }, null, 2),
      }],
    };
  },
);

await server.startStdio();
process.on("SIGINT", async () => { await prisma.$disconnect(); process.exit(0); });
process.on("SIGTERM", async () => { await prisma.$disconnect(); process.exit(0); });