'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AI Store Error Boundary]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-rose-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-100">Erro Inesperado</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Ocorreu um erro ao processar sua solicitação.
            Isso foi registrado para análise.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-zinc-600">Error ID: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
            onClick={() => (window.location.href = '/')}
          >
            <Home className="w-4 h-4 mr-2" />
            Início
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={reset}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    </div>
  )
}
