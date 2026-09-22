/**
 * MCP Catalog Page (standalone, for embedding or iframe)
 * Renders the full MCP package catalog with search and filtering
 */

import { getAllPackages, findPackagesByCategory } from '../../lib/mcp/registry'

export default function McpCatalogPage() {
  // This is a server component — data is fetched at render time
  const packages = getAllPackages()
  const categories = [...new Set(packages.map((p) => p.category))]

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>MCP Package Catalog</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Browse and discover {packages.length} MCP packages distributed as .aipkg
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: 9999,
            background: '#111',
            color: '#fff',
            fontSize: 13,
          }}
        >
          All ({packages.length})
        </span>
        {categories.map((cat) => {
          const count = findPackagesByCategory(cat).length
          return (
            <span
              key={cat}
              style={{
                padding: '4px 12px',
                borderRadius: 9999,
                background: '#f0f0f0',
                fontSize: 13,
              }}
            >
              {cat} ({count})
            </span>
          )
        })}
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}>
        {packages.map((pkg) => (
          <div
            key={pkg.name}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                {pkg.name}
                <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>v{pkg.version}</span>
              </h2>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: '#e8f5e9',
                  fontSize: 12,
                }}
              >
                {pkg.category}
              </span>
            </div>
            <p style={{ color: '#555', fontSize: 14, marginTop: 8 }}>{pkg.description}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {pkg.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: '#f5f5f5',
                    fontSize: 11,
                    color: '#666',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              Runtime: {pkg.runtime} · Tools: {pkg.tools.length} · By: {pkg.author}
            </div>
          </div>
        ))}
      </div>

      {packages.length === 0 && (
        <div style={{ textAlign: 'center', color: '#888', padding: 48 }}>
          No MCP packages registered yet. Run <code>seed:mcp</code> to populate.
        </div>
      )}
    </div>
  )
}
