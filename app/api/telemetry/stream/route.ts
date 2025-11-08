import { NextRequest } from 'next/server'

import { getTelemetrySummary } from '@/lib/telemetry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  const encoder = new TextEncoder()
  let closed = false
  let timer: NodeJS.Timeout | null = null
  let lastPayloadHash: string | null = null

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = async () => {
        const summary = await getTelemetrySummary()
        const payload = JSON.stringify(summary)
        if (payload === lastPayloadHash) {
          return
        }
        lastPayloadHash = payload
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
      }

      controller.enqueue(encoder.encode(': connected\n\n'))
      await send().catch(error => {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: String(error) })}\n\n`))
      })

      timer = setInterval(() => {
        if (closed) {
          return
        }
        send().catch(error => {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ message: String(error) })}\n\n`),
          )
        })
      }, 3000)
    },
    cancel() {
      closed = true
      if (timer) {
        clearInterval(timer)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
