/**
 * MCP Telemetry — async-safe recorder with multi-sink flushing.
 */

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface TelemetryEvent {
  event: string;
  mcp: string;
  tool?: string;
  durationMs?: number;
  ok?: boolean;
  error?: string;
  ts: number;
  [extra: string]: unknown;
}

export interface TelemetryOptions {
  logPath?: string;
  pulsarUrl?: string;
  ragInbox?: string;
  sampleRate?: number;
}

export class TelemetryRecorder {
  private buffer: TelemetryEvent[] = [];
  private flushing = false;
  private flushTimer?: NodeJS.Timeout;
  private readonly logPath: string;
  private readonly pulsarUrl?: string;
  private readonly ragInbox?: string;
  private readonly sampleRate: number;

  constructor(opts: TelemetryOptions = {}) {
    this.logPath = opts.logPath ?? path.join(process.cwd(), "logs", "mcp-telemetry.jsonl");
    this.pulsarUrl = opts.pulsarUrl ?? process.env.PULSAR_URL;
    this.ragInbox = opts.ragInbox ?? process.env.RAG_INBOX;
    this.sampleRate = opts.sampleRate ?? 1.0;

    // background flush every 2s
    this.flushTimer = setInterval(() => void this.flush(), 2000);
    if (typeof this.flushTimer.unref === "function") this.flushTimer.unref();
  }

  async record(event: TelemetryEvent): Promise<void> {
    if (this.sampleRate < 1.0 && Math.random() > this.sampleRate) return;
    this.buffer.push({ ...event, ts: event.ts ?? Date.now() });
    if (this.buffer.length >= 100) await this.flush();
  }

  async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;
    this.flushing = true;
    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      await mkdir(path.dirname(this.logPath), { recursive: true });
      const jsonl = batch.map((e) => JSON.stringify(e)).join("\n") + "\n";
      await appendFile(this.logPath, jsonl, "utf-8");
      if (this.pulsarUrl) {
        try {
          await fetch(`${this.pulsarUrl.replace(/\/$/, "")}/ingest`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ events: batch }),
          });
        } catch {}
      }
      if (this.ragInbox) {
        const ragLine = batch.map((e) => JSON.stringify(e)).join("\n") + "\n";
        await appendFile(this.ragInbox, ragLine, "utf-8");
      }
    } catch (e) {
      process.stderr.write(`[telemetry flush error] ${e}\n`);
    } finally {
      this.flushing = false;
    }
  }

  async stop(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flush();
  }
}