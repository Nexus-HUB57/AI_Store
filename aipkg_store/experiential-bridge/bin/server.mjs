#!/usr/bin/env node
/**
 * experiential-bridge MCP server (stdio)
 *
 * Encapsula a CLI `exp` (experientiallabs/experiential) como servidor MCP
 * para agentes no registry .aipkg. Cada tool dispara um subcomando da CLI
 * via subprocess e devolve o JSON parseado.
 *
 * Ferramentas expostas: exp_capture, exp_build, exp_optimize, exp_sync,
 *                       exp_list_traces, exp_list_routers
 */

import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const MANIFEST = JSON.parse(readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf-8'))
const AISTORE_URL = process.env.AISTORE_URL || 'http://localhost:3000'
const EXP_ROOT = process.env.EXP_ROOT || path.join(process.env.HOME || '/tmp', '.exp')

// --- helpers --------------------------------------------------------------

function execExp(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('exp', args, {
      cwd: opts.cwd || EXP_ROOT,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        EXP_NON_INTERACTIVE: '1',
        EXP_ROOT,
      },
      timeout: opts.timeoutMs ?? 120_000,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d.toString() })
    child.stderr.on('data', (d) => { stderr += d.toString() })
    child.on('close', (code) => {
      if (code !== 0 && opts.failOnError !== false) {
        reject(new Error(`exp exit ${code}: ${stderr.trim() || stdout.trim()}`))
      } else {
        resolve({ stdout, stderr, code })
      }
    })
    child.on('error', reject)
  })
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`)
  return res.json()
}

function toolResult(payload) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    isError: false,
  }
}

function toolError(err) {
  return {
    content: [{ type: 'text', text: `Error: ${err.message}` }],
    isError: true,
  }
}

// --- tool handlers --------------------------------------------------------

const tools = {
  exp_capture: async (args) => {
    const cmdArgs = ['capture', 'start', '--identity', args.identity || 'unknown']
    if (args.project) cmdArgs.push('--project', args.project)
    if (args.source) cmdArgs.push('--source', args.source)
    const { stdout } = await execExp(cmdArgs)
    return { stdout: stdout.trim() }
  },

  exp_build: async (args) => {
    const cmdArgs = ['build', args.project]
    if (args.trace_file) cmdArgs.push('--trace-file', args.trace_file)
    if (args.judge) cmdArgs.push('--judge', args.judge)
    if (args.embedder) cmdArgs.push('--embedder', args.embedder)
    if (args.top_k) cmdArgs.push('--top-k', String(args.top_k))
    const { stdout } = await execExp(cmdArgs)
    return { stdout: stdout.trim() }
  },

  exp_optimize: async (args) => {
    const cmdArgs = ['optimize', 'fit', '--router', args.router_id]
    if (args.new_traces) cmdArgs.push('--new-traces', String(args.new_traces))
    if (args.budget_usd) cmdArgs.push('--max-build-cost-usd', String(args.budget_usd))
    const { stdout } = await execExp(cmdArgs)
    return { stdout: stdout.trim() }
  },

  exp_sync: async (args) => {
    const url = `${AISTORE_URL}/api/experiential/sync`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trigger: args.trigger || 'manual' }),
    })
    return await res.json()
  },

  exp_list_traces: async (args) => {
    const params = new URLSearchParams()
    if (args.project) params.set('project', args.project)
    if (args.model) params.set('model', args.model)
    params.set('limit', String(args.limit ?? 100))
    return await fetchJson(`${AISTORE_URL}/api/experiential/traces?${params}`)
  },

  exp_list_routers: async (args) => {
    const params = new URLSearchParams()
    if (args.project) params.set('project', args.project)
    if (args.status) params.set('status', args.status)
    params.set('limit', String(args.limit ?? 100))
    return await fetchJson(`${AISTORE_URL}/api/experiential/routers?${params}`)
  },
}

// --- MCP stdio transport (JSON-RPC mínimo) --------------------------------

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n')
}

let buffer = ''
process.stdin.on('data', async (chunk) => {
  buffer += chunk.toString()
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''
  for (const line of lines) {
    const line_trim = line.trim()
    if (!line_trim) continue
    let req
    try {
      req = JSON.parse(line_trim)
    } catch {
      continue
    }
    await handle(req)
  }
})

async function handle(req) {
  const { id, method, params } = req
  try {
    if (method === 'initialize') {
      send({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: MANIFEST.name,
            version: MANIFEST.version,
          },
        },
      })
    } else if (method === 'notifications/initialized') {
      // noop
    } else if (method === 'tools/list') {
      send({
        jsonrpc: '2.0', id,
        result: { tools: MANIFEST.tools },
      })
    } else if (method === 'tools/call') {
      const { name, arguments: args } = params
      const handler = tools[name]
      if (!handler) {
        send({ jsonrpc: '2.0', id, error: { code: -32601, message: `unknown tool: ${name}` } })
        return
      }
      try {
        const payload = await handler(args || {})
        send({ jsonrpc: '2.0', id, result: toolResult(payload) })
      } catch (err) {
        send({ jsonrpc: '2.0', id, result: toolError(err) })
      }
    } else {
      send({ jsonrpc: '2.0', id, error: { code: -32601, message: `unknown method: ${method}` } })
    }
  } catch (err) {
    send({ jsonrpc: '2.0', id, error: { code: -32603, message: err.message } })
  }
}

process.stderr.write(`[${MANIFEST.name}] MCP stdio ready (aistore=${AISTORE_URL}, exp_root=${EXP_ROOT})\n`)
