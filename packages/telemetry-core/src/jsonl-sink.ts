/**
 * JSONL telemetry sink - writes events to JSONL file
 */

import { TelemetryEvent, TelemetrySink } from './types'
import { writeFile, appendFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { dirname } from 'path'

export class JSONLSink implements TelemetrySink {
  private filePath: string
  private buffer: TelemetryEvent[] = []
  private bufferSize: number

  constructor(filePath: string, bufferSize: number = 10) {
    this.filePath = filePath
    this.bufferSize = bufferSize
  }

  async emit(event: TelemetryEvent): Promise<void> {
    this.buffer.push(event)
    
    if (this.buffer.length >= this.bufferSize) {
      await this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    // Ensure directory exists
    const dir = dirname(this.filePath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    const lines = this.buffer.map(event => JSON.stringify(event)).join('\n') + '\n'
    
    if (!existsSync(this.filePath)) {
      await writeFile(this.filePath, lines)
    } else {
      await appendFile(this.filePath, lines)
    }

    this.buffer = []
  }

  async close(): Promise<void> {
    await this.flush()
  }
}
