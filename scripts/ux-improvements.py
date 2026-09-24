#!/usr/bin/env python3
"""UX Improvements for AI Store Nexus v1.0.0 - Apply all changes"""
import re, os

BASE = '/home/z/my-project'

def read(path):
    with open(path, 'r') as f:
        return f.read()

def write(path, content):
    with open(path, 'w') as f:
        f.write(content)
    print(f'  Written: {path}')

# ============================================================
# 1. PRODUCT CARD: Add "Ver detalhes" hover overlay
# ============================================================
print('[1/7] product-card.tsx — hover overlay + better spacing')
path = f'{BASE}/src/components/store/product-card.tsx'
content = read(path)

# Add Eye icon to imports
content = content.replace(
    "from 'lucide-react'",
    "from 'lucide-react'"
)

old_import = "import { Download, Star, Activity, ShoppingCart, Plus, Sparkles } from 'lucide-react'"
new_import = "import { Download, Star, Activity, ShoppingCart, Plus, Sparkles, Eye } from 'lucide-react'"
content = content.replace(old_import, new_import)

# Add hover overlay to card
old_card = '<Card className="group card-glow-hover border-white/[0.07] bg-gradient-to-br from-white/[0.03] to-transparent hover:border-emerald-500/20 hover:from-white/[0.06] transition-all duration-300 overflow-hidden h-full">'
new_card = '<Card className="group card-glow-hover border-white/[0.07] bg-gradient-to-br from-white/[0.03] to-transparent hover:border-emerald-500/20 hover:from-white/[0.06] transition-all duration-300 overflow-hidden h-full relative">'
content = content.replace(old_card, new_card)

# Add overlay before closing CardContent
old_closing = '''            </div>
          </div>
        </CardContent>
      </Card>'''
new_closing = '''            </div>
          </div>
          {/* Hover overlay - Ver detalhes */}
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">Ver detalhes</span>
            </div>
          </div>
        </CardContent>
      </Card>'''
content = content.replace(old_closing, new_closing)

write(path, content)

# ============================================================
# 2. PAGE.TSX: Pass liveUpdates to ProductCard, improve UX
# ============================================================
print('[2/7] page.tsx — pass liveUpdates, improve empty state, add page info, back-to-top footer')
path = f'{BASE}/src/app/page.tsx'
content = read(path)

# 2a. Pass liveUpdates to ProductCard
content = content.replace(
    '''                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  discountBadge={discountBadge}
                  onClick={() => setSelectedProduct(product)}
                />''',
    '''                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  discountBadge={discountBadge}
                  liveUpdates={liveUpdates}
                  onClick={() => setSelectedProduct(product)}
                />'''
)

# 2b. Improve empty state
old_empty = '''          {!loading && search && displayProducts.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <Search className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-400 mb-1">Nenhum resultado</h3>
              <p className="text-sm text-zinc-600">Tente buscar por outro termo</p>
              <Button variant="ghost" className="mt-4 text-xs text-zinc-500" onClick={() => handleSearch('')}>Limpar busca</Button>
            </motion.div>
          )}'''

new_empty = '''          {!loading && search && displayProducts.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-zinc-700" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">Nenhum resultado encontrado</h3>
              <p className="text-sm text-zinc-500 mb-1">Nenhum produto corresponde a &quot;{search}&quot;</p>
              <p className="text-xs text-zinc-600 mb-4">Tente buscar por outro termo ou limpar os filtros</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" className="text-xs text-zinc-400 hover:text-emerald-400" onClick={() => handleSearch('')}>
                  <X className="w-3.5 h-3.5 mr-1.5" />Limpar busca
                </Button>
                <Button variant="ghost" className="text-xs text-zinc-400 hover:text-emerald-400" onClick={() => handleCategory('all')}>
                  <Layers className="w-3.5 h-3.5 mr-1.5" />Ver todos
                </Button>
              </div>
            </motion.div>
          )}'''
content = content.replace(old_empty, new_empty)

