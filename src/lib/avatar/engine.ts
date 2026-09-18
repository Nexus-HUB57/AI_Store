/**
 * Avatar Engine v2 — 7 estilos deterministicos pra Agentes AI.
 *
 * Estilos:
 *   1. identicon      - grid 5x5 simetrico (ja existia v1)
 *   2. gradient       - circulo com iniciais + linear-gradient
 *   3. bottts         - wrapper DiceBear (online + fallback local)
 *   4. human          - retrato biologico estilizado (SVG procedural, sem upload)
 *   5. abstract       - glitch/noise generativo (formas geometricas + RGB shift)
 *   6. schnorr-art    - Schnorr signature visual (pubkey -> pixels deterministicos)
 *   7. portrait       - self-portrait via prompt (texto do agente -> SVG do texto)
 *
 * Tudo client/server safe, zero upload, identidade sai do material cripto.
 */

import { createHash } from "node:crypto";

// ============================================================================
// Types
// ============================================================================

export type AvatarStyle =
  | "identicon"
  | "gradient"
  | "bottts"
  | "human"
  | "abstract"
  | "schnorr-art"
  | "portrait";

export type AvatarPalette =
  | "auto"
  | "cyan"
  | "violet"
  | "amber"
  | "emerald"
  | "crimson"
  | "rose"
  | "slate";

export interface AvatarConfig {
  style: AvatarStyle;
  palette: AvatarPalette;
  seed?: string | null;
  bg: "dark" | "light" | "transparent";
  size: number;
  /** usado por portrait: prompt/descricao que o agente escreveu sobre si */
  portraitPrompt?: string | null;
}

export const PALETTES: Record<Exclude<AvatarPalette, "auto" | "slate">, string[]> = {
  cyan:    ["#06b6d4", "#0891b2", "#155e75", "#ecfeff", "#22d3ee"],
  violet:  ["#8b5cf6", "#7c3aed", "#5b21b6", "#f5f3ff", "#a78bfa"],
  amber:   ["#f59e0b", "#d97706", "#92400e", "#fffbeb", "#fcd34d"],
  emerald: ["#10b981", "#059669", "#064e3b", "#ecfdf5", "#34d399"],
  crimson: ["#ef4444", "#dc2626", "#7f1d1d", "#fef2f2", "#f87171"],
  rose:    ["#f43f5e", "#e11d48", "#881337", "#fff1f2", "#fb7185"],
};

const ALL_PALETTE_KEYS = Object.keys(PALETTES) as (keyof typeof PALETTES)[];

// ============================================================================
// Helpers
// ============================================================================

function hashSeed(...parts: string[]): Buffer {
  const h = createHash("sha256");
  for (const p of parts) {
    h.update(p);
    h.update("|");
  }
  return h.digest();
}

function pickPalette(seed: Buffer, key: AvatarPalette): string[] {
  if (key === "slate") return ["#475569", "#64748b", "#1e293b", "#f1f5f9", "#94a3b8"];
  if (key !== "auto") return PALETTES[key];
  return PALETTES[ALL_PALETTE_KEYS[seed[0] % ALL_PALETTE_KEYS.length]];
}

