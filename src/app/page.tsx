'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import dynamic from 'next/dynamic'
import { usePulsarSSE } from '@/hooks/use-pulsar-sse'
import { apiUrl } from '@/lib/utils'

const CartPanel = dynamic(() => import('@/components/store/cart-panel').then(m => ({ default: m.CartPanel })), { ssr: false })
const ScrollToTopButton = dynamic(() => import('@/components/store/scroll-to-top').then(m => ({ default: m.ScrollToTopButton })), { ssr: false })

interface Product {
  id: string; nome: string; slug: string; segmento: string
  coreBusiness: string; precoSats: number; downloads: number
  rating: number; pulsarEnergy: number; iconEmoji: string; featured: boolean
}

interface Category { key: string; nome: string; icon: string; count: number }

interface Stats {
  total: number; categories: Category[]; avgPulsarEnergy: number
  totalDownloads: number; totalExecutions: number; featuredCount: number
}

const PER_PAGE = 12

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('pulsar')
  const [search, setSearch] = useState('')
  const [segmento, setSegmento] = useState('all')
  const [loading, setLoading] = useState(true)
  usePulsarSSE()

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(apiUrl('/api/stats'))
      if (!r.ok) return
      const d = await r.json()
      if (d) setStats(d)
    } catch { /* network */ }
  }, [])

  const fetchProducts = useCallback(async (silent?: boolean) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PER_PAGE),
        sort,
        ...(search ? { q: search } : {}),
        ...(segmento !== 'all' ? { segmento } : {}),
      })
      const r = await fetch(apiUrl(`/api/products?${params}`))
      if (!r.ok) {
        setProducts([])
        setLoading(false)
        return
      }
      const d = await r.json()
      setProducts(d.products || [])
      setTotal(d.pagination?.total || 0)
      setTotalPages(Math.max(1, Math.ceil((d.pagination?.total || 0) / PER_PAGE)))
    } catch { /* network */ }
    setLoading(false)
  }, [page, sort, search, segmento])

  useEffect(() => {
    fetchStats()
    fetchProducts(true)
  }, [fetchStats, fetchProducts])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/5 px-4 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">AI Store — Nexus AI-OS</h1>
          <p className="text-xs text-zinc-500">
            {stats ? `${stats.total} produtos A2A` : 'Carregando…'} · basePath /aistore
          </p>
        </div>
        <CartPanel />
      </header>
      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="bg-zinc-900 border-zinc-800"
          />
          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pulsar">Pulsar</SelectItem>
              <SelectItem value="downloads">Downloads</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {stats?.categories && (
          <div className="flex flex-wrap gap-2">
            {stats.categories.map((c) => (
              <Button
                key={c.key}
                size="sm"
                variant={segmento === c.key ? 'default' : 'outline'}
                className="text-xs"
                onClick={() => { setSegmento(segmento === c.key ? 'all' : c.key); setPage(1) }}
              >
                {c.icon} {c.nome} ({c.count})
              </Button>
            ))}
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 bg-zinc-900" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-sm text-zinc-500 py-16">Nenhum produto neste filtro.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((p) => (
              <Card key={p.id} className="border-white/5 bg-zinc-900/40">
                <CardContent className="p-4 space-y-2">
                  <div className="text-2xl">{p.iconEmoji || '📦'}</div>
                  <h2 className="text-sm font-medium truncate">{p.nome}</h2>
                  <p className="text-[11px] text-zinc-500 line-clamp-2">{p.coreBusiness}</p>
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>{p.downloads} dl</span>
                    <span className="text-amber-400">{Number(p.pulsarEnergy).toFixed(0)}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span className="text-xs text-zinc-500">{page} / {totalPages} · {total} itens</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      </main>
      <ScrollToTopButton />
    </div>
  )
}
