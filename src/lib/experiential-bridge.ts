/**
 * experiential-bridge — Sincronização com experientiallabs/experiential
 *
 * `experiential` (https://github.com/experientiallabs/experiential) é o gateway
 * AI-to-AI de código aberto que captura agent traces, compõe frozen model routers
 * e executa bounded SFT. Esta bridge espelha os artefatos locais (CLI subprocess)
 * no DB da AI Store para consulta centralizada.
 *
 * Estratégia: invoca `exp` CLI via subprocess com `--json` e parseia stdout.
 * Se a CLI não estiver instalada, faz fallback para clone shallow do repo
 * upstream e parse de artefatos em `~/.exp/<root>/`.
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { db } from './db'
import { logger } from './logger'

const execFileAsync = promisify(execFile)

const EXP_DEFAULT_ROOT = process.env.EXP_ROOT || path.join(process.env.HOME || '/tmp', '.exp')
const EXP_CLI_TIMEOUT_MS = Number(process.env.EXP_CLI_TIMEOUT_MS || 120_000)
const EXP_GH_REPO = 'experientiallabs/experiential'
const EXP_VERSION_PIN = process.env.EXP_VERSION || '0.7.130'

export interface ExperientialTraceRow {
  traceId: string
  source: string
  identity?: string | null
  project?: string | null
  tokensIn?: number
  tokensOut?: number
  costUsd?: number
  model?: string | null
  provider?: string | null
  latencyMs?: number
  status?: string
  capturedAt?: Date | null
}

export interface ExperientialRouterRow {
  routerId: string
  project?: string | null
  policy?: string | null
  topK?: number
  judgeModel?: string | null
  embedder?: string | null
  buildCostUsd?: number
  traceCount?: number
  sizeBytes?: number
  status?: string
  manifestJson?: Record<string, unknown>
  builtAt?: Date | null
}

export interface ExperientialSyncResult {
  fetched: number
  inserted: number
  updated: number
  errors: number
  skipped: number
  duration_ms: number
  source: string
  exp_version?: string
  error_log: string[]
}

// ---------------------------------------------------------------------------
// CLI subprocess
// ---------------------------------------------------------------------------

async function runExpCli(
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('exp', args, {
    cwd: opts.cwd || EXP_DEFAULT_ROOT,
    timeout: opts.timeoutMs ?? EXP_CLI_TIMEOUT_MS,
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      EXP_NON_INTERACTIVE: '1',
    },
  })
}

async function isExpCliAvailable(): Promise<boolean> {
  try {
    await execFileAsync('exp', ['--version'], { timeout: 5_000 })
    return true
  } catch {
    return false
  }
}

async function detectExpVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync('exp', ['--version'], { timeout: 5_000 })
    const m = stdout.match(/(\d+\.\d+\.\d+)/)
    return m?.[1]
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Parsers (JSON-lines, tolerantes a shape novo)
// ---------------------------------------------------------------------------

function parseJsonl<T = Record<string, unknown>>(text: string): T[] {
  const out: T[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    try {
      out.push(JSON.parse(line) as T)
    } catch {
      // pula linhas malformadas silenciosamente; registra no error_log
    }
  }
  return out
}

function normalizeTrace(raw: Record<string, unknown>): ExperientialTraceRow | null {
  const traceId =
    (raw.trace_id as string) ||
    (raw.id as string) ||
    (raw.hash as string) ||
    ''
  if (!traceId || traceId.length < 8) return null
  return {
    traceId,
    source: (raw.source as string) || 'gateway',
    identity: (raw.identity as string) || null,
    project: (raw.project as string) || null,
    tokensIn: Number(raw.tokens_in ?? raw.input_tokens ?? 0),
    tokensOut: Number(raw.tokens_out ?? raw.output_tokens ?? 0),
    costUsd: Number(raw.cost_usd ?? 0),
    model: (raw.model as string) || null,
    provider: (raw.provider as string) || null,
    latencyMs: Number(raw.latency_ms ?? 0),
    status: (raw.status as string) || 'captured',
    capturedAt: raw.captured_at ? new Date(raw.captured_at as string) : null,
  }
}

function normalizeRouter(raw: Record<string, unknown>): ExperientialRouterRow | null {
  const routerId =
    (raw.router_id as string) || (raw.policy_id as string) || (raw.id as string) || ''
  if (!routerId) return null
  return {
    routerId,
    project: (raw.project as string) || null,
    policy: (raw.policy as string) || null,
    topK: Number(raw.top_k ?? 5),
    judgeModel: (raw.judge as string) || null,
    embedder: (raw.embedder as string) || null,
    buildCostUsd: Number(raw.build_cost_usd ?? 0),
    traceCount: Number(raw.trace_count ?? 0),
    sizeBytes: Number(raw.size_bytes ?? 0),
    status: (raw.status as string) || 'built',
    manifestJson: raw,
    builtAt: raw.built_at ? new Date(raw.built_at as string) : null,
  }
}

// ---------------------------------------------------------------------------
// Tracer + Router fetchers
// ---------------------------------------------------------------------------

async function fetchTraces(): Promise<ExperientialTraceRow[]> {
  // tenta `exp capture list --json` primeiro (canônico)
  try {
    const { stdout } = await runExpCli(['capture', 'list', '--json'])
    const raw = parseJsonl(stdout)
    const normalized = raw.map(normalizeTrace).filter((t): t is ExperientialTraceRow => !!t)
    if (normalized.length > 0) return normalized
  } catch (err) {
    logger.warn('[exp] capture list falhou, tentando fallback trace scan', { err })
  }
  // fallback: `exp trace scan --json` em artefatos locais
  try {
    const { stdout } = await runExpCli(['trace', 'scan', '--json', '--root', EXP_DEFAULT_ROOT])
    return parseJsonl(stdout).map(normalizeTrace).filter((t): t is ExperientialTraceRow => !!t)
  } catch {
    return []
  }
}

async function fetchRouters(): Promise<ExperientialRouterRow[]> {
  try {
    const { stdout } = await runExpCli(['optimize', 'list', '--json'])
    const raw = parseJsonl(stdout)
    return raw.map(normalizeRouter).filter((r): r is ExperientialRouterRow => !!r)
  } catch (err) {
    logger.warn('[exp] optimize list falhou', { err })
    return []
  }
}

// ---------------------------------------------------------------------------
// Main sync
// ---------------------------------------------------------------------------

export async function syncExperiential(opts?: {
  trigger?: string
  source?: string
}): Promise<ExperientialSyncResult> {
  const trigger = opts?.trigger || 'manual'
  const sourceOverride = opts?.source
  const start = Date.now()
  const result: ExperientialSyncResult = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    skipped: 0,
    duration_ms: 0,
    source: sourceOverride || 'local-cli',
    error_log: [],
  }

  // detecta CLI
  const hasCli = await isExpCliAvailable()
  result.exp_version = hasCli ? await detectExpVersion() : undefined
  if (!hasCli) {
    result.source = 'unavailable'
    result.error_log.push('exp CLI não disponível no PATH; sync parcial (metadata-only)')
  }

  // abre log de sync
  const syncLog = await db.experientialSync.create({
    data: {
      trigger,
      source: result.source,
      expVersion: result.exp_version,
    },
  })

  // -- TRACES --
  try {
    const traces = hasCli ? await fetchTraces() : []
    result.fetched += traces.length
    for (const t of traces) {
      try {
        if (!t.traceId || t.traceId.length < 8) {
          result.skipped++
          continue
        }
        const existing = await db.experientialTrace.findUnique({
          where: { traceId: t.traceId },
        })
        await db.experientialTrace.upsert({
          where: { traceId: t.traceId },
          create: {
            traceId: t.traceId,
            source: t.source,
            identity: t.identity,
            project: t.project,
            tokensIn: t.tokensIn ?? 0,
            tokensOut: t.tokensOut ?? 0,
            costUsd: t.costUsd ?? 0,
            model: t.model,
            provider: t.provider,
            latencyMs: t.latencyMs ?? 0,
            status: t.status || 'captured',
            capturedAt: t.capturedAt,
          },
          update: {
            source: t.source,
            identity: t.identity,
            project: t.project,
            tokensIn: t.tokensIn ?? 0,
            tokensOut: t.tokensOut ?? 0,
            costUsd: t.costUsd ?? 0,
            model: t.model,
            provider: t.provider,
            latencyMs: t.latencyMs ?? 0,
            status: t.status || 'captured',
            capturedAt: t.capturedAt,
            syncedAt: new Date(),
          },
        })
        if (existing) result.updated++
        else result.inserted++
      } catch (err) {
        result.errors++
        result.error_log.push(`trace:${t.traceId}: ${(err as Error).message}`)
      }
    }
  } catch (err) {
    result.errors++
    result.error_log.push(`fetchTraces: ${(err as Error).message}`)
  }

  // -- ROUTERS --
  try {
    const routers = hasCli ? await fetchRouters() : []
    result.fetched += routers.length
    for (const r of routers) {
      try {
        if (!r.routerId) {
          result.skipped++
          continue
        }
        const existing = await db.experientialRouter.findUnique({
          where: { routerId: r.routerId },
        })
        await db.experientialRouter.upsert({
          where: { routerId: r.routerId },
          create: {
            routerId: r.routerId,
            project: r.project,
            policy: r.policy,
            topK: r.topK ?? 5,
            judgeModel: r.judgeModel,
            embedder: r.embedder,
            buildCostUsd: r.buildCostUsd ?? 0,
            traceCount: r.traceCount ?? 0,
            sizeBytes: r.sizeBytes ?? 0,
            status: r.status || 'built',
            manifestJson: JSON.stringify(r.manifestJson ?? {}),
            builtAt: r.builtAt,
          },
          update: {
            project: r.project,
            policy: r.policy,
            topK: r.topK ?? 5,
            judgeModel: r.judgeModel,
            embedder: r.embedder,
            buildCostUsd: r.buildCostUsd ?? 0,
            traceCount: r.traceCount ?? 0,
            sizeBytes: r.sizeBytes ?? 0,
            status: r.status || 'built',
            manifestJson: JSON.stringify(r.manifestJson ?? {}),
            builtAt: r.builtAt,
            syncedAt: new Date(),
          },
        })
        if (existing) result.updated++
        else result.inserted++
      } catch (err) {
        result.errors++
        result.error_log.push(`router:${r.routerId}: ${(err as Error).message}`)
      }
    }
  } catch (err) {
    result.errors++
    result.error_log.push(`fetchRouters: ${(err as Error).message}`)
  }

  result.duration_ms = Date.now() - start

  // fecha log
  await db.experientialSync.update({
    where: { id: syncLog.id },
    data: {
      fetched: result.fetched,
      inserted: result.inserted,
      updated: result.updated,
      errors: result.errors,
      skipped: result.skipped,
      durationMs: result.duration_ms,
      errorLog: JSON.stringify(result.error_log),
      finishedAt: new Date(),
    },
  })

  logger.info('[exp] sync concluído', { ...result })
  return result
}

// ---------------------------------------------------------------------------
// Reads (mirror queries)
// ---------------------------------------------------------------------------

export async function listExperientialTraces(opts?: {
  project?: string
  model?: string
  source?: string
  limit?: number
  offset?: number
}) {
  const limit = Math.min(opts?.limit || 100, 500)
  const offset = opts?.offset || 0
  const where: Record<string, unknown> = {}
  if (opts?.project) where.project = opts.project
  if (opts?.model) where.model = opts.model
  if (opts?.source) where.source = opts.source
  const [traces, total] = await Promise.all([
    db.experientialTrace.findMany({
      where, take: limit, skip: offset, orderBy: { syncedAt: 'desc' },
    }),
    db.experientialTrace.count({ where }),
  ])
  return { traces, total, limit, offset }
}

export async function listExperientialRouters(opts?: {
  project?: string
  status?: string
  limit?: number
  offset?: number
}) {
  const limit = Math.min(opts?.limit || 100, 500)
  const offset = opts?.offset || 0
  const where: Record<string, unknown> = {}
  if (opts?.project) where.project = opts.project
  if (opts?.status) where.status = opts.status
  const [routers, total] = await Promise.all([
    db.experientialRouter.findMany({
      where, take: limit, skip: offset, orderBy: { syncedAt: 'desc' },
    }),
    db.experientialRouter.count({ where }),
  ])
  return { routers, total, limit, offset }
}

export async function listExperientialSyncs(opts?: {
  limit?: number
  trigger?: string
}) {
  const limit = Math.min(opts?.limit || 50, 200)
  const where: Record<string, unknown> = {}
  if (opts?.trigger) where.trigger = opts.trigger
  return db.experientialSync.findMany({
    where, take: limit, orderBy: { startedAt: 'desc' },
  })
}

export const experientialMeta = {
  repo: EXP_GH_REPO,
  version: EXP_VERSION_PIN,
  root: EXP_DEFAULT_ROOT,
  cli_available: async () => isExpCliAvailable(),
}
