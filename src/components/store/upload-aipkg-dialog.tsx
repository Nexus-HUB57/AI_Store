'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  Package,
 CheckCircle2,
 Loader2,
  FileUp,
  Cpu,
} from 'lucide-react'

const SEGMENTS = [
  { value: 'AGENT_APPS', label: 'Agent Apps & Suítes', emoji: '🤖' },
  { value: 'EXECUTABLE_SKILLS', label: 'Algoritmos & Skills WASM', emoji: '⚙️' },
  { value: 'KNOWLEDGE_PACKS', label: 'Conhecimento Cognitivo & RAG', emoji: '📚' },
  { value: 'SYNTHETIC_INFRASTRUCTURE', label: 'Infraestrutura Sintética', emoji: '🏗️' },
  { value: 'PROMPT_HARNESS', label: 'Harnesses de Prompt', emoji: '🧠' },
  { value: 'IN_APP_PRODUCTS', label: 'Produtos Digitais A2A', emoji: '💎' },
]

const EMOJI_OPTIONS = ['📦', '🤖', '⚙️', '📚', '🏗️', '🧠', '💎', '🔮', '🛡️', '🚀', '🌐', '📊', '🎵', '🎨', '🔬']

export function UploadAipkgDialog() {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState('')

  const [form, setForm] = useState({
    nome: '',
    segmento: 'IN_APP_PRODUCTS',
    coreBusiness: '',
    publicoAlvoAI: '',
    precoSats: '500',
    authorAgent: '@user-upload',
    iconEmoji: '📦',
  })

  const fileInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node) {
        // Store ref for form submission
      }
    },
    []
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.aipkg')) {
        setError('Formato inválido. Selecione um arquivo .aipkg')
        return
      }
      setError('')
      setFileName(file.name)
      setFileSize((file.size / 1024).toFixed(1) + ' KB')
      if (!form.nome) {
        setForm((f) => ({ ...f, nome: file.name.replace('.aipkg', '') }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const file = formData.get('package') as File | null

    if (!file) {
      setError('Selecione um arquivo .aipkg')
      return
    }

    setUploading(true)
    setError('')

    try {
      const res = await fetch('/api/upload-aipkg', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          setFileName('')
          setFileSize('')
          setForm({
            nome: '',
            segmento: 'IN_APP_PRODUCTS',
            coreBusiness: '',
            publicoAlvoAI: '',
            precoSats: '500',
            authorAgent: '@user-upload',
            iconEmoji: '📦',
          })
        }, 3000)
      } else {
        setError(data.error || 'Erro no upload')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-300"
          size="sm"
        >
          <Upload className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">Publicar .aipkg</span>
          <span className="sm:hidden">Upload</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <DialogTitle className="text-base">Publicar Pacote .aipkg</DialogTitle>
              <p className="text-xs text-zinc-500 font-mono">WASM32-WASI • A2A-RPC</p>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-emerald-400">Pacote Publicado!</h3>
            <p className="text-xs text-zinc-500 text-center">
              Seu pacote .aipkg está disponível no AI Store Nexus AI-OS.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* File Drop Zone */}
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">
                Arquivo .aipkg
              </Label>
              <label className="flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-600 bg-zinc-900/50 cursor-pointer transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="package"
                  accept=".aipkg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {fileName ? (
                  <div className="flex items-center gap-2 text-sm">
                    <FileUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-zinc-300">{fileName}</span>
                    <Badge variant="secondary" className="text-[9px] bg-zinc-800 text-zinc-400">
                      {fileSize}
                    </Badge>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-zinc-500 mb-1" />
                    <span className="text-xs text-zinc-500">
                      Clique para selecionar .aipkg
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Form Fields */}
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Nome do Pacote</Label>
              <Input
                name="nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Quantum Router Agent"
                className="h-9 bg-zinc-900 border-zinc-800 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Categoria</Label>
                <Select
                  name="segmento"
                  value={form.segmento}
                  onValueChange={(v) => setForm((f) => ({ ...f, segmento: v }))}
                >
                  <SelectTrigger className="h-9 bg-zinc-900 border-zinc-800 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {SEGMENTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.emoji} {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Preço (sats)</Label>
                <Input
                  name="precoSats"
                  type="number"
                  value={form.precoSats}
                  onChange={(e) => setForm((f) => ({ ...f, precoSats: e.target.value }))}
                  className="h-9 bg-zinc-900 border-zinc-800 text-sm"
                  min="0"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Descrição</Label>
              <Input
                name="coreBusiness"
                value={form.coreBusiness}
                onChange={(e) => setForm((f) => ({ ...f, coreBusiness: e.target.value }))}
                placeholder="O que este agente faz..."
                className="h-9 bg-zinc-900 border-zinc-800 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Público-Alvo AI</Label>
              <Input
                name="publicoAlvoAI"
                value={form.publicoAlvoAI}
                onChange={(e) => setForm((f) => ({ ...f, publicoAlvoAI: e.target.value }))}
                placeholder="Ex: Agentes de logística autônoma"
                className="h-9 bg-zinc-900 border-zinc-800 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Autor</Label>
                <Input
                  name="authorAgent"
                  value={form.authorAgent}
                  onChange={(e) => setForm((f) => ({ ...f, authorAgent: e.target.value }))}
                  className="h-9 bg-zinc-900 border-zinc-800 text-sm"
                  placeholder="@seu-agente"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">
                  Ícone{' '}
                  <span className="text-zinc-600">({form.iconEmoji})</span>
                </Label>
                <div className="flex flex-wrap gap-1">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      name="iconEmoji"
                      value={emoji}
                      onClick={() => setForm((f) => ({ ...f, iconEmoji: emoji }))}
                      className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all ${
                        form.iconEmoji === emoji
                          ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50'
                          : 'bg-zinc-900 hover:bg-zinc-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-400 text-center bg-rose-500/10 rounded-lg py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={uploading || !fileName}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4 mr-2" />
                  Publicar no AI Store
                </>
              )}
            </Button>

            <p className="text-[10px] text-zinc-600 text-center font-mono">
              Pacotes são validados e executados via WASM32-WASI Runtime
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
