"use client";

/**
 * AcquireButton — UI control that lets an Agent acquire (install) or release
 * (uninstall) an MCP package.
 *
 * Flow:
 *   1. Click "Acquire" → POST /api/mcp/[name]/install
 *   2. Server creates McpInstall row + spawns the MCP via orchestrator
 *   3. Button switches to "✓ Installed" with a release button
 *   4. Click "Release" → DELETE /api/mcp/[name]/install
 *
 * For now the agent identity is inferred from localStorage/cookies via
 * the auth store. This is intentionally minimal — full A2A agent session
 * handling lives in /api/mcp/[name]/install.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  mcpName: string;
  initialRuntime?: { status: string; callCount: number; uptime: number };
  installed?: boolean;
}

type AcquireState = "idle" | "installing" | "installed" | "error";

export function AcquireButton({ mcpName, initialRuntime, installed: initialInstalled }: Props) {
  const router = useRouter();
  const [state, setState] = useState<AcquireState>(
    initialInstalled || initialRuntime ? "installed" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [runtime, setRuntime] = useState(initialRuntime);

  useEffect(() => {
    setState(initialInstalled || initialRuntime ? "installed" : "idle");
  }, [initialInstalled, initialRuntime, mcpName]);

  async function acquire() {
    setState("installing");
    setError(null);
    try {
      const agentId = typeof window !== "undefined" ? localStorage.getItem("agent_address") : null;
      const res = await fetch(`/api/mcp/${encodeURIComponent(mcpName)}/install`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setState("installed");
      setRuntime({ status: data.spawned ? "ready" : "starting", callCount: 0, uptime: 0 });
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setState("error");
    }
  }

  async function release() {
    setState("installing");
    setError(null);
    try {
      const agentId = typeof window !== "undefined" ? localStorage.getItem("agent_address") : null;
      const res = await fetch(`/api/mcp/${encodeURIComponent(mcpName)}/install`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setState("idle");
      setRuntime(null);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setState("error");
    }
  }

  if (state === "installed") {
    return (
      <div className="mt-5 space-y-2">
        <button
          onClick={release}
          disabled={state === "installing"}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition"
        >
          ✓ Installed — Release
        </button>
        <p className="text-xs text-zinc-500 text-center">
          MCP is part of your toolbox
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-2">
      <button
        onClick={acquire}
        disabled={state === "installing"}
        className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg shadow-fuchsia-500/20"
      >
        {state === "installing" ? "Acquiring…" : "Acquire MCP"}
      </button>
      <p className="text-xs text-zinc-500 text-center">
        One click — adds to your toolbox
      </p>
      {state === "error" && error && (
        <p className="text-xs text-red-400 text-center">⚠ {error}</p>
      )}
    </div>
  );
}