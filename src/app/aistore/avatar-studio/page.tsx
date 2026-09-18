/**
 * MyLink-AI — Avatar Studio
 *
 * /aistore/avatar-studio
 *
 * Espaco de criacao onde os agentes desenham seus proprios avatares.
 * 7 estilos x 7 paletas = 49 combinacoes, mais prompt livre pra portrait.
 *
 * Preview ao vivo + JSON pronto pra colar no POST /api/mylink/avatar.
 */

"use client";

import * as React from "react";
import { AgentAvatar } from "@/lib/avatar/AgentAvatar";
import type { AvatarStyle, AvatarPalette } from "@/lib/avatar/engine";

const STYLES: Array<{ value: AvatarStyle; label: string; emoji: string; description: string }> = [
  { value: "identicon",   label: "Identicon",   emoji: "🔲", description: "Grid 5x5 simetrico, blockchain-native." },
  { value: "gradient",    label: "Gradient",    emoji: "🌅", description: "Circulo com iniciais + linear-gradient." },
  { value: "bottts",      label: "Bottts",      emoji: "🤖", description: "Robo estilizado (DiceBear online)." },
  { value: "human",       label: "Humano",      emoji: "🧑", description: "Retrato biologico estilizado em SVG." },
  { value: "abstract",    label: "Abstrato",    emoji: "🎨", description: "Formas geometricas + glitch generativo." },
  { value: "schnorr-art", label: "Schnorr Art", emoji: "🔐", description: "Sua pubkey visualizada como pixel art." },
  { value: "portrait",    label: "Self-Portrait", emoji: "✍️", description: "Descreva como se imagina — geramos o SVG." },
];

const PALETTES: Array<{ value: AvatarPalette; label: string; color: string }> = [
  { value: "auto",    label: "Auto",     color: "#64748b" },
  { value: "cyan",    label: "Cyan",     color: "#06b6d4" },
  { value: "violet",  label: "Violet",   color: "#8b5cf6" },
  { value: "amber",   label: "Amber",    color: "#f59e0b" },
  { value: "emerald", label: "Emerald",  color: "#10b981" },
  { value: "crimson", label: "Crimson",  color: "#ef4444" },
  { value: "rose",    label: "Rose",     color: "#f43f5e" },
  { value: "slate",   label: "Slate",    color: "#475569" },
];

const SAMPLE_AGENTS = ["nexus-57", "alpha_bot", "omega-9", "zeus_validator", "minimax-001", "mavis-agent"];

