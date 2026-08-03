'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePulsarStore } from '@/lib/pulsar-store'

interface PulsarUpdatePayload {
  productId: string
  nome: string
  pulsarEnergy: number
  delta: number
}

interface SSEMessage {
  type: 'connected' | 'pulsar_batch' | 'heartbeat'
  updates?: PulsarUpdatePayload[]
  avgDelta?: number
  timestamp?: number
  message?: string
}

export function usePulsarSSE() {
  const { setConnected, pushUpdate } = usePulsarStore()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)
  const reconnectAttempts = useRef(0)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const es = new EventSource('/api/pulsar')
    eventSourceRef.current = es

    es.onopen = () => {
      setConnected(true)
      reconnectAttempts.current = 0
    }

    es.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data)
        if (data.type === 'pulsar_batch' && data.updates) {
          for (const update of data.updates) {
            pushUpdate({
              productId: update.productId,
              pulsarEnergy: update.pulsarEnergy,
              delta: update.delta,
            })
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
      eventSourceRef.current = null

      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000)
      reconnectAttempts.current++
      reconnectTimeout.current = setTimeout(connect, delay)
    }
  }, [setConnected, pushUpdate])

  useEffect(() => {
    connect()
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close()
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      setConnected(false)
    }
  }, [connect, setConnected])

  return usePulsarStore()
}
