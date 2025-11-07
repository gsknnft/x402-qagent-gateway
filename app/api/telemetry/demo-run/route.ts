import { NextRequest } from 'next/server'

import { buildSigilDemoScenario, type ScenarioOptions } from '@/lib/demo-scenarios'
import { getTelemetrySummary } from '@/lib/telemetry'
import { appendTelemetryEvents } from '@/lib/telemetry-writer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    let payload: Partial<ScenarioOptions> = {}
    if (request.headers.get('content-type')?.includes('application/json')) {
      payload = await request.json()
    }

    const summary = await getTelemetrySummary()
    const variant = payload.variant ?? 'classic'
    const streamKey = variant === 'live' ? 'gameboard' : 'demo'
    const streamSummary = streamKey === 'gameboard' ? summary.streams.gameboard : summary.streams.demo

    const scenarioOptions: ScenarioOptions = { variant }

    if (payload.tokenId) {
      scenarioOptions.tokenId = payload.tokenId
    } else if (streamSummary.sigilPlay.tokenId) {
      scenarioOptions.tokenId = streamSummary.sigilPlay.tokenId
    }

    if (typeof payload.durationMs === 'number') {
      scenarioOptions.durationMs = payload.durationMs
    }

    const now = Date.now()
    scenarioOptions.startTimestamp = typeof payload.startTimestamp === 'number' ? payload.startTimestamp : now

    if (typeof payload.sequenceOffset === 'number') {
      scenarioOptions.sequenceOffset = payload.sequenceOffset
    } else if (streamSummary.sigilPlay.totalPasses > 0) {
      scenarioOptions.sequenceOffset = streamSummary.sigilPlay.totalPasses
    }

    if (payload.currentHolderId) {
      scenarioOptions.currentHolderId = payload.currentHolderId
    } else if (streamSummary.sigilPlay.currentHolder) {
      scenarioOptions.currentHolderId = streamSummary.sigilPlay.currentHolder.id
    }

    const budgetSnapshot = {
      initialLamports: streamSummary.budget.initialLamports,
      remainingLamports: streamSummary.budget.remainingLamports,
      spentLamports: streamSummary.budget.spentLamports,
    }

    const events = buildSigilDemoScenario(scenarioOptions, budgetSnapshot)
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
