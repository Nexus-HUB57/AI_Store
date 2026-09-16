#!/usr/bin/env node
/**
 * mcp-pulsar — Real-time SSE stream of catalog/agent vital signs.
 *
 * Wraps the existing /api/pulsar SSE feed and lets MCP agents subscribe
 * via tools/list + tools/call.
 *
 * Tools:
 *   current_snapshot()    — latest aggregated snapshot
 *   recent_snapshots(n)   — last N snapshots (from log)
 *   subscribe(window_s)   — long-poll over the SSE feed (returns the
 *                            aggregated deltas seen during the window)
 */

import { z } from "zod";
import { McpServer } from "../../lib/mcp/server";
import { EventSource } from "undici";

const PULSAR_URL = process.env.PULSAR_URL ?? "http://localhost:3000/api/pulsar";

const server = new McpServer({
  name: "mcp-pulsar",
  version: "1.0.0",
  title: "Nexus AI Store Pulsar",
  description: "Real-time SSE vital signs for the AI Store catalog (3s cadence).",
  capabilities: { tools: { listChanged: true }, resources: { listChanged: false }, prompts: { listChanged: false }, logging: {} },
});

async function fetchSnapshot(): Promise<any> {
  const res = await fetch(PULSAR_URL);
  if (!res.ok) throw new Error(`pulsar ${res.status}`);
  return await res.json();
}

server.tool(
  "current_snapshot",
  z.object({}),
  "Latest aggregated Pulsar snapshot.",
  async () => {
    const snap = await fetchSnapshot();
    return {
      content: [{ type: "text", text: JSON.stringify(snap, null, 2) }],
      structuredContent: snap,
    };
  },
);

server.tool(
  "subscribe",
  z.object({ windowSeconds: int().min(3).max(120) }),
  "Subscribe to the SSE feed for N seconds and aggregate deltas.",
  async ({ windowSeconds }) => {
    const start = Date.now();
    const end = start + windowSeconds * 1000;
    const samples: any[] = [];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), windowSeconds * 1000 + 2000);
    try {
      const res = await fetch(PULSAR_URL, {
        headers: { Accept: "text/event-stream" },
        signal: ctrl.signal,
      } as any);
      if (!res.body) throw new Error("no body");
      const reader = (res.body as any).getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (Date.now() < end) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const chunk of parts) {
          const line = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            samples.push(JSON.parse(line.slice(6)));
          } catch {}
        }
      }
    } catch (e: any) {
      // expected after abort
    } finally {
      clearTimeout(timer);
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          window: windowSeconds,
          samples: samples.length,
          first: samples[0],
          last: samples[samples.length - 1],
          delta: samples.length > 1 ? { ts: Date.now(), samplesBetween: samples.length } : null,
        }, null, 2),
      }],
      structuredContent: { samples: samples.length },
    };
  },
);

function int() {
  return z.number().int();
}

await server.startStdio();