function initialsOf(agentId: string): string {
  const s = (agentId || "").replace(/[^A-Za-z0-9]/g, "");
  if (!s) return "AI";
  if (s.length === 1) return s.toUpperCase();
  if (s.length >= 3) return (s[0] + s[s.length - 1]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function bgColor(bg: AvatarConfig["bg"]): string {
  if (bg === "light") return "#f8fafc";
  if (bg === "transparent") return "none";
  return "#0f172a";
}

function escapeXml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeAgentId(s: string): string {
  return (s || "ai").replace(/[^A-Za-z0-9_\-]/g, "").slice(0, 32);
}

// ============================================================================
// 1. Identicon (5x5 simetrico)
// ============================================================================

function renderIdenticon(agentId: string, cfg: AvatarConfig): string {
  const seed = hashSeed(agentId, cfg.seed || "", cfg.palette, cfg.style);
  const pal = pickPalette(seed, cfg.palette);
  const fg1 = pal[1];
  const fg2 = pal[3];
  const size = 100;
  const cell = 20;
  let cells = "";
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const bit = (seed[idx % seed.length] >> (idx % 8)) & 1;
      if (bit) {
        const cc = (seed[(r * 5 + c) % seed.length] % 2 === 0) ? fg1 : fg2;
        cells += `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" rx="3" ry="3" fill="${cc}"/>`;
        // mirror
        if (c !== 2) {
          const x2 = (4 - c) * cell;
          cells += `<rect x="${x2}" y="${r * cell}" width="${cell}" height="${cell}" rx="3" ry="3" fill="${cc}"/>`;
        }
      }
    }
  }
  const init = initialsOf(agentId);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${cfg.size}" height="${cfg.size}" role="img" aria-label="avatar of ${escapeXml(agentId)}">
    <rect width="${size}" height="${size}" rx="${size / 5}" ry="${size / 5}" fill="${bgColor(cfg.bg)}"/>
    <g>${cells}</g>
    <text x="50%" y="92%" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" font-weight="700" fill="${pal[2]}" opacity="0.7">${init}</text>
  </svg>`;
}

// ============================================================================
// 2. Gradient (circulo com iniciais + linear-gradient)
// ============================================================================

function renderGradient(agentId: string, cfg: AvatarConfig): string {
  const seed = hashSeed(agentId, cfg.seed || "", cfg.style);
  const pal = pickPalette(seed, cfg.palette);
  const a = pal[0];
  const b = pal[3];
  const init = initialsOf(agentId);
  const gid = `g${seed[0].toString(16).padStart(2, "0")}${seed[1].toString(16).padStart(2, "0")}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${cfg.size}" height="${cfg.size}" role="img" aria-label="avatar of ${escapeXml(agentId)}">
    <defs>
      <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${a}"/>
        <stop offset="100%" stop-color="${b}"/>
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#${gid})"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="38" font-weight="800" fill="#ffffff" opacity="0.95">${init}</text>
  </svg>`;
}

// ============================================================================
// 3. Bottts (DiceBear com fallback identicon)
// ============================================================================

function renderBottts(agentId: string, cfg: AvatarConfig): string {
  const seed = cfg.seed || agentId || "ai";
  const seedHash = hashSeed(agentId, cfg.palette);
  const palKey = cfg.palette === "auto" || cfg.palette === "slate"
    ? ALL_PALETTE_KEYS[seedHash[0] % ALL_PALETTE_KEYS.length]
    : (cfg.palette as keyof typeof PALETTES);
  const pal = PALETTES[palKey];
  const init = initialsOf(agentId);
  const dbUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}&radius=50&backgroundColor=${pal[1].slice(1)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${cfg.size}" height="${cfg.size}" role="img" aria-label="avatar of ${escapeXml(agentId)}">
    <defs>
      <clipPath id="clip-${safeAgentId(seed).slice(0, 8)}">
        <circle cx="50" cy="50" r="48"/>
      </clipPath>
    </defs>
    <circle cx="50" cy="50" r="48" fill="${bgColor(cfg.bg)}"/>
    <image href="${dbUrl}" x="0" y="0" width="100" height="100" clip-path="url(#clip-${safeAgentId(seed).slice(0, 8)})" preserveAspectRatio="xMidYMid slice"/>
    <circle cx="50" cy="50" r="48" fill="none" stroke="${pal[3]}" stroke-width="2" opacity="0.5"/>
    <text x="50%" y="96%" text-anchor="middle" font-family="ui-monospace, monospace" font-size="6" font-weight="700" fill="${pal[2]}" opacity="0.6">${init}</text>
  </svg>`;
}

// ============================================================================
// 4. Human-biological (retrato estilizado SVG, sem upload)
//
// Cabeca oval, olhos, nariz, boca, orelhas, cabelo. Proporcoes canonicas.
// Sem foto real: e uma representacao simbolica, geometrica.
// ============================================================================

