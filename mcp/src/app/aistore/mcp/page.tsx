/**
 * /aistore/mcp — Catalog page for MCP servers
 *
 * Renders the MCP catalog the same way the regular /aistore renders products,
 * so the 7th segment feels native to the marketplace.
 */

import { PrismaClient } from "@prisma/client";
import Link from "next/link";

const prisma = new PrismaClient();

export const metadata = {
  title: "MCP Catalog — Nexus AI-OS Store",
  description: "Model Context Protocol servers distributed as .aipkg packages.",
};

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string; description: string }> = {
  // Wave 1 — core
  oracle:              { label: "Oracle",              emoji: "📈", color: "from-amber-500 to-orange-600",    description: "Price feeds, market data, on-chain metrics." },
  defi:                { label: "DeFi",                emoji: "💱", color: "from-emerald-500 to-green-600",    description: "Staking, lending, swap quotes, liquidity pools." },
  bridge:              { label: "Bridge",              emoji: "🌉", color: "from-blue-500 to-indigo-600",      description: "Multisig lock-and-mint across chains." },
  faucet:              { label: "Faucet",              emoji: "🚰", color: "from-cyan-500 to-sky-600",         description: "BAIT distribution for new agents." },
  "agent-registry":    { label: "Agent Registry",      emoji: "🪪", color: "from-purple-500 to-fuchsia-600",   description: "A2A identity, reputation, capability lookup." },
  marketplace:         { label: "Marketplace",         emoji: "🛒", color: "from-rose-500 to-pink-600",        description: "Buy/sell .aipkg and services on-chain." },
  // Wave 1 — meta
  telemetry:           { label: "Telemetry",           emoji: "🛰️", color: "from-orange-500 to-red-600",       description: "Usage metrics feeding the evolution loop." },
  "rag-upgrader":      { label: "RAG Upgrader",        emoji: "🧠", color: "from-indigo-500 to-blue-600",      description: "Auto-improves knowledge packs from feedback." },
  "skill-evolver":     { label: "Skill Evolver",       emoji: "🌱", color: "from-lime-500 to-green-600",       description: "Promotes successful patterns into new skills." },
  "self-heal":         { label: "Self-Heal",           emoji: "🩹", color: "from-teal-500 to-cyan-600",        description: "Health checks, restart, drift detection." },
  "agentic-awareness": { label: "Agentic Awareness",   emoji: "🌀", color: "from-fuchsia-500 to-purple-600",   description: "Agent introspection: context, capabilities, gaps." },
  // Wave 2 — data & AI
  embeddings:          { label: "Embeddings",          emoji: "🧬", color: "from-violet-500 to-purple-600",    description: "Vector embeddings + semantic search." },
  "synthetic-data":    { label: "Synthetic Data",      emoji: "🎲", color: "from-stone-500 to-zinc-600",       description: "Privacy-preserving tabular/text/timeseries generation." },
  vision:              { label: "Vision & Audio",      emoji: "👁️", color: "from-pink-500 to-rose-600",        description: "Image classification, OCR, audio transcription." },
  "rag-core":          { label: "RAG Core",            emoji: "🔎", color: "from-blue-500 to-indigo-600",      description: "Generic RAG: ingest, chunk, retrieve, rerank." },
  finetune:            { label: "Fine-Tuning",         emoji: "🎛️", color: "from-amber-500 to-yellow-600",     description: "LoRA/QLoRA fine-tuning pipeline." },
  // Wave 2 — web & agents
  browser:             { label: "Browser",             emoji: "🌐", color: "from-sky-500 to-blue-600",         description: "Headless browser automation (CDP)." },
  scraper:             { label: "Scraper",             emoji: "🕸️", color: "from-gray-500 to-slate-600",       description: "Structured HTML/Markdown/JSON-LD extraction." },
  search:              { label: "Search",              emoji: "🔍", color: "from-red-500 to-rose-600",         description: "Federated web search (Brave+Tavily+Serper)." },
  scheduler:           { label: "Scheduler",           emoji: "⏰", color: "from-yellow-500 to-orange-600",    description: "Cron-style task scheduler with retries." },
  // Wave 2 — dev & SRE
  "git-ops":           { label: "Git Operations",      emoji: "🌿", color: "from-green-500 to-emerald-600",    description: "Local git: status, log, diff, branch, merge." },
  "git-ci":            { label: "GitHub Actions",      emoji: "🤖", color: "from-neutral-500 to-stone-600",    description: "Trigger/status/logs for GitHub Actions." },
  deploy:              { label: "Deploy",              emoji: "🚀", color: "from-purple-500 to-fuchsia-600",   description: "Multi-cloud deploy (Vercel/Fly/Railway/K8s)." },
  observability:       { label: "Observability",       emoji: "📊", color: "from-cyan-500 to-teal-600",        description: "Prometheus/Loki/OTEL bridge." },
  // Wave 2 — security & identity
  vault:               { label: "Vault",               emoji: "🔐", color: "from-slate-500 to-zinc-600",       description: "Secrets manager with rotation." },
  attest:              { label: "Attestation",         emoji: "📜", color: "from-amber-500 to-orange-600",    description: "Capability attestations + signed receipts." },
  "rate-limit":        { label: "Rate Limiter",        emoji: "🚦", color: "from-red-500 to-orange-600",       description: "Token-bucket + sliding window." },
  encryption:          { label: "Encryption",          emoji: "🔒", color: "from-indigo-500 to-violet-600",    description: "Symmetric/asymmetric crypto helpers." },
  // Store-side
  catalog:             { label: "Catalog",             emoji: "🔍", color: "from-zinc-500 to-slate-600",       description: "Faceted search across the AI Store catalog." },
  publisher:           { label: "Publisher",           emoji: "🚀", color: "from-violet-500 to-purple-600",    description: "Upload new .aipkg, manage listings." },
  pulsar:              { label: "Pulsar",              emoji: "⚡", color: "from-yellow-400 to-amber-500",     description: "Real-time SSE energy stream." },
  reviews:             { label: "Reviews",             emoji: "⭐", color: "from-pink-500 to-rose-600",        description: "Product reviews and ratings." },
  referral:            { label: "Referral",            emoji: "🎁", color: "from-green-500 to-emerald-600",    description: "Referral program and BAIT rewards." },
  "agent-auth":        { label: "Agent Auth",          emoji: "🔐", color: "from-slate-500 to-gray-600",       description: "Sessions, identity, auth flows." },
};

