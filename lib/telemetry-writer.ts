import fs from 'node:fs/promises'
import path from 'node:path'

import type { TelemetryEvent } from '../packages/telemetry-core/src/types'

import { TELEMETRY_LOG_PATH } from './telemetry'

export async function appendTelemetryEvents(events: TelemetryEvent[]) {
  if (events.length === 0) {
    return
  }

  const directory = path.dirname(TELEMETRY_LOG_PATH)
  await fs.mkdir(directory, { recursive: true })

  const payload = `${events.map(event => JSON.stringify(event)).join('\n')}\n`
  await fs.appendFile(TELEMETRY_LOG_PATH, payload, 'utf-8')
}
