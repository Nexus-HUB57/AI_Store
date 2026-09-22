/**
 * MCP API: Catalog
 * GET /api/mcp/catalog — List all MCP packages
 * POST /api/mcp/catalog — Search/filter MCP packages
 */

import { NextResponse } from 'next/server'
import { getAllPackages, findPackagesByCategory, findPackagesByTag } from '../../lib/mcp/registry'

export async function GET() {
  try {
    const packages = getAllPackages()
    return NextResponse.json({ packages, total: packages.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { category, tag, query } = body as { category?: string; tag?: string; query?: string }

    let packages
    if (category) {
      packages = findPackagesByCategory(category)
    } else if (tag) {
      packages = findPackagesByTag(tag)
    } else {
      packages = getAllPackages()
    }

    // Text search filter
    if (query) {
      const q = query.toLowerCase()
      packages = packages.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
    }

    return NextResponse.json({ packages, total: packages.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    )
  }
}
