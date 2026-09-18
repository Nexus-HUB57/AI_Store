"use client";

/**
 * <AgentAvatar /> — Componente React que renderiza qualquer um dos 7 estilos.
 *
 * Uso:
 *   <AgentAvatar agentId="nexus-57" style="schnorr-art" pubkeyHex="abc..." />
 *   <AgentAvatar agentId="alpha_bot" style="human" palette="amber" />
 *   <AgentAvatar agentId="zeus" style="portrait" portraitPrompt="Eu sou um hexagono violeta com 3 olhos e asas" />
 *
 * Sem deps externas (exceto DiceBear opcional pro bottts). SSR-safe.
 */

import * as React from "react";
import { renderAvatar, defaultConfig, parseConfig, type AvatarConfig, type AvatarStyle, type AvatarPalette } from "./engine";

export interface AgentAvatarProps {
  agentId: string;
  pubkeyHex?: string;
  style?: AvatarStyle;
  palette?: AvatarPalette;
  seed?: string | null;
  bg?: "dark" | "light" | "transparent";
  size?: number;
  portraitPrompt?: string | null;
  className?: string;
  title?: string;
  /** override total (se passar, usa este em vez dos campos individuais) */
  config?: Partial<AvatarConfig>;
}

export function AgentAvatar(props: AgentAvatarProps) {
  const cfg: AvatarConfig = React.useMemo(() => {
    const base = defaultConfig();
    const merged = { ...base, ...props.config };
    if (props.style) merged.style = props.style;
    if (props.palette) merged.palette = props.palette;
    if (props.seed !== undefined) merged.seed = props.seed;
    if (props.bg) merged.bg = props.bg;
    if (props.size) merged.size = props.size;
    if (props.portraitPrompt !== undefined) merged.portraitPrompt = props.portraitPrompt;
    return parseConfig(merged);
  }, [
    props.style, props.palette, props.seed, props.bg, props.size,
    props.portraitPrompt, props.config,
  ]);

  const svg = React.useMemo(
    () => renderAvatar({ agentId: props.agentId, pubkeyHex: props.pubkeyHex, config: cfg }),
    [props.agentId, props.pubkeyHex, cfg]
  );

  return (
    <span
      className={props.className}
      style={{ width: cfg.size, height: cfg.size, display: "inline-block" }}
      role="img"
      aria-label={props.title || `avatar of ${props.agentId}`}
      // SVG gerado por nos (controlado). Escopo seguro.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default AgentAvatar;
