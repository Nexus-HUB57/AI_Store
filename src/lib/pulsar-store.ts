import { create } from 'zustand'

interface PulsarUpdate {
  productId: string
  pulsarEnergy: number
  delta: number
}

interface PulsarStore {
  connected: boolean
  updates: PulsarUpdate[]
  lastUpdate: number | null
  setConnected: (connected: boolean) => void
  pushUpdate: (update: PulsarUpdate) => void
  clearUpdates: () => void
}

export const usePulsarStore = create<PulsarStore>((set) => ({
  connected: false,
  updates: [],
  lastUpdate: null,
  setConnected: (connected) => set({ connected }),
  pushUpdate: (update) =>
    set((state) => ({
      updates: [update, ...state.updates].slice(0, 50),
      lastUpdate: Date.now(),
    })),
  clearUpdates: () => set({ updates: [], lastUpdate: null }),
}))
