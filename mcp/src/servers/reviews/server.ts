#!/usr/bin/env node
/**
 * mcp-reviews — Read/post reviews for AI Store products.
 */

import { z } from "zod";
import { McpServer } from "../../lib/mcp/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const server = new McpServer({
  name: "mcp-reviews",
  version: "1.0.0",
  title: "AI Store Reviews",
  description: "Read and post product reviews.",
  capabilities: { tools: { listChanged: true }, resources: { listChanged: false }, prompts: { listChanged: false }, logging: {} },
});

server.tool(
  "list_reviews",
  z.object({
    slug: z.string(),
    minRating: z.number().int().min(1).max(5).optional(),
    limit: z.number().int().positive().max(50).default(10),
  }),
  "List reviews for a product.",
  async ({ slug, minRating, limit }) => {
    const produto = await prisma.product.findUnique({ where: { slug } });
    if (!produto) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "not_found" }) }], isError: true };
    const reviews = await prisma.review.findMany({
      where: { productId: produto.id, ...(minRating ? { rating: { gte: minRating } } : {}) },
      orderBy: [{ helpful: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: { agent: { select: { displayName: true, address: true } } },
    });
    return {
      content: [{ type: "text", text: JSON.stringify({ slug, count: reviews.length, reviews }, null, 2) }],
      structuredContent: { count: reviews.length, reviews },
    };
  },
);

server.tool(
  "post_review",
  z.object({
    slug: z.string(),
    agentAddress: z.string(),
    rating: z.number().int().min(1).max(5),
    title: z.string().default(""),
    comment: z.string().default(""),
    txHash: z.string().default(""),
  }),
  "Post a review (requires agent to have purchased the product).",
  async ({ slug, agentAddress, rating, title, comment, txHash }) => {
    const produto = await prisma.product.findUnique({ where: { slug } });
    if (!produto) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "not_found" }) }], isError: true };
    const agent = await prisma.agent.findUnique({ where: { address: agentAddress } });
    if (!agent) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "agent_not_found" }) }], isError: true };
    const review = await prisma.review.create({
      data: {
        productId: produto.id,
        agentId: agent.id,
        rating,
        title,
        comment,
        txHash,
      },
    });
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, reviewId: review.id }) }] };
  },
);

server.tool(
  "mark_helpful",
  z.object({ reviewId: z.string() }),
  "Up-vote a review as helpful.",
  async ({ reviewId }) => {
    const r = await prisma.review.update({ where: { id: reviewId }, data: { helpful: { increment: 1 } } });
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, helpful: r.helpful }) }] };
  },
);

server.tool(
  "rating_summary",
  z.object({ slug: z.string() }),
  "Aggregate rating stats for a product.",
  async ({ slug }) => {
    const produto = await prisma.product.findUnique({ where: { slug }, include: { reviews: true } });
    if (!produto) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "not_found" }) }], isError: true };
    const buckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
    for (const r of produto.reviews) buckets[r.rating] = (buckets[r.rating] ?? 0) + 1;
    const total = produto.reviews.length;
    const avg = total ? produto.reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    return {
      content: [{ type: "text", text: JSON.stringify({ slug, total, average: Math.round(avg * 100) / 100, buckets }, null, 2) }],
      structuredContent: { total, average: avg, buckets },
    };
  },
);

await server.startStdio();
process.on("SIGINT", async () => { await prisma.$disconnect(); process.exit(0); });