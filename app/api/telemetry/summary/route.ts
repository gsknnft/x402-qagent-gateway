import { NextResponse } from 'next/server'

import { getTelemetrySummary } from '@/lib/telemetry'

export async function GET() {
  const summary = await getTelemetrySummary()
  return NextResponse.json(summary)
}
