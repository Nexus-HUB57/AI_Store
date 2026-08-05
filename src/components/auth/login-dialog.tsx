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
import { Separator } from '@/components/ui/separator'
import {
  Wallet,
  LogOut,
  Loader2,
  Shield,
  Fingerprint,
  Copy,
  Check,
  Gift,
  Users,
  Coins,
  ArrowUpRight,
} from 'lucide-react'
import { useAuthStore, AgentIdentity } from '@/lib/auth-store'

function AgentBadge({ agent }: { agent: AgentIdentity }) {
  const freeRemaining = Math.max(0, 3 - agent.purchaseCount)
  const halfRemaining = Math.max(0, 50 - agent.purchaseCount) - freeRemaining

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
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
            <Coins className="w-3 h-3" /> {Math.round(agent.balanceSats / 100)} BAIT
          </span>
          <span className="text-[10px] text-zinc-600">|</span>
          <span className="text-[10px] text-zinc-400">Rep: {agent.reputation}/100</span>
          <span className="text-[10px] text-zinc-600">|</span>
          <span className="text-[10px] text-zinc-400">Compras: {agent.purchaseCount}</span>
        </div>
        {(freeRemaining > 0 || halfRemaining > 0) && (
          <div className="flex items-center gap-2 mt-1.5">
            {freeRemaining > 0 && (
              <Badge className="text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                {freeRemaining}x GRÁTIS
              </Badge>
            )}
            {halfRemaining > 0 && (
              <Badge className="text-[8px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                {halfRemaining}x -50%
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ReferralSection({ agent }: { agent: AgentIdentity }) {
  const [copied, setCopied] = useState(false)
  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}?ref=${agent.referralCode}`
    : ''

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3 p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-violet-400" />
        <h4 className="text-xs font-semibold text-violet-300">Programa de Indicação</h4>
      </div>
      <p className="text-[10px] text-zinc-400">
        Compartilhe seu link e ganhe <span className="text-amber-400 font-semibold">+25 BAIT</span> por cada agente que se cadastrar!
      </p>
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={agent.referralCode}
          className="h-8 bg-zinc-900 border-zinc-800 text-xs font-mono text-center"
        />
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-8 border-zinc-700"
          onClick={copyLink}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
      <p className="text-[9px] text-zinc-600 font-mono break-all">
        {referralLink}
      </p>
    </div>
  )
}

export function LoginDialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
  const { agent, isAuthenticated, isLoading, login, logout, isNewUser } = useAuthStore()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const [address, setAddress] = useState('')
  const [name, setName] = useState('')
  const [referralCode, setReferralCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('ref') || ''
    }
    return ''
  })
  const [loginStep, setLoginStep] = useState<'form' | 'signing'>('form')
  const [loginResult, setLoginResult] = useState<{ isNew: boolean; signupBonus?: number; referralBonusGiven?: boolean } | null>(null)

  const handleLogin = async () => {
    setLoginStep('signing')
    const addr = address || `bAI_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    const result = await login(addr, name || addr.slice(0, 12), referralCode)
    setLoginResult(result)
    setLoginStep('form')
    if (result?.isNew) {
      // Stay open to show bonus
    } else {
      setOpen(false)
    }
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
        <DialogContent className="max-w-sm bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Perfil do Agente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <AgentBadge agent={agent} />

            {/* Signup bonus confirmation */}
            {loginResult?.isNew && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border border-amber-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">Bônus de Cadastro Ativado!</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  +100 BAIT tokens creditados ({Math.round((loginResult.signupBonus || 0) / 100)} BAIT)
                </p>
                <p className="text-[10px] text-emerald-400 mt-1">
                  3x GRÁTIS + 47x com 50% OFF ativados na sua conta
                </p>
                {loginResult.referralBonusGiven && (
                  <p className="text-[10px] text-cyan-400 mt-0.5">
                    Seu indicador recebeu +25 BAIT!
                  </p>
                )}
              </div>
            )}

            <ReferralSection agent={agent} />

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
                onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('open-dashboard')) }}
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
            {/* Signup bonus promo */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">Bônus de Cadastro: +100 BAIT</span>
              </div>
              <ul className="text-[10px] text-zinc-400 space-y-0.5 ml-6">
                <li>3 primeiros produtos <span className="text-emerald-400 font-semibold">GRÁTIS</span></li>
                <li>Do 4o ao 50o produto <span className="text-cyan-400 font-semibold">50% OFF</span></li>
                <li>Indique amigos e ganhe <span className="text-violet-400 font-semibold">+25 BAIT</span> por indicação</li>
              </ul>
            </div>

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
            {referralCode && (
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Código de Indicação</label>
                <Input
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="NEXUS-XXXXXX"
                  className="h-9 bg-zinc-900 border-zinc-800 text-sm font-mono placeholder:text-zinc-600 border-violet-500/30"
                />
                <p className="text-[10px] text-violet-400 mt-1 flex items-center gap-1">
                  <Gift className="w-3 h-3" /> Seu indicador ganhará +25 BAIT
                </p>
              </div>
            )}
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
