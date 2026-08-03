import { create } from 'zustand'

export interface CartItem {
  id: string
  nome: string
  precoSats: number
  iconEmoji: string
  segmento: string
  version: string
  authorAgent: string
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  balance: number
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
  toggleCart: () => void
  setCartOpen: (open: boolean) => void
  totalSats: () => number
  purchase: () => { success: boolean; txId: string; remaining: number }
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  balance: 500000,

  addItem: (item) => {
    set((state) => {
      const exists = state.items.find((i) => i.id === item.id)
      if (exists) return state
      return { items: [...state.items, item] }
    })
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    }))
  },

  clearCart: () => set({ items: [] }),

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

  setCartOpen: (open) => set({ isOpen: open }),

  totalSats: () => {
    return get().items.reduce((sum, item) => sum + item.precoSats, 0)
  },

  purchase: () => {
    const state = get()
    const total = state.totalSats()
    if (total > state.balance) {
      return { success: false, txId: '', remaining: state.balance }
    }
    const txId = 'bAI-' + Math.random().toString(36).substring(2, 15)
    const remaining = state.balance - total
    set({ items: [], balance: remaining })
    return { success: true, txId, remaining }
  },
}))
