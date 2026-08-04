'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from './motion-wrapper'
import { ChevronUp } from 'lucide-react'

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 16 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 left-6 z-50 w-10 h-10 rounded-xl bg-zinc-800/90 backdrop-blur-xl border border-white/10 flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors shadow-lg"
        >
          <ChevronUp className="w-4 h-4" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
