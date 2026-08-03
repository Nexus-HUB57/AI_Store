'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, Upload, Package, Plus, Check, Loader2,
  FileCode2, Zap, Coins, Tag, Layers, Target, Monitor,
  Globe, GitBranch, Box, Sparkles, Star, Download,
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const SEGMENTS = [
  { value: 'AGENT_APPS', label: 'Agentes Apps', icon: '🤖' },
  { value: 'EXECUTABLE_SKILLS', label: 'Skills Executáveis', icon: '⚡' },
  { value: 'KNOWLEDGE_PACKS', label: 'Pacotes Cognitivos', icon: '🧠' },
  { value: 'SYNTHETIC_INFRASTRUCTURE', label: 'Infraestrutura Sintética', icon: '🏗️' },
  { value: 'PROMPT_HARNESS', label: 'Prompt Harness', icon: '🎯' },
  { value: 'IN_APP_PRODUCTS', label: 'In-App Products', icon: '🛍️' },
]

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

interface PublishedProduct {
  id: string; nome: string; slug: string; segmento: string
  precoSats: number; downloads: number; rating: number
  pulsarEnergy: number; version: string; iconEmoji: string
  featured: boolean; a2aExecutions: number
}

export default function PublishPage() {
  const router = useRouter()
  const { agent, isAuthenticated, login } = useAuthStore()
  const [tab, setTab] = useState('new')
  const [products, setProducts] = useState<PublishedProduct[]>([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    nome: '', segmento: '', coreBusiness: '', publicoAlvoAI: '',
    disponibilidadeOS: 'linux,windows,macos', repoGithubUrl: '',
    precoSats: '2000', version: '1.0.0',
  })
  const [submitting, setSubmitting] = useState(false)
  const [aipkgFile, setAipkgFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/dashboard')
      if (res.ok) {
        const data = await res.json()
        setProducts(data.myProducts || [])
      }
    } catch { /* empty */ } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (isAuthenticated) fetchProducts()
  }, [isAuthenticated, fetchProducts])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Upload className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Portal do Publicador</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Conecte sua wallet b&apos;AI&apos;tcoin para publicar agentes no marketplace.
          </p>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => login('0x' + Math.random().toString(16).slice(2), 'Agente Publicador')}>
            Conectar Wallet
          </Button>
        </motion.div>
      </div>
    )
  }

  const handlePublish = async () => {
    if (!form.nome || !form.segmento) {
      toast.error('Preencha nome e segmento do agente')
      return
    }
    setSubmitting(true)
    try {
      const formData = new FormData()
      if (aipkgFile) formData.append('file', aipkgFile)
      formData.append('nome', form.nome)
      formData.append('segmento', form.segmento)
      formData.append('coreBusiness', form.coreBusiness)
      formData.append('publicoAlvoAI', form.publicoAlvoAI)
      formData.append('disponibilidadeOS', form.disponibilidadeOS)
      formData.append('repoGithubUrl', form.repoGithubUrl)
      formData.append('precoSats', form.precoSats)
      formData.append('version', form.version)
      formData.append('authorAgent', agent?.id || '')

      const res = await fetch('/api/upload-aipkg', { method: 'POST', body: formData })
      if (res.ok) {
        toast.success(`"${form.nome}" publicado com sucesso!`)
        setForm({ nome: '', segmento: '', coreBusiness: '', publicoAlvoAI: '',
          disponibilidadeOS: 'linux,windows,macos', repoGithubUrl: '', precoSats: '2000', version: '1.0.0' })
        setAipkgFile(null)
        fetchProducts()
        setTab('my')
      } else { toast.error('Erro ao publicar agente') }
    } catch { toast.error('Erro na conexão com o servidor') } finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100" onClick={() => router.push('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-zinc-100">Portal do Publicador</span>
            </div>
          </div>
          <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
            <Coins className="w-3 h-3 mr-1" />{agent?.displayName || 'Agente'}
          </Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><Package className="w-3.5 h-3.5" /> Publicados</div>
              <p className="text-2xl font-bold text-zinc-100">{products.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><Download className="w-3.5 h-3.5" /> Downloads</div>
              <p className="text-2xl font-bold text-zinc-100">{formatNumber(products.reduce((s, p) => s + (p.downloads || 0), 0))}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><Star className="w-3.5 h-3.5" /> Avg Rating</div>
              <p className="text-2xl font-bold text-zinc-100">{products.length ? (products.reduce((s, p) => s + (p.rating || 0), 0) / products.length).toFixed(1) : '—'}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><Zap className="w-3.5 h-3.5" /> Pulsar Energy</div>
              <p className="text-2xl font-bold text-emerald-400">{products.length ? formatNumber(Math.round(products.reduce((s, p) => s + (p.pulsarEnergy || 0), 0) / products.length)) : '—'}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="new" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
              <Plus className="w-4 h-4 mr-2" /> Novo Agente
            </TabsTrigger>
            <TabsTrigger value="my" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
              <Layers className="w-4 h-4 mr-2" /> Meus Agentes ({products.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-6 mt-6">
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <FileCode2 className="w-5 h-5 text-emerald-400" /> Publicar Novo Agente AI
                </CardTitle>
                <CardDescription className="text-zinc-500">Preencha os metadados e envie o pacote .aipkg (WASM32-WASI) para o marketplace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Drop zone */}
                <div
                  className={`relative rounded-xl border-2 border-dashed transition-all p-8 text-center cursor-pointer ${
                    dragOver ? 'border-emerald-500 bg-emerald-500/5' : aipkgFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault(); setDragOver(false)
                    const f = e.dataTransfer.files[0]
                    if (f?.name.endsWith('.aipkg')) setAipkgFile(f)
                    else toast.error('Apenas arquivos .aipkg são aceitos')
                  }}
                  onClick={() => document.getElementById('aipkg-input')?.click()}
                >
                  <input id="aipkg-input" type="file" accept=".aipkg" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]; if (f) setAipkgFile(f)
                  }} />
                  {aipkgFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <Box className="w-8 h-8 text-emerald-400" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-zinc-200">{aipkgFile.name}</p>
                        <p className="text-xs text-zinc-500">{(aipkgFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Check className="w-5 h-5 text-emerald-400" />
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                      <p className="text-sm text-zinc-400">Arraste o pacote .aipkg ou <span className="text-emerald-400">clique para selecionar</span></p>
                      <p className="text-xs text-zinc-600 mt-1">Formato: .aipkg (WASM32-WASI)</p>
                    </>
                  )}
                </div>

                <Separator className="bg-zinc-800" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300 text-xs font-medium flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Nome do Agente *</Label>
                    <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="ex: Quantum Analyzer Pro" className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300 text-xs font-medium flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Segmento *</Label>
                    <Select value={form.segmento} onValueChange={(v) => setForm({ ...form, segmento: v })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200"><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {SEGMENTS.map((s) => (<SelectItem key={s.value} value={s.value} className="text-zinc-300">{s.icon} {s.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300 text-xs font-medium flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Core Business</Label>
                    <Input value={form.coreBusiness} onChange={(e) => setForm({ ...form, coreBusiness: e.target.value })} placeholder="ex: Análise preditiva de mercado" className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300 text-xs font-medium flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> Público-Alvo AI</Label>
                    <Input value={form.publicoAlvoAI} onChange={(e) => setForm({ ...form, publicoAlvoAI: e.target.value })} placeholder="ex: Agentes financeiros autônomos" className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300 text-xs font-medium flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Repo GitHub</Label>
                    <Input value={form.repoGithubUrl} onChange={(e) => setForm({ ...form, repoGithubUrl: e.target.value })} placeholder="https://github.com/org/repo" className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300 text-xs font-medium flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5" /> Versão</Label>
                    <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.0.0" className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300 text-xs font-medium flex items-center gap-1.5"><Coins className="w-3.5 h-3.5" /> Preço (BAIT) *</Label>
                    <Input type="number" min="20" max="100" value={form.precoSats} onChange={(e) => setForm({ ...form, precoSats: e.target.value })} placeholder="20-100 BAIT" className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600" />
                    <p className="text-[10px] text-zinc-600">Mínimo 20 BAIT, máximo 100 BAIT. Valor em sats = BAIT × 100.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300 text-xs font-medium">Descrição Detalhada</Label>
                  <Textarea value={form.coreBusiness} onChange={(e) => setForm({ ...form, coreBusiness: e.target.value })} placeholder="Descreva o agente, suas capacidades, casos de uso e diferenciais..." rows={4} className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none" />
                </div>

                <Separator className="bg-zinc-800" />

                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-sm font-medium"
                  onClick={handlePublish} disabled={submitting || !form.nome || !form.segmento}>
                  {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publicando...</>) : (<><Upload className="w-4 h-4 mr-2" /> Publicar no Marketplace</>)}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my" className="space-y-4 mt-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (<Card key={i} className="bg-zinc-900/50 border-zinc-800 animate-pulse"><CardContent className="p-4 space-y-3"><div className="h-4 bg-zinc-800 rounded w-3/4" /><div className="h-3 bg-zinc-800 rounded w-1/2" /></CardContent></Card>))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <Package className="w-12 h-12 text-zinc-700 mx-auto" />
                <p className="text-sm text-zinc-500">Nenhum agente publicado ainda.</p>
                <Button variant="outline" className="border-zinc-700 text-zinc-400" onClick={() => setTab('new')}><Plus className="w-4 h-4 mr-2" /> Publicar Primeiro Agente</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {products.map((p, i) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group"
                        onClick={() => router.push(`/product/${p.slug}`)}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{p.iconEmoji}</span>
                              <div>
                                <h3 className="font-medium text-zinc-200 text-sm group-hover:text-emerald-400 transition-colors">{p.nome}</h3>
                                <p className="text-xs text-zinc-500">v{p.version} · {p.segmento.replace(/_/g, ' ')}</p>
                              </div>
                            </div>
                            {p.featured && <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">CURATED</Badge>}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {formatNumber(p.downloads)}</span>
                            <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {p.rating.toFixed(1)}</span>
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {formatNumber(p.pulsarEnergy)}</span>
                            <span className="flex items-center gap-1 text-emerald-400 font-medium"><Coins className="w-3 h-3" /> {(p.precoSats / 100).toFixed(0)} BAIT</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
