/**
 * Helper utilities for reading agent telemetry emitted by the CLI demo.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import type {
  ActionCompletedEvent,
  ActionStartedEvent,
  AgentHaltedEvent,
  BudgetDeltaEvent,
  PaymentSettledEvent,
  TelemetryEvent,
} from '../packages/telemetry-core/src/types'

const LOG_PATH = path.join(process.cwd(), 'apps', 'agent-runner', 'logs', 'agent-telemetry.jsonl')
const DEFAULT_BUDGET_LAMPORTS = Number(process.env.NEXT_PUBLIC_AGENT_BUDGET_LAMPORTS ?? '1000000')
const SOL_PRICE_USD = Number(process.env.NEXT_PUBLIC_SOL_PRICE_USD ?? '150')

export interface TelemetrySummary {
  generatedAt: string
  totalEvents: number
  lastUpdated: string | null
  eventCounts: Array<{ type: TelemetryEvent['type']; count: number }>
  vendorSpend: Array<{ vendor: string; amountLamports: number; amountUsd: number }>
  recentActions: Array<{
    timestamp: string
    actionType: string
    success: boolean
    costLamports: number
    costUsd: number
    durationMs: number
    outputPreview: string
    correlationId: string
    taskId?: string
  }>
  budget: {
    initialLamports: number
    spentLamports: number
    remainingLamports: number
    initialUsd: number
    spentUsd: number
    remainingUsd: number
  }
  taskStats: {
    planned: number
    startedEvents: number
    succeeded: number
    failed: number
  }
  haltEvent: {
    timestamp: string
    reason: string
    details: string
  } | null
  timeline: Array<{
    id: string
    timestamp: string
    type: TelemetryEvent['type']
    summary: string
  }>
}

export async function loadTelemetryEvents(limit = 400): Promise<TelemetryEvent[]> {
  try {
    const raw = await fs.readFile(LOG_PATH, 'utf-8')
    const lines = raw
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)

    const slice = limit > 0 ? lines.slice(-limit) : lines
    const events: TelemetryEvent[] = []

    for (const line of slice) {
      try {
        const parsed = JSON.parse(line) as TelemetryEvent
        if (parsed && typeof parsed.type === 'string') {
          events.push(parsed)
        }
      } catch {
        // Ignore malformed lines
      }
    }

    return events
  } catch (error: unknown) {
    if (isEnoent(error)) {
      return []
    }

    throw error
  }
}

export async function getTelemetrySummary(limit = 400): Promise<TelemetrySummary> {
  const [events, stats] = await Promise.all([loadTelemetryEvents(limit), safeStat(LOG_PATH)])

  const eventCounts = tallyEventCounts(events)
  const actionCompletedEvents = events.filter(isActionCompletedEvent)
  const actionStartedEvents = events.filter(isActionStartedEvent)
  const vendorSpend = buildVendorSpend(events)
  const budget = resolveBudgetSnapshot(events, actionCompletedEvents)
  const haltEvent = findLatestHalt(events)
  const timeline = buildTimeline(events)
  const recentActions = summariseRecentActions(actionCompletedEvents)
  const taskStats = summariseTaskStats(actionStartedEvents, actionCompletedEvents)

  return {
    generatedAt: new Date().toISOString(),
    totalEvents: events.length,
    lastUpdated: stats?.mtime?.toISOString() ?? null,
    eventCounts,
    vendorSpend,
    recentActions,
    budget,
    taskStats,
    haltEvent,
    timeline,
  }
}

function tallyEventCounts(events: TelemetryEvent[]) {
  const counts = new Map<TelemetryEvent['type'], number>()
  for (const event of events) {
    counts.set(event.type, (counts.get(event.type) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

function buildVendorSpend(events: TelemetryEvent[]) {
  const spend = new Map<string, number>()

  for (const event of events) {
    if (isPaymentSettledEvent(event)) {
      const vendor = event.payload.receipt.vendor
      spend.set(vendor, (spend.get(vendor) ?? 0) + event.payload.receipt.amount)
    }
  }

  return Array.from(spend.entries())
    .map(([vendor, amountLamports]) => ({
      vendor,
      amountLamports,
      amountUsd: lamportsToUsd(amountLamports),
    }))
    .sort((a, b) => b.amountLamports - a.amountLamports)
}

function summariseRecentActions(events: ActionCompletedEvent[]) {
  return [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6)
    .map(event => ({
      timestamp: event.timestamp,
      actionType: event.payload.actionType,
      success: event.payload.success,
      costLamports: event.payload.actualCost,
      costUsd: lamportsToUsd(event.payload.actualCost),
      durationMs: event.payload.duration,
      outputPreview: buildOutputPreview(event.payload.output),
      correlationId: event.correlationId,
      taskId: event.taskId,
    }))
}

function summariseTaskStats(
  startedEvents: ActionStartedEvent[],
  completedEvents: ActionCompletedEvent[],
) {
  const uniqueTasks = new Set<string>()
  for (const event of startedEvents) {
    if (event.taskId) {
      uniqueTasks.add(event.taskId)
    }
  }

  const succeeded = completedEvents.filter(event => event.payload.success).length
  const failed = completedEvents.length - succeeded

  return {
    planned: uniqueTasks.size || startedEvents.length,
    startedEvents: startedEvents.length,
    succeeded,
    failed,
  }
}

function resolveBudgetSnapshot(
  events: TelemetryEvent[],
  completedEvents: ActionCompletedEvent[],
) {
  const budgetEvents = events.filter(isBudgetDeltaEvent)

  if (budgetEvents.length > 0) {
    const latest = budgetEvents.at(-1)!
    const { remaining, spent } = latest.payload
    const initial = remaining + spent

    return buildBudget(initial, spent, remaining)
  }

  const spent = completedEvents
    .filter(event => event.payload.success)
    .reduce((acc, event) => acc + event.payload.actualCost, 0)

  const remaining = Math.max(DEFAULT_BUDGET_LAMPORTS - spent, 0)

  return buildBudget(DEFAULT_BUDGET_LAMPORTS, spent, remaining)
}

function buildBudget(initial: number, spent: number, remaining: number) {
  return {
    initialLamports: initial,
    spentLamports: spent,
    remainingLamports: remaining,
    initialUsd: lamportsToUsd(initial),
    spentUsd: lamportsToUsd(spent),
    remainingUsd: lamportsToUsd(remaining),
  }
}

function buildTimeline(events: TelemetryEvent[]) {
  return [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)
    .map(event => ({
      id: `${event.timestamp}-${event.correlationId}-${event.type}`,
      timestamp: event.timestamp,
      type: event.type,
      summary: describeEvent(event),
    }))
}

function findLatestHalt(events: TelemetryEvent[]) {
  const halted = [...events].reverse().find(isAgentHaltedEvent)
  if (!halted) {
    return null
  }

  return {
    timestamp: halted.timestamp,
    reason: halted.payload.reason,
    details: halted.payload.details,
  }
}

function describeEvent(event: TelemetryEvent) {
  switch (event.type) {
    case 'action.started':
      return `Action "${event.payload.actionType}" started`
    case 'action.completed':
      return `${event.payload.success ? '✅' : '❌'} ${event.payload.actionType} completed in ${event.payload.duration}ms`
    case 'payment.initiated':
      return `Payment initiated to ${event.payload.vendor} (${event.payload.amount.toLocaleString()} lamports)`
    case 'payment.settled':
      return `Payment settled with signature ${event.payload.receipt.signature}`
    case 'payment.failed':
      return `Payment failed: ${event.payload.error}`
    case 'budget.delta':
      return `Budget updated → remaining ${event.payload.remaining.toLocaleString()} lamports`
    case 'agent.halted':
      return `Agent halted (${event.payload.reason})`
    case 'sla.outcome':
      return `SLA outcome: ${event.payload.success ? 'success' : 'failure'} in ${event.payload.actualLatency}ms`
    default:
      return 'Unknown event'
  }
}

function buildOutputPreview(output: unknown) {
  if (output == null) {
    return '—'
  }

  if (typeof output === 'string') {
    return truncate(output, 120)
  }

  if (typeof output === 'number' || typeof output === 'boolean') {
    return String(output)
  }

  if (typeof output === 'object') {
    if ('result' in (output as Record<string, unknown>)) {
      const value = (output as Record<string, unknown>).result
      return truncate(safeStringify(value), 120)
    }

    return truncate(safeStringify(output), 120)
  }

  return '—'
}

function truncate(value: string, max = 80) {
  if (value.length <= max) {
    return value
  }
  return `${value.slice(0, max - 1)}…`
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return '[unserializable]'
  }
}

function lamportsToUsd(lamports: number) {
  const sol = lamports / 1e9
  return Number((sol * SOL_PRICE_USD).toFixed(4))
}

function isActionCompletedEvent(event: TelemetryEvent): event is ActionCompletedEvent {
  return event.type === 'action.completed'
}

function isActionStartedEvent(event: TelemetryEvent): event is ActionStartedEvent {
  return event.type === 'action.started'
}

function isPaymentSettledEvent(event: TelemetryEvent): event is PaymentSettledEvent {
  return event.type === 'payment.settled'
}

function isBudgetDeltaEvent(event: TelemetryEvent): event is BudgetDeltaEvent {
  return event.type === 'budget.delta'
}

function isAgentHaltedEvent(event: TelemetryEvent): event is AgentHaltedEvent {
  return event.type === 'agent.halted'
}

async function safeStat(filePath: string) {
  try {
    return await fs.stat(filePath)
  } catch (error: unknown) {
    if (isEnoent(error)) {
      return null
    }
    throw error
  }
}

function isEnoent(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT')
}
