/**
 * MCP Ecosystem — CLI Tool
 * Usage: tsx mcp/src/lib/mcp/cli.ts <command> [args]
 * Commands: list, tools, health, info <package>
 */

import { getAllPackages, getAllTools, getHealth } from './registry'

const command = process.argv[2]
const arg = process.argv[3]

function list(): void {
  const pkgs = getAllPackages()
  if (pkgs.length === 0) {
    console.log('No MCP packages registered.')
    return
  }
  console.log(`\n📦 MCP Packages (${pkgs.length}):\n`)
  for (const p of pkgs) {
    console.log(`  ${p.name}@${p.version} — ${p.description}`)
    console.log(`    Category: ${p.category} | Runtime: ${p.runtime} | Tools: ${p.tools.length}`)
  }
}

function tools(): void {
  const all = getAllTools()
  if (all.length === 0) {
    console.log('No MCP tools registered.')
    return
  }
  console.log(`\n🔧 MCP Tools (${all.length}):\n`)
  for (const t of all) {
    console.log(`  ${t.packageName}/${t.name} — ${t.description}`)
  }
}

function health(): void {
  const h = getHealth([])
  console.log(`\n💚 MCP Health:\n`)
  console.log(`  Status:          ${h.status}`)
  console.log(`  Uptime:          ${Math.round(h.uptime / 1000)}s`)
  console.log(`  Packages Loaded: ${h.packagesLoaded}`)
  console.log(`  Active Calls:    ${h.activeCalls}`)
  console.log(`  Timestamp:       ${h.timestamp}`)
}

function info(): void {
  if (!arg) {
    console.error('Usage: cli.ts info <package-name>')
    process.exit(1)
  }
  const pkgs = getAllPackages()
  const pkg = pkgs.find((p) => p.name === arg)
  if (!pkg) {
    console.error(`Package "${arg}" not found.`)
    process.exit(1)
  }
  console.log(`\n📦 ${pkg.name}@${pkg.version}\n`)
  console.log(`  Description:  ${pkg.description}`)
  console.log(`  Author:       ${pkg.author}`)
  console.log(`  Category:     ${pkg.category}`)
  console.log(`  Runtime:      ${pkg.runtime}`)
  console.log(`  Entrypoint:   ${pkg.entrypoint}`)
  console.log(`  Tags:         ${pkg.tags.join(', ') || '(none)'}`)
  console.log(`  Tools:`)
  for (const t of pkg.tools) {
    console.log(`    - ${t.name}: ${t.description}`)
  }
}

// ─── Dispatch ────────────────────────────────────────────────────
switch (command) {
  case 'list':
    list()
    break
  case 'tools':
    tools()
    break
  case 'health':
    health()
    break
  case 'info':
    info()
    break
  default:
    console.log('MCP CLI — Manage MCP packages and tools')
    console.log('')
    console.log('Commands:')
    console.log('  list          List all registered packages')
    console.log('  tools         List all registered tools')
    console.log('  health        Show runtime health status')
    console.log('  info <pkg>    Show package details')
}