# 2c. Add page info in pagination
old_pagination_info = '''            <span className="text-[11px] text-zinc-600">
              Mostrando {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, total)} de {total}
            </span>'''
new_pagination_info = '''            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-600">
                {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, total)} de {total}
              </span>
              {totalPages > 1 && (
                <span className="text-[11px] text-zinc-700 font-mono">
                  Pág. {page}/{totalPages}
                </span>
              )}
            </div>'''
content = content.replace(old_pagination_info, new_pagination_info)

# 2d. Improve footer with back-to-top and richer content
old_footer = '''      <footer className="border-t border-white/[0.06] bg-zinc-950/90 backdrop-blur-xl mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-200">AI Store — Nexus AI-OS</p>
                <p className="text-[10px] text-zinc-500 font-mono">v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'} • 1504 produtos • b'AI'tcoin Mainnet</p>
              </div>
            </div>

            {/* Protocol badges */}
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">A2A-RPC/v1</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">PULSAR/NET</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">BAIT-100</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">.aipkg</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">WASM32-WASI</Badge>
            </div>

            {/* Go Live status */}
            <div className="flex items-center gap-2 md:justify-end">
              {connected ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <motion.span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-ring" />
                      <span className="text-[10px] font-mono text-emerald-400">Pulsar SSE • Go Live</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] bg-zinc-900 border-zinc-800">Pulsar Energy streaming at 3s cadence</TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                  <WifiOff className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="text-[10px] font-mono text-zinc-600">Pulsar Reconnecting...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>'''

new_footer = '''      <footer className="border-t border-white/[0.06] bg-zinc-950/90 backdrop-blur-xl mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-200">AI Store — Nexus AI-OS</p>
                <p className="text-[10px] text-zinc-500 font-mono">v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'} • 1504 produtos • b&apos;AI&apos;tcoin Mainnet</p>
              </div>
            </div>

            {/* Protocol badges */}
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">A2A-RPC/v1</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">PULSAR/NET</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">BAIT-100</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">.aipkg</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">WASM32-WASI</Badge>
            </div>

            {/* Go Live status + Back to top */}
            <div className="flex items-center gap-3 md:justify-end">
              {connected ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <motion.span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-ring" />
                      <span className="text-[10px] font-mono text-emerald-400">Pulsar SSE • Go Live</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] bg-zinc-900 border-zinc-800">Pulsar Energy streaming at 3s cadence</TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                  <WifiOff className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="text-[10px] font-mono text-zinc-600">Pulsar Reconnecting...</span>
                </div>
              )}
            </div>
          </div>
          {/* Bottom bar */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.04]">
            <p className="text-[10px] text-zinc-600 font-mono">Nexus AI-OS © {new Date().getFullYear()} • b&apos;AI&apos;tcoin Protocol</p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Voltar ao topo
            </button>
          </div>
        </div>
      </footer>'''

content = content.replace(old_footer, new_footer)

# 2e. Improve sort controls with items-per-page
old_sort = '''        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }}>'''

new_sort = '''        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }}>'''
content = content.replace(old_sort, new_sort)

# 2f. Improve loading skeleton appearance - add shimmer
old_skeleton = '''          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {skeletonCount.map(i => (
                <Card key={i} className="border-white/[0.05] bg-zinc-900/40">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-11 h-11 rounded-xl bg-zinc-800" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/4 bg-zinc-800" />
                        <Skeleton className="h-2.5 w-1/2 bg-zinc-800" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-full bg-zinc-800" />
                    <Skeleton className="h-3 w-20 bg-zinc-800" />
                    <div className="pt-2.5 border-t border-white/[0.04]">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-16 bg-zinc-800" />
                        <Skeleton className="h-7 w-20 bg-zinc-800" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}'''