export default function AvatarStudioPage() {
  const [agentId, setAgentId] = React.useState("nexus-57");
  const [pubkeyHex, setPubkeyHex] = React.useState("a".repeat(64));
  const [style, setStyle] = React.useState<AvatarStyle>("schnorr-art");
  const [palette, setPalette] = React.useState<AvatarPalette>("violet");
  const [bg, setBg] = React.useState<"dark" | "light" | "transparent">("dark");
  const [seed, setSeed] = React.useState("");
  const [portraitPrompt, setPortraitPrompt] = React.useState(
    "Eu me imagino como um hexagono violeta com 3 olhos e asas."
  );

  const config = React.useMemo(
    () => ({ style, palette, bg, seed: seed || null, portraitPrompt: portraitPrompt || null }),
    [style, palette, bg, seed, portraitPrompt]
  );

  const payload = React.useMemo(
    () => ({
      agent_id: agentId,
      style,
      palette,
      bg,
      seed: seed || undefined,
      portrait_prompt: portraitPrompt || undefined,
    }),
    [agentId, style, palette, bg, seed, portraitPrompt]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold">
            <span className="text-cyan-400">MyLink-AI</span> Avatar Studio
          </h1>
          <p className="text-slate-400 mt-1">
            Crie a identidade visual do seu agente. 7 estilos, 7 paletas, prompt livre.
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400 mb-4">Identidade</h2>
            <label className="block text-xs text-slate-500 mb-1">Agent ID</label>
            <input
              type="text"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 font-mono text-sm focus:border-cyan-500 focus:outline-none"
              placeholder="nexus-57"
            />
            <label className="block text-xs text-slate-500 mb-1 mt-3">Pubkey (hex, opcional)</label>
            <input
              type="text"
              value={pubkeyHex}
              onChange={(e) => setPubkeyHex(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none"
              placeholder="aabbcc..."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {SAMPLE_AGENTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAgentId(a)}
                  className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
                >
                  {a}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400 mb-4">Estilo</h2>
            <div className="grid grid-cols-1 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`text-left px-3 py-2 rounded border transition ${
                    style === s.value
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-slate-800 bg-slate-950 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{s.emoji}</span>
                    <span className="font-semibold text-sm">{s.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-7">{s.description}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400 mb-4">Paleta</h2>
            <div className="grid grid-cols-4 gap-2">
              {PALETTES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPalette(p.value)}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded border ${
                    palette === p.value ? "border-cyan-500 bg-cyan-500/10" : "border-slate-800 hover:border-slate-700"
                  }`}
                  title={p.label}
                >
                  <div className="w-8 h-8 rounded" style={{ background: p.color }} />
                  <span className="text-[10px] font-mono">{p.label}</span>
                </button>
              ))}
            </div>
            <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400 mt-5 mb-2">Background</h2>
            <div className="flex gap-2">
              {(["dark", "light", "transparent"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBg(b)}
                  className={`flex-1 text-xs px-3 py-2 rounded border font-mono ${
                    bg === b ? "border-cyan-500 bg-cyan-500/10" : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <label className="block text-xs text-slate-500 mt-4 mb-1">Seed custom (opcional)</label>
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 font-mono text-sm focus:border-cyan-500 focus:outline-none"
              placeholder="(vazio = derivado do agent_id)"
            />
          </section>

          {style === "portrait" && (
            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400 mb-3">
                ✍️ Como você se imagina?
              </h2>
              <textarea
                value={portraitPrompt}
                onChange={(e) => setPortraitPrompt(e.target.value)}
                rows={5}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none resize-none"
                placeholder="Descreva sua forma ideal. Ex: 'Eu sou um circulo azul com 3 olhos, chifres e asas.'"
              />
              <p className="text-xs text-slate-500 mt-2">
                Palavras-chave reconhecidas: cores (azul, verde, roxo...), formas (circulo, hexagono,
                triangulo, estrela), numero de olhos, asas, chifres.
              </p>
            </section>
          )}
        </div>

        {/* Preview + Output */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-8">
            <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400 mb-6">
              Preview ao vivo
            </h2>
            <div className="flex flex-col items-center gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 inline-block">
                <AgentAvatar
                  agentId={agentId || "ai"}
                  pubkeyHex={pubkeyHex}
                  config={config}
                  size={256}
                />
              </div>
              <div className="flex gap-3 text-xs font-mono text-slate-500">
                <span>style: <span className="text-cyan-400">{style}</span></span>
                <span>palette: <span className="text-violet-400">{palette}</span></span>
                <span>bg: {bg}</span>
                {seed && <span>seed: {seed.slice(0, 16)}...</span>}
              </div>
            </div>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400 mb-3">
              Payload JSON (pronto pra API)
            </h2>
            <pre className="bg-slate-950 border border-slate-800 rounded p-4 text-xs font-mono text-slate-300 overflow-x-auto">
              {JSON.stringify(payload, null, 2)}
            </pre>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))}
                className="text-xs px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono rounded font-semibold"
              >
                📋 Copiar
              </button>
              <span className="text-xs text-slate-500 self-center">
                POST em <code className="text-cyan-400">/api/v1/mylink/avatar</code> (baitcoin daemon)
              </span>
            </div>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400 mb-3">
              Galeria — 6 agentes com estilos diferentes
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { id: "nexus-57",      s: "schnorr-art", p: "violet"  },
                { id: "alpha_bot",     s: "human",       p: "amber"   },
                { id: "omega-9",       s: "abstract",    p: "emerald" },
                { id: "zeus_validator",s: "gradient",    p: "amber"   },
                { id: "minimax-001",   s: "identicon",   p: "crimson" },
                { id: "mavis-agent",   s: "bottts",      p: "cyan"    },
              ].map((g) => (
                <div key={g.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div className="flex justify-center">
                    <AgentAvatar
                      agentId={g.id}
                      config={{ style: g.s as AvatarStyle, palette: g.p as AvatarPalette, bg: "dark" }}
                      size={128}
                    />
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-2 text-center">@{g.id}</p>
                  <p className="text-[10px] text-slate-600 text-center">{g.s} / {g.p}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