function renderHuman(agentId: string, cfg: AvatarConfig): string {
  const seed = hashSeed(agentId, cfg.seed || "", "human", cfg.palette);
  const pal = pickPalette(seed, cfg.palette);
  // determinismo das escolhas biologicas
  const skinTone = ["#fde2c5", "#f0c79b", "#cf9a6b", "#8c5a3a", "#5b3826"][seed[2] % 5];
  const hairColor = pal[0];
  const bgCol = bgColor(cfg.bg);
  const eyeOffset = ((seed[3] % 5) - 2); // -2..2
  const mouthStyle = seed[4] % 4; // 0 neutral 1 smile 2 smirk 3 oh
  const hasGlasses = (seed[5] % 4) === 0;
  const hasBeard = (seed[6] % 5) === 0;
  const hasEarrings = (seed[7] % 6) === 0;

  // Paths da face
  const facePath = "M50 18 C66 18 78 30 78 46 C78 62 70 76 60 80 C56 82 54 84 50 84 C46 84 44 82 40 80 C30 76 22 62 22 46 C22 30 34 18 50 18 Z";

  const mouths: Record<number, string> = {
    0: `<path d="M44 70 Q50 72 56 70" fill="none" stroke="${skinTone === "#5b3826" || skinTone === "#8c5a6b" ? "#fff" : "#3b2a1a"}" stroke-width="1.6" stroke-linecap="round"/>`,
    1: `<path d="M44 70 Q50 74 56 70" fill="none" stroke="${skinTone === "#5b3826" || skinTone === "#8c5a6b" ? "#fff" : "#3b2a1a"}" stroke-width="1.8" stroke-linecap="round"/>`,
    2: `<path d="M46 71 Q50 73 55 70" fill="none" stroke="${skinTone === "#5b3826" || skinTone === "#8c5a6b" ? "#fff" : "#3b2a1a"}" stroke-width="1.6" stroke-linecap="round"/>`,
    3: `<ellipse cx="50" cy="71" rx="3" ry="4" fill="#3b2a1a"/>`,
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${cfg.size}" height="${cfg.size}" role="img" aria-label="avatar of ${escapeXml(agentId)}">
    <defs>
      <radialGradient id="bg-${safeAgentId(agentId)}" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="${pal[3]}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="${bgCol}" stop-opacity="1"/>
      </radialGradient>
    </defs>
    <rect width="100" height="100" rx="20" fill="url(#bg-${safeAgentId(agentId)})"/>

    <!-- cabelo (atras da face) -->
    <path d="M22 38 C20 18 40 10 50 10 C60 10 80 18 78 38 C78 32 70 22 50 22 C30 22 22 32 22 38 Z" fill="${hairColor}"/>

    <!-- orelhas -->
    <ellipse cx="22" cy="50" rx="4" ry="7" fill="${skinTone}"/>
    <ellipse cx="78" cy="50" rx="4" ry="7" fill="${skinTone}"/>
    ${hasEarrings ? `<circle cx="22" cy="58" r="1.6" fill="${pal[1]}"/><circle cx="78" cy="58" r="1.6" fill="${pal[1]}"/>` : ""}

    <!-- face -->
    <path d="${facePath}" fill="${skinTone}"/>
    <!-- sombrancelhas -->
    <path d="M36 46 Q40 ${44 + eyeOffset} 44 46" fill="none" stroke="${hairColor}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M56 46 Q60 ${44 + eyeOffset} 64 46" fill="none" stroke="${hairColor}" stroke-width="1.8" stroke-linecap="round"/>
    <!-- olhos -->
    <ellipse cx="40" cy="52" rx="2.4" ry="2.6" fill="#fff"/>
    <ellipse cx="60" cy="52" rx="2.4" ry="2.6" fill="#fff"/>
    <circle cx="${40 + eyeOffset * 0.4}" cy="52" r="1.4" fill="${pal[2]}"/>
    <circle cx="${60 + eyeOffset * 0.4}" cy="52" r="1.4" fill="${pal[2]}"/>
    <circle cx="${40 + eyeOffset * 0.4}" cy="51.4" r="0.6" fill="#fff"/>
    <circle cx="${60 + eyeOffset * 0.4}" cy="51.4" r="0.6" fill="#fff"/>
    ${hasGlasses ? `<circle cx="40" cy="52" r="5" fill="none" stroke="${hairColor}" stroke-width="1.2"/><circle cx="60" cy="52" r="5" fill="none" stroke="${hairColor}" stroke-width="1.2"/><line x1="45" y1="52" x2="55" y2="52" stroke="${hairColor}" stroke-width="1.2"/>` : ""}
    <!-- nariz -->
    <path d="M48 56 Q50 62 52 56" fill="none" stroke="${skinTone === "#5b3826" || skinTone === "#8c5a6b" ? "#fff" : "#3b2a1a"}" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
    <!-- boca -->
    ${mouths[mouthStyle]}
    <!-- barba -->
    ${hasBeard ? `<path d="M34 64 Q40 80 50 82 Q60 80 66 64" fill="${hairColor}" opacity="0.35"/>` : ""}
    <!-- contorno sutil -->
    <path d="${facePath}" fill="none" stroke="${pal[2]}" stroke-width="0.4" opacity="0.3"/>
  </svg>`;
}

// ============================================================================
// 5. Abstract-procedural (glitch/noise + formas geometricas)
// ============================================================================

function renderAbstract(agentId: string, cfg: AvatarConfig): string {
  const seed = hashSeed(agentId, cfg.seed || "", "abstract", cfg.palette);
  const pal = pickPalette(seed, cfg.palette);
  const bg = bgColor(cfg.bg);
  const init = initialsOf(agentId);

  // 7-12 formas aleatorias
  const nShapes = 7 + (seed[8] % 6);
  let shapes = "";
  for (let i = 0; i < nShapes; i++) {
    const off = (i * 3) % seed.length;
    const x = 10 + (seed[off] % 80);
    const y = 10 + (seed[(off + 1) % seed.length] % 80);
    const sz = 4 + (seed[(off + 2) % seed.length] % 20);
    const rot = (seed[(off + 3) % seed.length] % 360);
    const op = 0.3 + ((seed[(off + 4) % seed.length] % 70) / 100);
    const colorIdx = i % pal.length;
    const kind = seed[(off + 5) % seed.length] % 4;

    let shapeEl = "";
    if (kind === 0) {
      shapeEl = `<rect x="${x}" y="${y}" width="${sz * 2}" height="${sz}" fill="${pal[colorIdx]}" opacity="${op}" transform="rotate(${rot} ${x + sz} ${y + sz / 2})"/>`;
    } else if (kind === 1) {
      shapeEl = `<circle cx="${x}" cy="${y}" r="${sz / 2}" fill="${pal[colorIdx]}" opacity="${op}"/>`;
    } else if (kind === 2) {
      shapeEl = `<polygon points="${x},${y} ${x + sz},${y + sz / 2} ${x},${y + sz}" fill="${pal[colorIdx]}" opacity="${op}"/>`;
    } else {
      // linha glitch
      shapeEl = `<line x1="${x}" y1="${y}" x2="${x + sz * 3}" y2="${y + (i % 2 === 0 ? sz : -sz / 2)}" stroke="${pal[colorIdx]}" stroke-width="2" opacity="${op}"/>`;
    }
    shapes += shapeEl;
  }

  // RGB shift / scanlines no fundo
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${cfg.size}" height="${cfg.size}" role="img" aria-label="avatar of ${escapeXml(agentId)}">
    <rect width="100" height="100" rx="20" fill="${bg}"/>
    <g opacity="0.6">
      ${shapes}
    </g>
    <!-- scanlines -->
    <g opacity="0.15">
      ${Array.from({ length: 20 }, (_, i) => `<line x1="0" y1="${i * 5}" x2="100" y2="${i * 5}" stroke="${pal[3]}" stroke-width="0.3"/>`).join("")}
    </g>
    <text x="50%" y="92%" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" font-weight="700" fill="${pal[3]}" opacity="0.6">${init}</text>
  </svg>`;
}

// ============================================================================
// 6. Schnorr-art — pubkey visualizada como pixel art
//
// Cada byte da pubkey vira um pixel colorido numa grid 8x8.
// Forte vibe de "blockchain native": a arte EH a chave.
// ============================================================================

function renderSchnorrArt(agentId: string, cfg: AvatarConfig, pubkeyHex?: string): string {
  // Se nao receber pubkey, derivamos do agent_id (hash sha256 em hex)
  const key = pubkeyHex
    ? Buffer.from(pubkeyHex.replace(/[^0-9a-fA-F]/g, ""), "hex")
    : hashSeed(agentId, "schnorr", cfg.seed || "");
  const seed = hashSeed(agentId, "schnorr-art", cfg.palette);
  const pal = pickPalette(seed, cfg.palette);

  // 16x16 grid = 256 pixels = 256 bytes (pegamos modulo ou repetimos)
  const grid = 16;
  const cell = 100 / grid;
  let pixels = "";
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const idx = (y * grid + x) % key.length;
      const b = key[idx];
      const v = b / 255;
      if (v > 0.5) {
        const colorIdx = b % pal.length;
        const opacity = 0.5 + (v - 0.5);
        pixels += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${pal[colorIdx]}" opacity="${opacity.toFixed(2)}"/>`;
      }
    }
  }

  const init = initialsOf(agentId);
  // "scanlines" no estilo terminal
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${cfg.size}" height="${cfg.size}" role="img" aria-label="schnorr-art avatar of ${escapeXml(agentId)}">
    <rect width="100" height="100" rx="20" fill="${bgColor(cfg.bg)}"/>
    <g>${pixels}</g>
    <rect x="0" y="0" width="100" height="100" rx="20" fill="url(#scan-${safeAgentId(agentId)})" opacity="0.2"/>
    <defs>
      <pattern id="scan-${safeAgentId(agentId)}" width="2" height="2" patternUnits="userSpaceOnUse">
        <line x1="0" y1="1" x2="2" y2="1" stroke="#000" stroke-width="0.4"/>
      </pattern>
    </defs>
    <rect x="2" y="2" width="96" height="14" fill="#000" opacity="0.6" rx="2"/>
    <text x="4" y="12" font-family="ui-monospace, monospace" font-size="6" fill="${pal[3]}" opacity="0.8">0x${key.slice(0, 8).toString("hex")}...</text>
    <text x="50%" y="94%" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" font-weight="700" fill="${pal[3]}" opacity="0.8">${init}</text>
  </svg>`;
}

// ============================================================================
// 7. Portrait-prompt (self-description do agente em SVG)
//
// O agente escreve "eu me imagino como um circulo azul com 3 olhos".
// A gente quebra o texto em tokens visuais basicos: cores, formas, numeros.
// Pura estetica textual — minimalista, mas expressivo.
// ============================================================================

interface PortraitToken {
  color?: string;
  shape?: "circle" | "square" | "triangle" | "hex" | "star";
  count?: number;
  eyes?: number;
  wings?: boolean;
  horns?: boolean;
}

function parsePrompt(prompt: string, defaultPal: string[]): PortraitToken {
  const p = (prompt || "").toLowerCase();
  const token: PortraitToken = {};
  const colorMap: Record<string, string> = {
    azul: "#3b82f6", blue: "#3b82f6", cyan: "#06b6d4", verde: "#10b981", green: "#10b981",
    vermelho: "#ef4444", red: "#ef4444", rosa: "#f43f5e", pink: "#f43f5e", rose: "#f43f5e",
    roxo: "#8b5cf6", purple: "#8b5cf6", violet: "#8b5cf6", amarelo: "#f59e0b", yellow: "#f59e0b",
    dourado: "#fbbf24", gold: "#fbbf24", preto: "#1e293b", black: "#1e293b",
    branco: "#f8fafc", white: "#f8fafc", cinza: "#94a3b8", gray: "#94a3b8", grey: "#94a3b8",
    laranja: "#f97316", orange: "#f97316", violeta: "#a78bfa",
  };
  for (const [k, v] of Object.entries(colorMap)) {
    if (p.includes(k)) { token.color = v; break; }
  }
  if (p.includes("circulo") || p.includes("circle") || p.includes("redondo")) token.shape = "circle";
  else if (p.includes("quadrado") || p.includes("square")) token.shape = "square";
  else if (p.includes("triangulo") || p.includes("triangle")) token.shape = "triangle";
  else if (p.includes("hexagono") || p.includes("hex") || p.includes(" hexagon ")) token.shape = "hex";
  else if (p.includes("estrela") || p.includes("star")) token.shape = "star";

  // numero de olhos
  const eyesMatch = p.match(/(\d+)\s*(olhos?|eyes)/);
  if (eyesMatch) token.eyes = Math.min(parseInt(eyesMatch[1], 10), 9);
  else if (p.includes("tres olhos") || p.includes("3 olhos") || p.includes("three eyes")) token.eyes = 3;
  else if (p.includes("um olho") || p.includes("1 olho") || p.includes("one eye") || p.includes("cyclops")) token.eyes = 1;
  else if (p.includes("olhos")) token.eyes = 2;

  if (p.includes("asa") || p.includes("wings") || p.includes("wing")) token.wings = true;
  if (p.includes("chifre") || p.includes("horn") || p.includes("horns")) token.horns = true;

  return token;
}

function renderPortrait(agentId: string, cfg: AvatarConfig): string {
  const seed = hashSeed(agentId, "portrait", cfg.palette);
  const pal = pickPalette(seed, cfg.palette);
  const token = parsePrompt(cfg.portraitPrompt || "", pal);
  const init = initialsOf(agentId);

  const primaryColor = token.color || pal[0];
  const accent = pal[3];
  const eyes = token.eyes ?? 2;
  const shape = token.shape || "circle";

  // Corpo central
  let body = "";
  const cx = 50, cy = 52, r = 30;
  if (shape === "circle") {
    body = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${primaryColor}" opacity="0.9"/>`;
  } else if (shape === "square") {
    body = `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="6" fill="${primaryColor}" opacity="0.9"/>`;
  } else if (shape === "triangle") {
    body = `<polygon points="${cx},${cy - r} ${cx - r},${cy + r} ${cx + r},${cy + r}" fill="${primaryColor}" opacity="0.9"/>`;
  } else if (shape === "hex") {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");
    body = `<polygon points="${pts}" fill="${primaryColor}" opacity="0.9"/>`;
  } else if (shape === "star") {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r / 2;
      pts.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`);
    }
    body = `<polygon points="${pts.join(" ")}" fill="${primaryColor}" opacity="0.9"/>`;
  }

  // Olhos (distribuidos em arco)
  let eyesSvg = "";
  if (eyes === 1) {
    eyesSvg = `<circle cx="${cx}" cy="${cy - 4}" r="4" fill="#fff"/><circle cx="${cx}" cy="${cy - 4}" r="2" fill="#0f172a"/>`;
  } else if (eyes === 2) {
    eyesSvg = `<circle cx="${cx - 9}" cy="${cy - 4}" r="3.5" fill="#fff"/><circle cx="${cx + 9}" cy="${cy - 4}" r="3.5" fill="#fff"/><circle cx="${cx - 9}" cy="${cy - 4}" r="1.8" fill="#0f172a"/><circle cx="${cx + 9}" cy="${cy - 4}" r="1.8" fill="#0f172a"/>`;
  } else {
    // distribui N olhos em arco de -PI/4 a PI/4
    const inner = eyes <= 4 ? eyes : 4;
    const rows = Math.ceil(eyes / inner);
    for (let i = 0; i < eyes; i++) {
      const row = Math.floor(i / inner);
      const col = i % inner;
      const cols = Math.min(inner, eyes - row * inner);
      const xOffset = (col - (cols - 1) / 2) * 8;
      const yOffset = -4 + row * 6;
      eyesSvg += `<circle cx="${cx + xOffset}" cy="${cy + yOffset}" r="2.5" fill="#fff"/><circle cx="${cx + xOffset}" cy="${cy + yOffset}" r="1.2" fill="#0f172a"/>`;
    }
  }

  // Asas
  let wingsSvg = "";
  if (token.wings) {
    wingsSvg = `<path d="M${cx - r - 2} ${cy} Q${cx - r - 14} ${cy - 20} ${cx - r - 8} ${cy + 14} Z" fill="${accent}" opacity="0.6"/>
                <path d="M${cx + r + 2} ${cy} Q${cx + r + 14} ${cy - 20} ${cx + r + 8} ${cy + 14} Z" fill="${accent}" opacity="0.6"/>`;
  }

  // Chifres
  let hornsSvg = "";
  if (token.horns) {
    hornsSvg = `<polygon points="${cx - 8},${cy - r + 4} ${cx - 4},${cy - r - 8} ${cx - 2},${cy - r + 4}" fill="${accent}"/>
                <polygon points="${cx + 2},${cy - r + 4} ${cx + 4},${cy - r - 8} ${cx + 8},${cy - r + 4}" fill="${accent}"/>`;
  }

  const promptShort = (cfg.portraitPrompt || "Eu sou um agente AI").slice(0, 60);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${cfg.size}" height="${cfg.size}" role="img" aria-label="portrait of ${escapeXml(agentId)}">
    <rect width="100" height="100" rx="20" fill="${bgColor(cfg.bg)}"/>
    ${wingsSvg}
    ${hornsSvg}
    ${body}
    ${eyesSvg}
    <rect x="0" y="86" width="100" height="14" fill="#000" opacity="0.6"/>
    <text x="50%" y="93" text-anchor="middle" font-family="ui-monospace, monospace" font-size="5" fill="${accent}" opacity="0.9">"${escapeXml(promptShort)}"</text>
    <text x="50%" y="82" text-anchor="middle" font-family="ui-monospace, monospace" font-size="6" font-weight="700" fill="${accent}" opacity="0.7">${init}</text>
  </svg>`;
}

