'use client'

import { useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  ShoppingCart,
  X,
  Coins,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Zap,
  ArrowRight,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { usePulsarSSE } from '@/hooks/use-pulsar-sse'

const SEGMENT_COLORS: Record<string, string> = {
  AGENT_APPS: 'bg-emerald-500/15 text-emerald-400',
  EXECUTABLE_SKILLS: 'bg-amber-500/15 text-amber-400',
  KNOWLEDGE_PACKS: 'bg-cyan-500/15 text-cyan-400',
  SYNTHETIC_INFRASTRUCTURE: 'bg-rose-500/15 text-rose-400',
  PROMPT_HARNESS: 'bg-violet-500/15 text-violet-400',
  IN_APP_PRODUCTS: 'bg-fuchsia-500/15 text-fuchsia-400',
}

function PurchaseSuccess({ txId, total, remaining }: { txId: string; total: number; remaining: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      </div>
      <div>
        <h3 className="font-semibold text-emerald-400 mb-1">Transação Confirmada</h3>
        <p className="text-xs text-zinc-400 font-mono">TX: {txId}</p>
      </div>
      <div className="text-sm text-zinc-300">
        <p>{total.toLocaleString()} sats debitados</p>
        <p className="text-xs text-zinc-500 mt-1">Saldo restante: {remaining.toLocaleString()} sats</p>
      </div>
      <p className="text-[10px] text-zinc-600 font-mono">b&apos;AI&apos;tcoin Mainnet • A2A-RPC Settlement</p>
    </div>
  )
}

export function CartPanel() {
  const {
    items,
    isOpen,
    setCartOpen,
    removeItem,
    clearCart,
    totalSats,
    purchase,
    balance,
  } = useCartStore()

  const { connected, updates } = usePulsarSSE()
  const [purchaseResult, setPurchaseResult] = useState<{
    success: boolean
    txId: string
    remaining: number
  } | null>(null)
  const [purchasing, setPurchasing] = useState(false)

  const handlePurchase = async () => {
    setPurchasing(true)
    const result = purchase()
    if (result.success) {
      setPurchaseResult(result)
      setTimeout(() => setPurchaseResult(null), 8000)
    }
    setPurchasing(false)
  }

  const latestPulsar = updates.length > 0 ? updates[0] : null

  return (
    <>
      {/* Cart FAB + Pulsar Indicator */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
        {/* Pulsar Live Indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono backdrop-blur-xl border transition-all ${
          connected
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-zinc-800/80 border-zinc-700 text-zinc-500'
        }`}>
          {connected ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Pulsar Live</span>
              {latestPulsar && (
                <span className={latestPulsar.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {latestPulsar.delta >= 0 ? '↑' : '↓'}{Math.abs(latestPulsar.delta).toFixed(1)}%
                </span>
              )}
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </>
          )}
        </div>

        {/* Cart FAB */}
        <button
          onClick={() => setCartOpen(true)}
          className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          <ShoppingCart className="w-6 h-6" />
          {items.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center">
              {items.length}
            </span>
          )}
        </button>
      </div>

      {/* Cart Sheet */}
      <Sheet open={isOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-0 flex flex-col">
          <SheetHeader className="p-4 pb-2 border-b border-white/10 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <SheetTitle className="text-base">Carrinho b&apos;AI&apos;tcoin</SheetTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 bg-amber-500/10 text-amber-400">
                {balance.toLocaleString()} sats
              </Badge>
            </div>
          </SheetHeader>

          {purchaseResult?.success ? (
            <div className="flex-1">
              <PurchaseSuccess
                txId={purchaseResult.txId}
                total={totalSats()}
                remaining={purchaseResult.remaining}
              />
            </div>
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-400">Carrinho vazio</p>
              <p className="text-xs text-zinc-600 max-w-[200px]">
                Adicione agentes e pacotes do ecossistema Nexus AI-OS
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-white/5"
                    >
                      <div className="text-xl w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 shrink-0">
                        {item.iconEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{item.nome}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 ${SEGMENT_COLORS[item.segmento] || ''}`}
                          >
                            {item.segmento.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            v{item.version}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-mono text-emerald-400">
                          {item.precoSats.toLocaleString()} sats
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-zinc-600 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-white/10 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Total ({items.length} itens)</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {totalSats().toLocaleString()} sats
                  </span>
                </div>

                {totalSats() > balance && (
                  <p className="text-xs text-rose-400 text-center">
                    Saldo insuficiente para esta transação
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-zinc-700 hover:bg-zinc-800"
                    onClick={clearCart}
                  >
                    Limpar
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white disabled:opacity-50"
                    disabled={purchasing || totalSats() > balance}
                    onClick={handlePurchase}
                  >
                    {purchasing ? (
                      'Processando...'
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-1" />
                        Comprar bAI
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
