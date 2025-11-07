import { NextRequest } from 'next/server'

import { buildSigilDemoScenario } from '@/lib/demo-scenarios'
import { appendTelemetryEvents } from '@/lib/telemetry-writer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    let payload: { variant?: 'classic' | 'fast-break' | 'press-break' | 'live'; tokenId?: string; durationMs?: number } = {}
    if (request.headers.get('content-type')?.includes('application/json')) {
      payload = await request.json()
    }

    const events = buildSigilDemoScenario(payload)
    await appendTelemetryEvents(events)

    return Response.json({ ok: true, events: events.length })
  } catch (error) {
    console.error('Failed to run demo scenario', error)
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}