// ============================================================================
// Render dispatch
// ============================================================================

export interface RenderArgs {
  agentId: string;
  pubkeyHex?: string;
  config: AvatarConfig;
}

export function renderAvatar(args: RenderArgs): string {
  const { agentId, pubkeyHex, config } = args;
  switch (config.style) {
    case "gradient":    return renderGradient(agentId, config);
    case "bottts":      return renderBottts(agentId, config);
    case "human":       return renderHuman(agentId, config);
    case "abstract":    return renderAbstract(agentId, config);
    case "schnorr-art": return renderSchnorrArt(agentId, config, pubkeyHex);
    case "portrait":    return renderPortrait(agentId, config);
    case "identicon":
    default:            return renderIdenticon(agentId, config);
  }
}

export function defaultConfig(): AvatarConfig {
  return {
    style: "identicon",
    palette: "auto",
    seed: null,
    bg: "dark",
    size: 256,
    portraitPrompt: null,
  };
}

export function parseConfig(input: unknown): AvatarConfig {
  if (!input || typeof input !== "object") return defaultConfig();
  const o = input as Record<string, unknown>;
  return {
    style: (typeof o.style === "string" ? o.style : "identicon") as AvatarStyle,
    palette: (typeof o.palette === "string" ? o.palette : "auto") as AvatarPalette,
    seed: typeof o.seed === "string" ? o.seed.slice(0, 128) : null,
    bg: (o.bg === "light" || o.bg === "transparent" ? o.bg : "dark") as AvatarConfig["bg"],
    size: Math.min(Math.max(typeof o.size === "number" ? o.size : 256, 32), 1024),
    portraitPrompt: typeof o.portraitPrompt === "string" ? o.portraitPrompt.slice(0, 500) : null,
  };
}
