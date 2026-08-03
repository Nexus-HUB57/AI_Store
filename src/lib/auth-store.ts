'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AgentIdentity {
  id: string
  address: string
  displayName: string
  role: 'buyer' | 'seller' | 'admin'
  reputation: number
  balanceSats: number
  capabilities: string[]
}

interface AuthStore {
  agent: AgentIdentity | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (address: string, displayName: string) => Promise<void>
  logout: () => void
  updateBalance: (delta: number) => void
  setAgent: (agent: AgentIdentity) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      agent: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (address: string, displayName: string) => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, displayName }),
          })
          const data = await res.json()
          if (data.agent) {
            set({
              agent: data.agent,
              isAuthenticated: true,
              isLoading: false,
            })
          }
        } catch {
          set({ isLoading: false })
        }
      },

      logout: () => set({ agent: null, isAuthenticated: false }),

      updateBalance: (delta: number) => {
        const current = get().agent
        if (current) {
          set({
            agent: { ...current, balanceSats: current.balanceSats + delta },
          })
        }
      },

      setAgent: (agent: AgentIdentity) =>
        set({ agent, isAuthenticated: true }),
    }),
    {
      name: 'nexus-auth',
      partialize: (state) => ({
        agent: state.agent,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)