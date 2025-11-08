import { NextResponse } from 'next/server'

import { clearTelemetry } from '@/lib/telemetry'

export async function POST() {
  await clearTelemetry()
  return NextResponse.json({ status: 'cleared' })
}