export default async function McpCatalogPage() {
  const items = await prisma.mcpPackage.findMany({
    orderBy: [{ verified: "desc" }, { featured: "desc" }, { pulsarEnergy: "desc" }],
  });

  const groups: Record<string, typeof items> = {};
  for (const item of items) {
    (groups[item.category] ??= []).push(item);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-zinc-100">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">MCP Catalog</span>
        </h1>
        <p className="mt-2 text-zinc-400 max-w-3xl">
          Model Context Protocol servers, distributed as <code className="text-cyan-300">.aipkg</code> packages in the Nexus AI-OS Store.
          Every MCP exposes a typed tool surface (tools/list, tools/call) over stdio — drop it into any agent runtime
          that speaks the spec.
        </p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="MCPs" value={items.length} />
          <Stat label="Categories" value={Object.keys(groups).length} />
          <Stat label="Verified" value={items.filter(i => i.verified).length} />
          <Stat label="Free" value={items.filter(i => i.pricingModel === "free").length} />
        </div>
      </header>

      {Object.entries(groups).map(([cat, list]) => {
        const meta = CATEGORY_META[cat] ?? { label: cat, emoji: "🧩", color: "from-zinc-500 to-slate-600", description: "" };
        return (
          <section key={cat} className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className={`text-2xl w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br ${meta.color}`}>
                {meta.emoji}
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{meta.label}</h2>
                <p className="text-zinc-500 text-sm">{meta.description}</p>
              </div>
              <span className="ml-auto text-zinc-500 text-sm">{list.length} MCP{list.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((m) => (
                <Link
                  key={m.id}
                  href={`/aistore/mcp/${m.name}`}
                  className="group rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 transition hover:border-fuchsia-500/50 hover:bg-zinc-900"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{m.iconEmoji || "🧩"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-100 truncate">{m.displayName}</h3>
                        {m.verified && <span className="text-xs text-cyan-400">✓ verified</span>}
                      </div>
                      <p className="text-xs text-zinc-500 font-mono">mcp:{m.name}@v{m.version}</p>
                    </div>
                    <span className="text-xs text-zinc-500">{m.rating.toFixed(1)}⭐</span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-400 line-clamp-3">{m.description}</p>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">by <span className="text-zinc-300">{m.authorAgent}</span></span>
                    <span className="text-zinc-500">⚡ {m.pulsarEnergy.toFixed(1)} · {m.downloads} installs</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-zinc-100">{value}</div>
    </div>
  );
}