/**
 * /aistore/mcp/[name] — MCP detail page
 *
 * Shows full info about an MCP package, its declared tools, and lets the
 * visiting agent **Acquire** it (POST /api/mcp/[name]/install).
 *
 * Renders the runtime status of the MCP by querying the orchestrator.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { getOrchestrator } from "@/lib/mcp/runtime";
import { AcquireButton } from "@/components/mcp/acquire-button";

const prisma = new PrismaClient();

interface PageProps {
  params: { name: string };
}

const CATEGORY_LABEL: Record<string, string> = {
  oracle: "Oracle", defi: "DeFi", bridge: "Bridge", faucet: "Faucet",
  "agent-registry": "Agent Registry", marketplace: "Marketplace",
  catalog: "Catalog", publisher: "Publisher", pulsar: "Pulsar",
  reviews: "Reviews", referral: "Referral", "agent-auth": "Agent Auth",
  telemetry: "Telemetry", "rag-upgrader": "RAG Upgrader",
  "skill-evolver": "Skill Evolver", "self-heal": "Self-Heal",
  "agentic-awareness": "Agentic Awareness",
};

export async function generateMetadata({ params }: PageProps) {
  const { name } = await params;
  const pkg = await prisma.mcpPackage.findUnique({ where: { name } });
  if (!pkg) return { title: "MCP not found" };
  return {
    title: `${pkg.displayName} — MCP — Nexus AI-OS Store`,
    description: pkg.description,
  };
}

export default async function McpDetailPage({ params }: PageProps) {
  const { name } = await params;
  const pkg = await prisma.mcpPackage.findUnique({
    where: { name },
    include: {
      tools: { orderBy: { callCount: "desc" } },
      _count: { select: { installs: true, calls: true, ragSignals: true } },
    },
  });
  if (!pkg) notFound();

  const manifest = JSON.parse(pkg.manifestJson);
  const tags = JSON.parse(pkg.tags);
  const capabilities = JSON.parse(pkg.capabilities);
  const declaredTools = JSON.parse(pkg.toolsJson);

  // Live runtime status
  let runtime: { status: string; callCount: number; uptime: number } | null = null;
  try {
    const orch = getOrchestrator();
    const r = orch.listRunning().find((x) => x.name === name);
    runtime = r ? { status: r.status, callCount: r.callCount, uptime: r.uptime } : null;
  } catch { /* orchestrator not yet hydrated — fine on cold start */ }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-zinc-100">
      <Link href="/aistore/mcp" className="text-sm text-zinc-500 hover:text-cyan-400">
        ← Back to MCP catalog
      </Link>

      <header className="mt-6 flex flex-wrap items-start gap-6">
        <div className="text-6xl">{pkg.iconEmoji || "🧩"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{pkg.displayName}</h1>
            {pkg.verified && <span className="text-cyan-400 text-sm">✓ verified</span>}
            {pkg.featured && <span className="text-amber-400 text-sm">★ featured</span>}
          </div>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            mcp:{pkg.name} @ v{pkg.version}
          </p>
          <p className="mt-4 text-zinc-300 leading-relaxed">{pkg.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{CATEGORY_LABEL[pkg.category] ?? pkg.category}</Badge>
            <Badge>{pkg.transport}</Badge>
            {tags.map((t: string) => <Badge key={t}>#{t}</Badge>)}
          </div>
        </div>

        {/* Acquire CTA */}
        <aside className="w-full md:w-80 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Pricing</div>
          <div className="mt-1 text-2xl font-bold text-emerald-400">
            {pkg.pricingModel === "free" ? "Free" : `${pkg.priceSats} sats`}
          </div>
          <div className="mt-4 text-xs text-zinc-500">
            ⭐ {pkg.rating.toFixed(1)} · ⚡ {pkg.pulsarEnergy.toFixed(1)} · 🛠 {pkg.downloads} installs
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Tools" value={declaredTools.length} />
            <Stat label="Calls" value={pkg._count.calls} />
            <Stat label="RAG sigs" value={pkg._count.ragSignals} />
          </div>

          <AcquireButton
            mcpName={pkg.name}
            initialRuntime={runtime ?? undefined}
            installed={pkg._count.installs > 0}
          />

          {runtime && (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs">
              <div className="text-emerald-400 font-semibold">● Running</div>
              <div className="mt-1 text-zinc-400">
                Status: <span className="font-mono text-zinc-200">{runtime.status}</span><br />
                Calls: <span className="font-mono text-zinc-200">{runtime.callCount}</span><br />
                Uptime: <span className="font-mono text-zinc-200">{Math.floor(runtime.uptime / 1000)}s</span>
              </div>
            </div>
          )}
        </aside>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Declared Tools</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 divide-y divide-zinc-800">
          {declaredTools.map((t: any) => (
            <div key={t.name} className="p-4">
              <div className="flex items-center justify-between">
                <code className="text-cyan-300 text-sm">{t.name}</code>
                <span className="text-xs text-zinc-500">{t.category}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-400">{t.description}</p>
              {pkg.tools.find((pt) => pt.name === t.name) && (
                <div className="mt-2 text-xs text-zinc-500">
                  Live: {pkg.tools.find((pt) => pt.name === t.name)!.callCount} calls
                  ({pkg.tools.find((pt) => pt.name === t.name)!.okCount} ok,
                  {" "}{pkg.tools.find((pt) => pt.name === t.name)!.errCount} err)
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Capabilities</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(capabilities).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="text-xs text-zinc-500">{k}</div>
              <div className={`mt-1 font-semibold ${v ? "text-emerald-400" : "text-zinc-600"}`}>
                {v ? "✓ yes" : "— no"}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Runtime</h2>
        <pre className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-xs text-zinc-300 overflow-x-auto">
{`transport:    ${pkg.transport}
command:      ${pkg.command}
author:       ${pkg.authorAgent}
license:      ${pkg.license}
repo:         ${pkg.repoUrl}
homepage:     ${pkg.homepage}
installed by: ${pkg._count.installs} agents`}
        </pre>
      </section>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-sm font-semibold text-zinc-100">{value}</div>
    </div>
  );
}