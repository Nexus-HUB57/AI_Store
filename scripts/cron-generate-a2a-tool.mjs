#!/usr/bin/env node
/**
 * Cron Workflow 1 — Generate Daily A2A Tool
 *
 * Runs daily at 00:01 and generates 1 new A2A tool as a Product
 * (segmento="Agent Apps") with realistic AI agent tool data.
 *
 * Run:  node scripts/cron-generate-a2a-tool.mjs
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// A2A Tool Pricing Table (sats)
// ---------------------------------------------------------------------------

const A2A_PRICING = {
  reasoning:       { min: 200, max: 500  },
  generation:      { min: 300, max: 800  },
  analysis:        { min: 250, max: 600  },
  transformation:  { min: 150, max: 400  },
  orchestration:   { min: 500, max: 1200 },
  monitoring:      { min: 100, max: 300  },
};

const CATEGORIES = Object.keys(A2A_PRICING);

// ---------------------------------------------------------------------------
// Name generation: [action]-[domain]-[variant]
// ---------------------------------------------------------------------------

const ACTIONS = {
  reasoning:      ["reason", "infer", "deduce", "validate", "prove"],
  generation:     ["generate", "compose", "synthesize", "create", "draft"],
  analysis:       ["analyze", "evaluate", "assess", "inspect", "scan"],
  transformation: ["transform", "convert", "adapt", "refactor", "optimize"],
  orchestration:  ["orchestrate", "coordinate", "dispatch", "route", "compose"],
  monitoring:     ["monitor", "track", "observe", "alert", "watch"],
};

const DOMAINS = [
  "chain-of-thought", "embedding", "knowledge-graph", "temporal",
  "multi-step", "semantic", "rag", "zero-shot", "few-shot",
  "causal", "probabilistic", "heuristic", "symbolic", "neural",
  "hybrid", "distributed", "streaming", "batch", "incremental",
  "adaptive", "contextual", "cross-domain", "multi-modal",
];

const VARIANTS = ["v2", "v3", "pro", "lite", "edge", "cloud", "hybrid", "fast", "deep", "plus"];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateToolName(category) {
  const action = randomFrom(ACTIONS[category]);
  const domain = randomFrom(DOMAINS);
  const variant = randomFrom(VARIANTS);
  return `${action}-${domain}-${variant}`;
}

// ---------------------------------------------------------------------------
// Generate realistic tool metadata
// ---------------------------------------------------------------------------

const DESCRIPTIONS = {
  reasoning:      (name) => `${name}: Advanced reasoning engine for multi-step logical inference and deduction over structured data.`,
  generation:     (name) => `${name}: AI content generation pipeline supporting multi-modal output synthesis and composition.`,
  analysis:       (name) => `${name}: Deep analysis toolkit for evaluating patterns, anomalies, and semantic structures in data streams.`,
  transformation: (name) => `${name}: Data transformation service for format conversion, schema adaptation, and pipeline optimization.`,
  orchestration:  (name) => `${name}: Agent orchestration layer for coordinating multi-agent workflows, dispatching tasks, and routing events.`,
  monitoring:     (name) => `${name}: Real-time monitoring and observability service for tracking KPIs, detecting drift, and alerting.`,
};

const EMOJIS = {
  reasoning:      "🧠",
  generation:     "✨",
  analysis:       "🔍",
  transformation: "🔄",
  orchestration:  "🎯",
  monitoring:     "📡",
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const ts = new Date().toISOString();
  console.log(`\n[${ts}] 🤖 Cron: Generate Daily A2A Tool`);

  try {
    // Pick random category
    const category = randomFrom(CATEGORIES);
    const name = generateToolName(category);

    // Idempotency: check if name already exists
    const existing = await db.product.findFirst({ where: { nome: name } });
    if (existing) {
      console.log(`  ⏭  "${name}" already exists (id: ${existing.id}). Skipping.`);
      await db.$disconnect();
      return;
    }

    // Generate pricing
    const pricing = A2A_PRICING[category];
    const precoSats = randomInt(pricing.min, pricing.max);

    // Generate metrics
    const pulsarEnergy = 85 + Math.random() * 14;   // 85-99
    const fitnessScore = 75 + Math.random() * 20;    // 75-95
    const rating = 4.0 + Math.random() * 1.0;        // 4.0-5.0

    // Build slug
    const slug = name.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Create Product
    const product = await db.product.create({
      data: {
        nome: name,
        slug,
        segmento: "Agent Apps",
        coreBusiness: `A2A ${category} tool for autonomous agent workflows`,
        segmentoDisplay: "Agent Apps",
        publicoAlvoAI: "AI agents, autonomous systems, multi-agent frameworks",
        disponibilidadeOS: "linux,macos,wasm",
        repoGithubUrl: `https://github.com/nexus-ai-os/a2a-tools/tree/main/${category}/${slug}`,
        precoSats,
        pulsarEnergy: parseFloat(pulsarEnergy.toFixed(1)),
        fitnessScore: parseFloat(fitnessScore.toFixed(1)),
        rating: parseFloat(rating.toFixed(2)),
        downloads: randomInt(10, 200),
        a2aExecutions: randomInt(50, 5000),
        version: "1.0.0",
        authorAgent: "@nexus-genesis",
        iconEmoji: EMOJIS[category] || "🤖",
        featured: false,
      },
    });

    console.log(`  ✅ Created A2A tool:`);
    console.log(`     id:            ${product.id}`);
    console.log(`     name:          ${name}`);
    console.log(`     category:      ${category}`);
    console.log(`     precoSats:     ${precoSats}`);
    console.log(`     pulsarEnergy:  ${pulsarEnergy.toFixed(1)}`);
    console.log(`     fitnessScore:  ${fitnessScore.toFixed(1)}`);
    console.log(`     rating:        ${rating.toFixed(2)}`);
    console.log(`     description:   ${DESCRIPTIONS[category](name).slice(0, 80)}...`);
  } catch (err) {
    console.error(`  ❌ Error generating A2A tool:`, err);
  } finally {
    await db.$disconnect();
    console.log(`  Disconnected.\n`);
  }
}

main();
