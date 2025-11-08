import { NextRequest } from 'next/server'

import { loadTelemetryEvents } from '@/lib/telemetry'
import { generateCommentary, formatCommentaryScript, exportCommentaryForVideo } from '@/lib/commentary-generator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const variant = searchParams.get('variant') || 'recent'
    const format = searchParams.get('format') || 'text'
    
    // Load recent events
    const events = await loadTelemetryEvents(100)
    
    if (events.length === 0) {
      return Response.json({ error: 'No telemetry events available' }, { status: 404 })
    }
    
    // Generate commentary
    const commentary = generateCommentary(events, variant)
    
    if (format === 'json') {
      return Response.json(commentary)
    } else if (format === 'srt') {
      const srt = exportCommentaryForVideo(commentary)
      return new Response(srt, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="sigil-commentary-${variant}.srt"`,
        },
      })
    } else {
      const text = formatCommentaryScript(commentary)
      return new Response(text, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
        },
      })
    }
  } catch (error) {
    console.error('Failed to generate commentary', error)
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}