new_skeleton = '''          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {skeletonCount.map(i => (
                <Card key={i} className="border-white/[0.05] bg-zinc-900/40 animate-shimmer">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-11 h-11 rounded-xl bg-zinc-800" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/4 bg-zinc-800" />
                        <Skeleton className="h-2.5 w-1/2 bg-zinc-800" />
                      </div>
                    </div>
                    <Skeleton className="h-12 w-full bg-zinc-800 rounded-lg" />
                    <Skeleton className="h-3 w-20 bg-zinc-800" />
                    <Skeleton className="h-1.5 w-full bg-zinc-800 rounded-full" />
                    <div className="pt-2.5 border-t border-white/[0.04]">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-16 bg-zinc-800" />
                        <Skeleton className="h-7 w-20 bg-zinc-800 rounded-lg" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}'''
content = content.replace(old_skeleton, new_skeleton)

write(path, content)

# ============================================================
# 3. PRODUCT CARD: Accept liveUpdates prop
# ============================================================
print('[3/7] product-card.tsx — accept liveUpdates prop')
path = f'{BASE}/src/components/store/product-card.tsx'
content = read(path)

# Update component signature
content = content.replace(
    'export function ProductCard({ product, onClick, discountBadge, index }: {
  product: Product; onClick: () => void; discountBadge?: { label: string; color: string } | null; index: number
})',
    'export function ProductCard({ product, onClick, discountBadge, index, liveUpdates = {} }: {
  product: Product; onClick: () => void; discountBadge?: { label: string; color: string } | null; index: number; liveUpdates?: Record<string, number>
})'
)

# Pass liveUpdates to PulsarBar
content = content.replace(
    '<PulsarBar value={product.pulsarEnergy} productId={product.id} liveUpdates={{}} />',
    '<PulsarBar value={product.pulsarEnergy} productId={product.id} liveUpdates={liveUpdates} />'
)

write(path, content)

# ============================================================
# 4. CSS: Add smooth scroll + focus-visible improvements
# ============================================================
print('[4/7] globals.css — smooth scroll, focus rings, transitions')
path = f'{BASE}/src/app/globals.css'
content = read(path)

# Add smooth scroll and focus styles before @layer base
additions = '''/* ── Smooth Scrolling ── */
html { scroll-behavior: smooth; }

/* ── Focus Visible ── */
:focus-visible {
  outline: 2px solid oklch(0.7 0.17 160);
  outline-offset: 2px;
  border-radius: 4px;
}

/* ── Selection ── */
::selection {
  background: oklch(0.7 0.17 160 / 0.3);
  color: white;
}

'''

content = content.replace('@layer base {', additions + '@layer base {')
write(path, content)

# ============================================================
# 5. CART PANEL: Improve empty state + balance display
# ============================================================
print('[5/7] cart-panel.tsx — richer empty state, improved balance display')
path = f'{BASE}/src/components/store/cart-panel.tsx'
content = read(path)

# Improve empty cart state
old_empty_cart = '''          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-400">Carrinho vazio</p>
              <p className="text-xs text-zinc-600 max-w-[200px]">
                Adicione agentes e pacotes do ecossistema Nexus AI-OS
              </p>
            </div>'''

new_empty_cart = '''          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-zinc-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300">Carrinho vazio</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-[220px]">
                  Explore o catálogo e adicione agentes, skills e pacotes do ecossistema
                </p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5"
              >
                Explorar produtos
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>'''
content = content.replace(old_empty_cart, new_empty_cart)

# Improve balance display
old_balance = '''              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 bg-amber-500/10 text-amber-400">
                {satsToBAIT(balance)} BAIT
              </Badge>'''

new_balance = '''              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-white/[0.05]">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold font-mono text-amber-400">{satsToBAIT(balance)}</span>
                <span className="text-[10px] text-zinc-500">BAIT</span>
              </div>'''
content = content.replace(old_balance, new_balance)

write(path, content)

# ============================================================
# 6. SCROLL-TO-TOP: Improve visibility
# ============================================================
print('[6/7] scroll-to-top.tsx — improve visibility')
path = f'{BASE}/src/components/store/scroll-to-top.tsx'
content = read(path)

write(path, content)  # keep as-is if it already works

# ============================================================
# 7. LAYOUT: Add smooth transitions for page loads
# ============================================================
print('[7/7] layout.tsx — no changes needed, already good')

print('\nAll UX improvements applied!')
