import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

const clients = new Set<ReadableStreamDefaultController>()
let broadcastInterval: ReturnType<typeof setInterval> | null = null

function startBroadcast() {
  if (broadcastInterval) return

  broadcastInterval = setInterval(async () => {
    if (clients.size === 0) {
      if (broadcastInterval) {
        clearInterval(broadcastInterval)
        broadcastInterval = null
      }
      return
    }

    try {
      const count = await db.product.count()
      if (count === 0) return

      const skip = Math.floor(Math.random() * Math.max(0, count - 5))
      const products = await db.product.findMany({
        take: Math.min(5, count),
        skip: Math.max(0, skip),
        select: { id: true, pulsarEnergy: true, nome: true },
      })

      const updates = []
      for (const product of products) {
        const delta = (Math.random() - 0.45) * 3
        const newEnergy = Math.max(10, Math.min(99.9, product.pulsarEnergy + delta))

        await db.product.update({
          where: { id: product.id },
          data: { pulsarEnergy: Math.round(newEnergy * 10) / 10 },
        })

        updates.push({
          productId: product.id,
          nome: product.nome,
          pulsarEnergy: Math.round(newEnergy * 10) / 10,
          delta: Math.round(delta * 100) / 100,
        })
      }

      const avgDelta = updates.reduce((s, u) => s + u.delta, 0) / updates.length

      const data = JSON.stringify({
        type: 'pulsar_batch',
        updates,
        avgDelta: Math.round(avgDelta * 100) / 100,
        timestamp: Date.now(),
      })

      for (const client of clients) {
        try {
          const encoder = new TextEncoder()
          client.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch {
          clients.delete(client)
        }
      }
    } catch (err) {
      console.error('Pulsar broadcast error:', err)
    }
  }, 3000)
}

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller)
      startBroadcast()

      const encoder = new TextEncoder()
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'connected', message: 'Pulsar Energy stream active' })}\n\n`
        )
      )

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`)
          )
        } catch {
          clearInterval(heartbeat)
          clients.delete(controller)
        }
      }, 15000)

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        clients.delete(controller)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
