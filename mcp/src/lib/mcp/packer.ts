/**
 * MCP Ecosystem — AIPKG Packer
 * Bundles an MCP server into a distributable .aipkg archive
 */

import type { AipkgConfig } from './types'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { join, resolve, basename } from 'path'

// ─── Manifest Generation ─────────────────────────────────────────
export function generateManifest(config: AipkgConfig, toolsJson: string): string {
  return JSON.stringify(
    {
      name: config.name,
      version: config.version,
      description: config.description,
      author: config.author,
      category: config.category,
      entrypoint: config.entrypoint,
      runtime: config.runtime,
      tools: JSON.parse(toolsJson),
      createdAt: new Date().toISOString(),
    },
    null,
    2
  )
}

// ─── File Collection ─────────────────────────────────────────────
function collectFiles(dir: string, base: string, exclude: Set<string>): string[] {
  const files: string[] = []
  if (!existsSync(dir)) return files

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = join(base, entry)

    if (exclude.has(entry) || exclude.has(rel)) continue

    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full, rel, exclude))
    } else {
      files.push(rel)
    }
  }
  return files
}

// ─── Pack ────────────────────────────────────────────────────────
export interface PackResult {
  success: boolean
  outputPath?: string
  fileCount?: number
  sizeBytes?: number
  error?: string
}

export function packAipkg(config: AipkgConfig, projectRoot: string): PackResult {
  try {
    const outDir = resolve(projectRoot, config.outDir ?? 'dist')
    mkdirSync(outDir, { recursive: true })

    const excludeSet = new Set([
      'node_modules',
      '.git',
      'dist',
      '__pycache__',
      ...(config.exclude ?? []),
    ])

    const includeDirs = config.include ?? ['src']
    const allFiles: string[] = []

    for (const dir of includeDirs) {
      const fullDir = resolve(projectRoot, dir)
      allFiles.push(...collectFiles(fullDir, dir, excludeSet))
    }

    // Generate manifest
    const toolsJson = existsSync(resolve(projectRoot, 'tools.json'))
      ? readFileSync(resolve(projectRoot, 'tools.json'), 'utf-8')
      : '[]'
    const manifest = generateManifest(config, toolsJson)

    // Write .aipkg (JSON bundle format)
    const bundle: Record<string, string> = {
      'manifest.json': manifest,
    }

    for (const rel of allFiles) {
      const content = readFileSync(resolve(projectRoot, rel), 'utf-8')
      bundle[rel] = content
    }

    const outputPath = join(outDir, `${config.name}-${config.version}.aipkg`)
    const jsonBundle = JSON.stringify(bundle, null, 2)
    writeFileSync(outputPath, jsonBundle, 'utf-8')

    return {
      success: true,
      outputPath,
      fileCount: allFiles.length + 1, // +1 for manifest
      sizeBytes: Buffer.byteLength(jsonBundle),
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
