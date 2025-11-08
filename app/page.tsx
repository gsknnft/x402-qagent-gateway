import { TelemetryDashboard } from '@/components/telemetry-dashboard'
import { getTelemetrySummary } from '@/lib/telemetry'

export default async function Home() {
  const summary = await getTelemetrySummary()
  const demoModeEnabled = process.env.NEXT_PUBLIC_X402_DEMO_MODE === 'skip'

  return <TelemetryDashboard initialSummary={summary} demoModeEnabled={demoModeEnabled} />
}
