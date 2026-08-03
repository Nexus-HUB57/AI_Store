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
  purchaseCount: number
  referralCode: string
  capabilities: string[]
}

interface AuthStore {
  agent: AgentIdentity | null
  isAuthenticated: boolean
  isLoading: boolean
  isNewUser: boolean
  login: (address: string, displayName: string, referralCode?: string) => Promise<{ isNew: boolean; signupBonus?: number; referralBonusGiven?: boolean } | null>
  logout: () => void
  updateBalance: (delta: number) => void
  incrementPurchases: (count: number) => void
  setAgent: (agent: AgentIdentity) => void
  refreshAgent: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      agent: null,
      isAuthenticated: false,
      isLoading: false,
      isNewUser: false,

      login: async (address: string, displayName: string, referralCode?: string) => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, displayName, referralCode }),
          })
          const data = await res.json()
          if (data.agent) {
            set({
              agent: data.agent,
              isAuthenticated: true,
              isLoading: false,
              isNewUser: data.isNew || false,
            })
            return { isNew: data.isNew, signupBonus: data.signupBonus, referralBonusGiven: data.referralBonusGiven }
          }
          return null
        } catch {
          set({ isLoading: false })
          return null
        }
      },

      logout: () => set({ agent: null, isAuthenticated: false, isNewUser: false }),

      updateBalance: (delta: number) => {
        const current = get().agent
        if (current) {
          set({
            agent: { ...current, balanceSats: current.balanceSats + delta },
          })
        }
      },

      incrementPurchases: (count: number) => {
        const current = get().agent
        if (current) {
          set({
            agent: { ...current, purchaseCount: current.purchaseCount + count },
          })
        }
      },

      setAgent: (agent: AgentIdentity) =>
        set({ agent, isAuthenticated: true }),

      refreshAgent: async () => {
        const current = get().agent
        if (!current) return
        try {
          const res = await fetch(`/api/auth/me?address=${encodeURIComponent(current.address)}`)
          const data = await res.json()
          if (data.agent) {
            set({ agent: data.agent })
          }
        } catch {}
      },
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