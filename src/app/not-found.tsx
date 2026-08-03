'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Home, Search, Store, Bot, ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Animated glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-lg w-full text-center space-y-8 relative z-10"
      >
        {/* 404 Code */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          className="relative"
        >
          <h1 className="text-[8rem] font-black leading-none tracking-tighter">
            <span className="bg-gradient-to-b from-zinc-200 via-zinc-400 to-zinc-700 bg-clip-text text-transparent">
              4
            </span>
            <span className="bg-gradient-to-b from-emerald-300 via-emerald-500 to-emerald-800 bg-clip-text text-transparent">
              0
            </span>
            <span className="bg-gradient-to-b from-zinc-200 via-zinc-400 to-zinc-700 bg-clip-text text-transparent">
              4
            </span>
          </h1>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent blur-sm" />
        </motion.div>

        {/* Bot icon */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg shadow-emerald-500/5">
            <Bot className="w-8 h-8 text-emerald-400" />
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h2 className="text-2xl font-bold text-zinc-100">
            Agente não encontrado
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
            O pacote de agente AI que você procura não existe ou foi movido para outro segmento no marketplace.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/">
              <Store className="w-4 h-4 mr-2" />
              Explorar Marketplace
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
            <Link href="/">
              <Search className="w-4 h-4 mr-2" />
              Buscar Agentes
            </Link>
          </Button>
        </motion.div>

        {/* Subtle hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-xs text-zinc-600"
        >
          Nexus AI-OS · b&apos;AI&apos;tcoin Mainnet
        </motion.p>
      </motion.div>
    </div>
  )
}
