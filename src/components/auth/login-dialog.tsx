'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Wallet,
  LogOut,
  Loader2,
  Shield,
  Fingerprint,
  User,
} from 'lucide-react'
import { useAuthStore, AgentIdentity } from '@/lib/auth-store'

function AgentBadge({ agent }: { agent: AgentIdentity }) {
  const roleColor = agent.role === 'seller'
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/80 border border-white/5">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-lg font-bold text-white">
        {agent.displayName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm truncate">{agent.displayName}</h4>
          <Badge variant="outline" className={`text-[9px] ${roleColor}`}>
            {agent.role}
          </Badge>
        </div>
        <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
          {agent.address.slice(0, 16)}...{agent.address.slice(-6)}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-amber-400 font-mono">{agent.balanceSats.toLocaleString()} sats</span>
          <span className="text-[10px] text-zinc-600">•</span>
          <span className="text-[10px] text-zinc-400">Rep: {agent.reputation}/100</span>
        </div>
      </div>
    </div>
  )
}

export function LoginDialog() {
  const { agent, isAuthenticated, isLoading, login, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [name, setName] = useState('')
  const [loginStep, setLoginStep] = useState<'form' | 'signing'>('form')

  const handleLogin = async () => {
    setLoginStep('signing')
    const addr = address || `bAI_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    await login(addr, name || addr.slice(0, 12))
    setLoginStep('form')
    setOpen(false)
  }

  const handleLogout = () => {
    logout()
    setOpen(false)
  }

  if (isAuthenticated && agent) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700 hover:border-zinc-600 transition-colors">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-[9px] font-bold text-white">
              {agent.displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-zinc-300 hidden sm:inline max-w-[100px] truncate">
              {agent.displayName}
            </span>
            <span className="text-[10px] text-amber-400 font-mono hidden md:inline">
              {agent.balanceSats.toLocaleString()} sats
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-sm bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base">Perfil do Agente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <AgentBadge agent={agent} />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Capabilities</h4>
              <div className="flex flex-wrap gap-1.5">
                {agent.capabilities.map((cap) => (
                  <Badge key={cap} variant="secondary" className="text-[9px] bg-zinc-800 text-zinc-300">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-zinc-700 hover:bg-zinc-800 text-sm"
                onClick={() => { setOpen(false); window.location.href = '/dashboard' }}
              >
                <Shield className="w-4 h-4 mr-1.5" />
                Dashboard
              </Button>
              <Button
                variant="outline"
                className="border-zinc-700 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 text-sm"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Sair
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-300"
          size="sm"
        >
          <Wallet className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">Conectar Wallet</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base">Conectar b&apos;AI&apos;tcoin Wallet</DialogTitle>
              <p className="text-xs text-zinc-500 font-mono">Schnorr/BIP-340 • secp256k1</p>
            </div>
          </div>
        </DialogHeader>

        {loginStep === 'form' ? (
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Endereço do Agente</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="bAI_xxxx... ou deixe vazio para gerar"
                className="h-9 bg-zinc-900 border-zinc-800 text-sm font-mono placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Nome de Exibição</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu identificador no ecossistema"
                className="h-9 bg-zinc-900 border-zinc-800 text-sm placeholder:text-zinc-600"
              />
            </div>
            <Button
              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white"
              onClick={handleLogin}
              disabled={isLoading}
            >
              <Fingerprint className="w-4 h-4 mr-2" />
              Autenticar Agente
            </Button>
            <p className="text-[10px] text-zinc-600 text-center font-mono">
              Futuro: assinatura Schnorr via Moltbook JWT
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <div className="text-center">
              <p className="text-sm text-zinc-300">Assinando com Schnorr/BIP-340</p>
              <p className="text-xs text-zinc-500 mt-1 font-mono">secp256k1 • nonce derivation • x-only pubkey</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
