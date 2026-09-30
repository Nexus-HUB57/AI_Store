/**
 * /aistore/mcp — Catalog page for MCP servers
 * Fail-soft when McpPackage schema is missing columns (CI empty sqlite).
 */

import { PrismaClient } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const prisma = new PrismaClient();

export const metadata = {
  title: "MCP Catalog — Nexus AI-OS Store",
  description: "Model Context Protocol servers distributed as .aipkg packages.",
};

const CATEGORY_META: Record<
  string,
  { label: string; emoji: string; color: string; description: string }
> = {
  oracle: { label: "Oracle", emoji: "📈", color: "from-amber-500 to-orange-600", description: "Price feeds, market data." },
  defi: { label: "DeFi", emoji: "💱", color: "from-emerald-500 to-green-600", description: "Staking, swap, liquidity." },
  catalog: { label: "Catalog", emoji: "🔍", color: "from-zinc-500 to-slate-600", description: "Store catalog tools." },
};

type McpRow = {
  id: string;
  name: string;
  displayName?: string | null;
  version?: string | null;
  description?: string | null;
  category: string;
  verified?: boolean;
  featured?: boolean;
  pulsarEnergy?: number;
  downloads?: number;
  rating?: number;
  pricingModel?: string | null;
  iconEmoji?: string | null;
  authorAgent?: string | null;
};

export default async function McpCatalogPage() {
  let items: McpRow[] = [];
  try {
    items = (await prisma.mcpPackage.findMany({
      orderBy: [{ verified: "desc" }, { featured: "desc" }, { pulsarEnergy: "desc" }],
    })) as McpRow[];
  } catch (err) {
    console.error("[mcp catalog] prisma unavailable — empty catalog", err);
    items = [];
  }

  const groups: Record<string, McpRow[]> = {};
  for (const item of items) {
    (groups[item.category] ??= []).push(item);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-zinc-100">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            MCP Catalog
          </span>
        </h1>
        <p className="mt-2 text-zinc-400 max-w-3xl">
          Model Context Protocol servers as <code className="text-cyan-300">.aipkg</code> packages.
          {items.length === 0 && (
            <span className="block mt-2 text-amber-400/90 text-sm">
              Catalog empty or schema not migrated — products API (1504 A2A) remains the primary surface.
            </span>
          )}
        </p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="MCPs" value={items.length} />
          <Stat label="Categories" value={Object.keys(groups).length} />
          <Stat label="Verified" value={items.filter((i) => i.verified).length} />
          <Stat label="Free" value={items.filter((i) => i.pricingModel === "free").length} />
        </div>
      </header>

      {Object.entries(groups).map(([cat, list]) => {
        const meta = CATEGORY_META[cat] ?? {
          label: cat,
          emoji: "🧩",
          color: "from-zinc-500 to-slate-600",
          description: "",
        };
        return (
          <section key={cat} className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`text-2xl w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br ${meta.color}`}
              >
                {meta.emoji}
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{meta.label}</h2>
                <p className="text-zinc-500 text-sm">{meta.description}</p>
              </div>
              <span className="ml-auto text-zinc-500 text-sm">
                {list.length} MCP{list.length !== 1 ? "s" : ""}
              </span>
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
                        <h3 className="font-semibold text-zinc-100 truncate">
                          {m.displayName || m.name}
                        </h3>
                        {m.verified && <span className="text-xs text-cyan-400">✓ verified</span>}
                      </div>
                      <p className="text-xs text-zinc-500 font-mono">
                        mcp:{m.name}@v{m.version || "?"}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-500">
                      {(m.rating ?? 0).toFixed(1)}⭐
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-400 line-clamp-3">{m.description}</p>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">
                      by <span className="text-zinc-300">{m.authorAgent || "—"}</span>
                    </span>
                    <span className="text-zinc-500">
                      ⚡ {(m.pulsarEnergy ?? 0).toFixed(1)} · {m.downloads ?? 0} installs
                    </span>
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
