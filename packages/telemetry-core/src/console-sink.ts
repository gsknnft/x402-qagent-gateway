/**
 * Console telemetry sink - outputs events to console
 */

import { TelemetryEvent, TelemetrySink } from './types'

export class ConsoleSink implements TelemetrySink {
  private colorize: boolean

  constructor(colorize: boolean = true) {
    this.colorize = colorize
  }

  async emit(event: TelemetryEvent): Promise<void> {
    const timestamp = new Date(event.timestamp).toISOString()
    const prefix = this.colorize ? this.getColorPrefix(event.type) : ''
    const suffix = this.colorize ? '\x1b[0m' : ''
    
    console.log(`${prefix}[${timestamp}] ${event.type}${suffix}`, JSON.stringify(event.payload, null, 2))
  }

  async flush(): Promise<void> {
    // Console writes are immediate, nothing to flush
  }

  async close(): Promise<void> {
    // Nothing to close for console
  }

  private getColorPrefix(type: string): string {
    if (type.startsWith('payment.')) return '\x1b[32m' // Green
    if (type.startsWith('action.')) return '\x1b[36m' // Cyan
    if (type.startsWith('budget.')) return '\x1b[33m' // Yellow
    if (type.startsWith('agent.halted')) return '\x1b[31m' // Red
    return '\x1b[37m' // White
  }
}
