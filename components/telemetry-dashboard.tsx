'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

import type { TelemetryStreamSummary, TelemetrySummary } from '@/lib/telemetry'

const LAMPORTS_FORMAT = new Intl.NumberFormat('en-US')
const USD_FORMAT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  hour12: false,
  timeZone: 'UTC',
})

const DEMO_VARIANTS = [
  { key: 'classic', label: 'Classic build-up', helper: 'Full possession ending in a goal' },
  { key: 'fast-break', label: 'Fast break', helper: 'Rapid three-pass counter' },
  { key: 'press-break', label: 'Press break', helper: 'High-pressure interception drill' },
  { key: 'live', label: 'Live Play ⚡', helper: 'Dynamic continuous game with random strategies' },
] as const

type DemoVariant = (typeof DEMO_VARIANTS)[number]['key']

type StreamKey = 'overall' | 'demo' | 'gameboard'

const STREAM_OPTIONS: Array<{ key: StreamKey; label: string; helper: string; accent: string }> = [
  {
    key: 'overall',
    label: 'Unified Telemetry',
    helper: 'Combined vantage across every emission channel.',
    accent: 'from-slate-600 via-slate-700 to-slate-600',
  },
  {
    key: 'demo',
    label: 'Hackathon Demo',
    helper: 'Scripted CLI showcase with deterministic storyboards.',
    accent: 'from-indigo-500 via-indigo-600 to-indigo-500',
  },
  {
    key: 'gameboard',
    label: 'Live Gameboard',
    helper: 'Continuous arena loop driven by the live-playmaker.',
    accent: 'from-emerald-500 via-emerald-600 to-emerald-500',
  },
] as const

type TimelineCategory = 'actions' | 'payments' | 'system' | 'sigil'

interface Props {
  initialSummary: TelemetrySummary
  demoModeEnabled: boolean
}

export function TelemetryDashboard({ initialSummary, demoModeEnabled }: Props) {
  const [summary, setSummary] = useState(initialSummary)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [liveUpdates, setLiveUpdates] = useState(true)
  const [isDemoRunning, setIsDemoRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionStatusFilter, setActionStatusFilter] = useState<'all' | 'success' | 'failure'>('all')
  const [timelineFilters, setTimelineFilters] = useState<{
    actions: boolean
    payments: boolean
    system: boolean
    sigil: boolean
  }>({
    actions: true,
    payments: true,
    system: true,
    sigil: true,
  })

  const eventSourceRef = useRef<EventSource | null>(null)

  const [activeStream, setActiveStream] = useState<StreamKey>(() => {
    if (initialSummary.streams.gameboard.totalEvents > 0) {
      return 'gameboard'
    }
    if (initialSummary.streams.demo.totalEvents > 0) {
      return 'demo'
    }
    return 'overall'
  })

  const streamSlices = useMemo<Record<StreamKey, TelemetryStreamSummary>>(() => {
    const overall: TelemetryStreamSummary = {
      totalEvents: summary.totalEvents,
      lastUpdated: summary.lastUpdated,
      eventCounts: summary.eventCounts,
      vendorSpend: summary.vendorSpend,
      recentActions: summary.recentActions,
      budget: summary.budget,
      taskStats: summary.taskStats,
      haltEvent: summary.haltEvent,
      timeline: summary.timeline,
      sigilPlay: summary.sigilPlay,
    }

    return {
      overall,
      demo: summary.streams.demo,
      gameboard: summary.streams.gameboard,
    }
  }, [summary])

  useEffect(() => {
    const current = streamSlices[activeStream]
    if (activeStream === 'overall' || current.totalEvents > 0) {
      return
    }

    if (streamSlices.gameboard.totalEvents > 0) {
      setActiveStream('gameboard')
      return
    }

    if (streamSlices.demo.totalEvents > 0) {
      setActiveStream('demo')
    }
  }, [activeStream, streamSlices])

  const activeSummary = streamSlices[activeStream]
  const streamMeta = useMemo(() => STREAM_OPTIONS.find(option => option.key === activeStream)!, [activeStream])

  const statusBadge = useMemo(() => {
    if (activeSummary.haltEvent) {
      return {
        label: 'Halted',
        className: 'bg-rose-500/20 text-rose-200 border border-rose-500/40',
        helper: activeSummary.haltEvent.details,
      }
    }

    if (activeSummary.totalEvents === 0) {
      return {
        label: 'Idle',
        className: 'bg-slate-500/20 text-slate-200 border border-slate-500/30',
        helper: `${streamMeta.label} has not emitted telemetry yet.`,
      }
    }

    return {
      label: 'Streaming',
      className: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40',
      helper: `Monitoring ${streamMeta.label.toLowerCase()} events in real time.`,
    }
  }, [activeSummary.haltEvent, activeSummary.totalEvents, streamMeta.label])

  const refreshSummary = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/telemetry/summary', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`Failed to fetch summary (${response.status})`)
      }
      const data = (await response.json()) as TelemetrySummary
      setSummary(data)
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error while refreshing')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const clearTelemetry = useCallback(async () => {
    setIsClearing(true)
    try {
      const response = await fetch('/api/telemetry/clear', { method: 'POST' })
      if (!response.ok) {
        throw new Error(`Failed to clear telemetry (${response.status})`)
      }
      setError(null)
      await refreshSummary()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error while clearing telemetry')
    } finally {
      setIsClearing(false)
    }
  }, [refreshSummary])

  const runDemoScenario = useCallback(
    async (variant: DemoVariant = 'classic') => {
      setIsDemoRunning(true)
      try {
        const response = await fetch('/api/telemetry/demo-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variant }),
        })
        if (!response.ok) {
          throw new Error(`Demo scenario failed (${response.status})`)
        }

        if (!liveUpdates) {
          await refreshSummary()
        }

        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to start the demo scenario')
      } finally {
        setIsDemoRunning(false)
      }
    },
    [liveUpdates, refreshSummary],
  )

  useEffect(() => {
    if (!liveUpdates) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    const source = new EventSource('/api/telemetry/stream')
    eventSourceRef.current = source

    source.onmessage = event => {
      try {
        const data = JSON.parse(event.data) as TelemetrySummary
        setSummary(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse live update')
      }
    }

    source.onerror = () => {
      setError('Live stream disconnected. Toggle live updates to reconnect.')
      source.close()
      eventSourceRef.current = null
      setLiveUpdates(false)
    }

    return () => {
      source.close()
      eventSourceRef.current = null
    }
  }, [liveUpdates])

  const hasEvents = activeSummary.totalEvents > 0

  const filteredActions = useMemo(() => {
    if (actionStatusFilter === 'all') {
      return activeSummary.recentActions
    }
    const shouldBeSuccess = actionStatusFilter === 'success'
    return activeSummary.recentActions.filter(action => action.success === shouldBeSuccess)
  }, [activeSummary.recentActions, actionStatusFilter])

  const filteredTimeline = useMemo(() => {
    return activeSummary.timeline.filter(event => timelineFilters[getTimelineCategory(event.type)])
  }, [activeSummary.timeline, timelineFilters])

  const maxVendorSpend = useMemo(() => {
    return activeSummary.vendorSpend.reduce((max, vendor) => Math.max(max, vendor.amountLamports), 0)
  }, [activeSummary.vendorSpend])

  const maxDuration = useMemo(() => {
    return filteredActions.reduce((max, action) => Math.max(max, action.durationMs), 0)
  }, [filteredActions])

  const toggleTimelineFilter = (key: TimelineCategory) => {
    setTimelineFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const primaryScenarioVariant: DemoVariant = activeStream === 'gameboard' ? 'live' : 'classic'
  const primaryScenarioLabel = activeStream === 'gameboard' ? 'Launch live rally' : 'Play sigil demo'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 md:px-10">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-10 shadow-2xl">
          <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                <span>Quantum Agent Gateway</span>
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Agent Telemetry Control Plane</h1>
                <p className="max-w-2xl text-base text-slate-300">
                  Compare the hackathon demo script against the live gameboard arena. Choose a stream below to focus the panels,
                  then fire new drills or watch the budget deplete in real time.
                </p>
                <p className="text-sm text-slate-400">
                  Currently spotlighting <span className="font-semibold text-slate-200">{streamMeta.label}</span> telemetry.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">View mode</p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {STREAM_OPTIONS.map(option => {
                    const slice = streamSlices[option.key]
                    const isActive = option.key === activeStream
                    const lastUpdate = slice.lastUpdated ? formatTimestamp(slice.lastUpdated) : 'No events yet'
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setActiveStream(option.key)}
                        className={`group relative overflow-hidden rounded-2xl border ${isActive ? 'border-emerald-400/60 ring-2 ring-emerald-400/30' : 'border-slate-800 hover:border-slate-700'} bg-slate-950/70 p-4 text-left transition`}
                      >
                        <span
                          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${option.accent} ${isActive ? 'opacity-25' : 'opacity-10'} mix-blend-overlay transition group-hover:opacity-20`}
                          aria-hidden="true"
                        />
                        <div className="relative flex h-full flex-col justify-between gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{option.label}</p>
                              <p className="mt-1 text-sm text-slate-300">{option.helper}</p>
                            </div>
                            {isActive ? (
                              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">Active</span>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-slate-200">
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Events</p>
                              <p className="mt-1 text-lg font-semibold text-slate-100">{LAMPORTS_FORMAT.format(slice.totalEvents)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Remaining</p>
                              <p className="mt-1 text-lg font-semibold text-slate-100">{LAMPORTS_FORMAT.format(slice.budget.remainingLamports)}</p>
                            </div>
                            <div className="col-span-2 text-[11px] text-slate-500">Last update: {lastUpdate}</div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={refreshSummary}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-60"
                  disabled={isRefreshing || isClearing}
                >
                  {isRefreshing ? 'Refreshing…' : 'Manual refresh'}
                </button>
                <button
                  type="button"
                  onClick={() => setLiveUpdates(value => !value)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${liveUpdates ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400' : 'bg-slate-900 text-slate-200 hover:bg-slate-800'}`}
                  disabled={isClearing}
                >
                  {liveUpdates ? 'Live updates: on' : 'Live updates: off'}
                </button>
                <button
                  type="button"
                  onClick={() => runDemoScenario(primaryScenarioVariant)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/30 disabled:pointer-events-none disabled:opacity-60"
                  disabled={isDemoRunning || isClearing}
                >
                  {isDemoRunning ? 'Running scenario…' : primaryScenarioLabel}
                </button>
                <button
                  type="button"
                  onClick={clearTelemetry}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/30 disabled:pointer-events-none disabled:opacity-60"
                  disabled={isClearing}
                >
                  {isClearing ? 'Clearing…' : 'Clear telemetry'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="uppercase tracking-wide text-slate-500">Action filter (stream)</span>
                <FilterToggle
                  label="All"
                  active={actionStatusFilter === 'all'}
                  onClick={() => setActionStatusFilter('all')}
                />
                <FilterToggle
                  label="Success"
                  active={actionStatusFilter === 'success'}
                  onClick={() => setActionStatusFilter('success')}
                />
                <FilterToggle
                  label="Failed"
                  active={actionStatusFilter === 'failure'}
                  onClick={() => setActionStatusFilter('failure')}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="uppercase tracking-wide text-slate-500">Timeline visibility</span>
                <FilterToggle
                  label="Actions"
                  active={timelineFilters.actions}
                  onClick={() => toggleTimelineFilter('actions')}
                />
                <FilterToggle
                  label="Payments"
                  active={timelineFilters.payments}
                  onClick={() => toggleTimelineFilter('payments')}
                />
                <FilterToggle
                  label="System"
                  active={timelineFilters.system}
                  onClick={() => toggleTimelineFilter('system')}
                />
                <FilterToggle label="Sigil" active={timelineFilters.sigil} onClick={() => toggleTimelineFilter('sigil')} />
              </div>
            </div>

            <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-4 py-1 text-sm font-medium ${statusBadge.className}`}>{statusBadge.label}</span>
                {demoModeEnabled ? <span className="text-[11px] font-semibold text-emerald-300">Demo bypass</span> : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Focused stream</p>
                <p className="mt-1 text-base font-semibold text-slate-100">{streamMeta.label}</p>
                <p className="text-xs text-slate-500">{streamMeta.helper}</p>
              </div>
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-3 text-sm text-slate-300">
                <p className="text-xs uppercase tracking-wide text-slate-500">Last update</p>
                <p className="mt-1 font-mono text-slate-200">
                  {activeSummary.lastUpdated ? formatTimestamp(activeSummary.lastUpdated) : 'No telemetry yet'}
                </p>
                <p className="mt-2 text-xs text-slate-500">{statusBadge.helper}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Remaining Lamports</p>
                  <p className="mt-1 font-semibold text-slate-100">{formatLamports(activeSummary.budget.remainingLamports)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Passes</p>
                  <p className="mt-1 font-semibold text-slate-100">{activeSummary.sigilPlay.totalPasses}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Shots</p>
                  <p className="mt-1 font-semibold text-slate-100">{activeSummary.sigilPlay.totalShots}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Goals</p>
                  <p className="mt-1 font-semibold text-slate-100">{activeSummary.sigilPlay.totalGoals}</p>
                </div>
              </div>
              {error ? <p className="text-xs text-rose-300">{error}</p> : null}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm text-slate-300">Generate fresh telemetry by running the CLI marketplace demo in your shell:</p>
            <pre className="mt-3 select-all overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200">
./examples/agent-to-agent-demo/scripts/run-demo.sh
            </pre>
            <p className="mt-3 text-xs text-slate-500">
              The agent writes structured events to <code className="font-mono text-slate-300">apps/agent-runner/logs/agent-telemetry.jsonl</code> which powers the panels below.
            </p>
          </div>
        </section>

        {!hasEvents ? (
          <section className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-100">No telemetry yet</h2>
            <p className="mt-3 text-sm text-slate-400">
              Run the demo script to let the autonomous buyer agent transact with the seller service. Once telemetry is emitted,
              this dashboard will visualise the payments, actions, and budget movements in real time.
            </p>
          </section>
        ) : (
          <>
            <SigilPitch
              stream={activeStream}
              sigil={activeSummary.sigilPlay}
              onRunScenario={runDemoScenario}
              isDemoRunning={isDemoRunning}
            />
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-lg font-semibold text-slate-100">Budget Status</h2>
                <p className="mt-2 text-sm text-slate-400">Lamport balance derived from the latest telemetry snapshot.</p>
                <div className="mt-6 space-y-4">
                  <BudgetMetric label="Initial" lamports={activeSummary.budget.initialLamports} usd={activeSummary.budget.initialUsd} />
                  <BudgetMetric
                    label="Spent"
                    lamports={activeSummary.budget.spentLamports}
                    usd={activeSummary.budget.spentUsd}
                    tone="text-rose-300"
                  />
                  <BudgetMetric
                    label="Remaining"
                    lamports={activeSummary.budget.remainingLamports}
                    usd={activeSummary.budget.remainingUsd}
                    tone="text-emerald-300"
                  />
                  <div className="mt-6">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Utilisation</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, utilisation(activeSummary.budget))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-lg font-semibold text-slate-100">Task Throughput</h2>
                <p className="mt-2 text-sm text-slate-400">Action lifecycle reconstructed from the telemetry stream.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <TaskStatCard label="Planned" value={activeSummary.taskStats.planned} helper="Distinct task IDs" />
                  <TaskStatCard
                    label="Succeeded"
                    value={activeSummary.taskStats.succeeded}
                    helper="Action completions"
                    tone="text-emerald-300"
                  />
                  <TaskStatCard
                    label="Failed"
                    value={activeSummary.taskStats.failed}
                    helper="Failures recorded"
                    tone="text-rose-300"
                  />
                </div>
                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-400">
                  <p className="font-medium text-slate-200">Event mix</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {activeSummary.eventCounts.slice(0, 6).map(item => (
                      <div key={item.type} className="flex items-center justify-between rounded-lg bg-slate-900/70 px-3 py-2">
                        <span className="text-[11px] uppercase tracking-wide text-slate-400">{item.type}</span>
                        <span className="text-sm font-semibold text-slate-100">{LAMPORTS_FORMAT.format(item.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-100">Recent Actions</h2>
                  <span className="text-xs text-slate-500">Filtered view</span>
                </div>
                {filteredActions.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-400">No actions matching the current filter.</p>
                ) : (
                  <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="py-2 pr-4">Action</th>
                          <th className="py-2 pr-4">Result</th>
                          <th className="py-2 pr-4">Cost</th>
                          <th className="py-2 pr-4">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {filteredActions.map(action => (
                          <tr key={action.correlationId} className="align-top">
                            <td className="py-3 pr-4">
                              <p className="font-medium text-slate-100">{action.actionType}</p>
                              <p className="text-xs text-slate-500">{formatTimestamp(action.timestamp)}</p>
                              {action.taskId ? <p className="mt-1 text-xs text-slate-500">task: {action.taskId}</p> : null}
                              <span className={`mt-2 inline-flex text-xs font-semibold ${action.success ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {action.success ? 'Success' : 'Failed'}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-slate-300">{action.outputPreview}</td>
                            <td className="py-3 pr-4 font-medium text-slate-100">
                              <div>{formatLamports(action.costLamports)}</div>
                              <div className="text-xs text-slate-500">{formatUsd(action.costUsd)}</div>
                            </td>
                            <td className="py-3 pr-4 text-slate-300">{action.durationMs} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-lg font-semibold text-slate-100">Action Duration</h2>
                <p className="mt-2 text-sm text-slate-400">Visualising task runtime in milliseconds (filtered set).</p>
                {filteredActions.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-400">No data available.</p>
                ) : (
                  <ul className="mt-6 space-y-3">
                    {filteredActions.map(action => {
                      const ratio = maxDuration > 0 ? Math.max((action.durationMs / maxDuration) * 100, 6) : 0
                      return (
                        <li key={`duration-${action.correlationId}`} className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{action.actionType}</span>
                            <span>{action.durationMs} ms</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-800">
                            <div
                              className={`h-2 rounded-full ${action.success ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-100">Vendor Spend</h2>
                  <span className="text-xs text-slate-500">Aggregated from payment.settled events</span>
                </div>
                {activeSummary.vendorSpend.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-400">No settlements recorded.</p>
                ) : (
                  <ul className="mt-6 space-y-4">
                    {activeSummary.vendorSpend.map(vendor => {
                      const ratio =
                        maxVendorSpend > 0 ? Math.max((vendor.amountLamports / maxVendorSpend) * 100, 6) : 0
                      return (
                        <li key={vendor.vendor} className="space-y-2">
                          <div className="flex items-center justify-between text-sm text-slate-300">
                            <span>{vendor.vendor}</span>
                            <span>{formatLamports(vendor.amountLamports)}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-800">
                            <div
                              className="h-2 rounded-full bg-indigo-500"
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500">{formatUsd(vendor.amountUsd)} spent</p>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-100">Event Timeline</h2>
                  <span className="text-xs text-slate-500">Latest 20 events (filtered)</span>
                </div>
                {filteredTimeline.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-400">No events for the selected filters.</p>
                ) : (
                  <ul className="mt-6 space-y-4">
                    {filteredTimeline.map(event => (
                      <li key={event.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{event.type}</span>
                          <span className="text-xs text-slate-500">{formatTimestamp(event.timestamp)}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-200">{event.summary}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-lg font-semibold text-slate-100">Protected Content Demo</h2>
                <p className="mt-2 text-sm text-slate-400">
                  The Next.js app still hosts a canonical X402 paywall experience. Use these links to trigger the middleware and
                  Coinbase Pay flow.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Demo bypass: append <code className="rounded bg-slate-900/70 px-1 py-[1px] text-[11px] text-slate-200">?demo=1</code>{' '}
                  to any protected route (or set <code className="rounded bg-slate-900/70 px-1 py-[1px] text-[11px] text-slate-200">NEXT_PUBLIC_X402_DEMO_MODE=skip</code>)
                  to inspect the content without completing a real payment.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/content/cheap"
                    className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                  >
                    Access Cheap Content 🪣
                  </Link>
                  <Link
                    href="/content/expensive"
                    className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                  >
                    Access Expensive Content 💰
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-lg font-semibold text-slate-100">Artifacts</h2>
                <p className="mt-2 text-sm text-slate-400">Quick links into the workspace for judges and reviewers.</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  <li className="flex flex-col gap-1">
                    <Link className="text-emerald-300 hover:text-emerald-200" href="/docs/architecture" target="_blank">
                      Architecture overview (Markdown)
                    </Link>
                  </li>
                  <li className="flex flex-col gap-1">
                    <Link className="text-emerald-300 hover:text-emerald-200" href="/docs/storyboard" target="_blank">
                      Demo storyboard (Markdown)
                    </Link>
                  </li>
                  <li className="flex flex-col gap-1">
                    <Link className="text-emerald-300 hover:text-emerald-200" href="/api/telemetry/log" target="_blank">
                      Raw telemetry (JSONL)
                    </Link>
                  </li>
                </ul>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

type SigilSummary = TelemetryStreamSummary['sigilPlay']
type SigilParticipant = SigilSummary['participants'][number]
type SigilPass = SigilSummary['passes'][number]

interface SigilLayoutPoint {
  participant: SigilParticipant
  x: number
  y: number
}

function stableHash(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0
  }
  return hash
}

function stableNoise(seed: string, range: number) {
  if (range <= 0) {
    return 0
  }
  const hash = stableHash(seed)
  return hash % range
}

function SigilPitch({
  stream,
  sigil,
  isDemoRunning,
  onRunScenario,
}: {
  stream: StreamKey
  sigil: SigilSummary
  isDemoRunning: boolean
  onRunScenario: (variant: DemoVariant) => Promise<void>
}) {
  const recentPasses = useMemo(() => sigil.passes.slice(-6), [sigil.passes])
  const layout = useMemo(() => computeSigilLayout(sigil.participants), [sigil.participants])
  const activeSequence = sigil.passes.at(-1)?.sequence ?? null

  const heading = stream === 'gameboard' ? 'Gameboard Live Arena' : 'Sigil Passing Network'
  const idleCopy = stream === 'gameboard'
    ? 'Trigger the live rally to watch the arena generate unscripted sigil exchanges until the wallet exhausts.'
    : 'Kick off a drill to watch a single sigil travel through the mesh. Each pass is logged for replay and analysis.'
  const idleHelper = stream === 'gameboard'
    ? 'Live mode keeps the arena active without touching the CLI.'
    : 'Demo mode spawns synthetic telemetry without needing the CLI.'
  const description = stream === 'gameboard'
    ? 'Follow the live arena as agents improvise possessions while the treasury drains.'
    : 'Track scripted drills across the mesh as agents advance, vendors clear, and the hub referees the flow.'
  const buttonHelper = stream === 'gameboard'
    ? 'Launch additional live sequences without leaving the browser.'
    : 'Buttons enqueue synthetic telemetry events.'
  const runLabel = stream === 'gameboard' ? 'Kick off a rally:' : 'Run a drill:'

  const availableVariants = useMemo(() => {
    if (stream === 'gameboard') {
      return DEMO_VARIANTS.filter(variant => variant.key === 'live')
    }
    if (stream === 'demo') {
      return DEMO_VARIANTS.filter(variant => variant.key !== 'live')
    }
    return DEMO_VARIANTS
  }, [stream])

  const variantButtons = (
    <div className="flex flex-wrap gap-2">
      {availableVariants.map(variant => (
        <button
          key={variant.key}
          type="button"
          onClick={() => onRunScenario(variant.key)}
          className="inline-flex items-center rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-200 transition hover:border-indigo-400 hover:bg-indigo-500/20 disabled:opacity-60"
          disabled={isDemoRunning}
          title={variant.helper}
        >
          {isDemoRunning ? 'Running…' : variant.label}
        </button>
      ))}
    </div>
  )

  if (!sigil.active) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{heading}</h2>
            <p className="mt-2 text-sm text-slate-400">{idleCopy}</p>
          </div>
          <div className="text-xs text-slate-500">{idleHelper}</div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="uppercase tracking-wide text-slate-500">{runLabel}</span>
          {variantButtons}
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">{heading}</h2>
          <p className="text-sm text-slate-400">
            {description}{' '}
            <span className="font-mono text-slate-200">token {sigil.tokenId ?? '—'}</span>.
          </p>
          {sigil.lastIntent ? (
            <p className="text-xs text-slate-500">Last intent: {sigil.lastIntent}</p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-300 md:text-right">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Current holder</p>
            <p className="mt-1 font-semibold text-slate-100">{sigil.currentHolder?.label ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Passes</p>
            <p className="mt-1 font-semibold text-slate-100">{sigil.totalPasses}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Shots</p>
            <p className={`mt-1 font-semibold ${sigil.totalShots > 0 ? 'text-sky-300' : 'text-slate-200'}`}>{sigil.totalShots}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Goals</p>
            <p className={`mt-1 font-semibold ${sigil.totalGoals > 0 ? 'text-amber-300' : 'text-slate-200'}`}>{sigil.totalGoals}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr,1fr]">
        <SigilPitchField
          layout={layout}
          passes={recentPasses}
          currentHolder={sigil.currentHolder}
          activeSequence={activeSequence}
        />
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-wide text-slate-500">Recent sequence</p>
          {recentPasses.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Pass history will populate as the drill runs.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {[...recentPasses].reverse().map(pass => (
                <li key={pass.sequence} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono text-slate-400">#{String(pass.sequence).padStart(2, '0')}</span>
                    <span>{formatTimestamp(pass.timestamp)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-100">
                    {pass.from ? `${pass.from.label} → ${pass.to.label}` : `Kickoff → ${pass.to.label}`}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-indigo-300">{pass.intent}</p>
                  {pass.narrative ? <p className="mt-2 text-xs text-slate-400">{pass.narrative}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Possession statistics and sparklines */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sigil.participants
          .filter(participant => participant.role === 'agent')
          .map(agent => {
            const touchCount = sigil.passes.filter(pass => pass.to.id === agent.id || pass.from?.id === agent.id).length
            const possessionPct = sigil.totalPasses > 0 ? (touchCount / sigil.totalPasses) * 100 : 0
            const recentTouches = sigil.passes
              .filter(pass => pass.to.id === agent.id || pass.from?.id === agent.id)
              .slice(-10)
              .map(pass => pass.sequence)
            
            return (
              <div key={agent.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{agent.label}</p>
                  <div
                    className={`h-2 w-2 rounded-full ${sigil.currentHolder?.id === agent.id ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`}
                  />
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <p className="text-2xl font-bold text-slate-100">{Math.round(possessionPct)}%</p>
                  <p className="mb-1 text-xs text-slate-500">possession</p>
                </div>
                <div className="mt-3">
                  <div className="flex items-end justify-between gap-px">
                    {recentTouches.map((sequence, index) => {
                      const height = 8 + stableNoise(`${agent.id}-${sequence}-${index}`, 16)
                      return (
                        <div
                          key={`${agent.id}-${sequence}-${index}`}
                          className="flex-1 rounded-t bg-indigo-500/60"
                          style={{ height: `${height}px` }}
                        />
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">{touchCount} touches</p>
                </div>
              </div>
            )
          })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="uppercase tracking-wide text-slate-500">{runLabel}</span>
        {variantButtons}
        <span className="text-[11px] text-slate-500">{buttonHelper}</span>
        <a
          href="/api/telemetry/commentary?format=text"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
        >
          📝 Get Commentary Script
        </a>
      </div>
    </section>
  )
}

function SigilPitchField({
  layout,
  passes,
  currentHolder,
  activeSequence,
}: {
  layout: Record<string, SigilLayoutPoint>
  passes: SigilPass[]
  currentHolder: SigilParticipant | null
  activeSequence: number | null
}) {
  const nodes = Object.values(layout)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <svg viewBox="0 0 100 60" className="h-64 w-full">
        <rect x="1" y="1" width="98" height="58" rx="8" fill="none" stroke="#1f2a40" strokeWidth="1.2" />
        <line x1="50" y1="1" x2="50" y2="59" stroke="#1f2a40" strokeWidth="0.7" strokeDasharray="2.5 3" />
        <circle cx="50" cy="30" r="9" stroke="#1f2a40" strokeWidth="0.7" fill="none" strokeDasharray="3 2" />

        {passes.map((pass, index) => {
          const fromPoint = pass.from ? layout[pass.from.id] : undefined
          const toPoint = layout[pass.to.id]
          if (!toPoint) {
            return null
          }

          const startX = fromPoint ? fromPoint.x : 50
          const startY = fromPoint ? fromPoint.y : 30
          const color = getPassColor(pass)
          const emphasis = pass.sequence === activeSequence
          const opacity = 0.35 + (index / Math.max(passes.length, 1)) * 0.45

          return (
            <line
              key={`pass-${pass.sequence}`}
              x1={startX}
              y1={startY}
              x2={toPoint.x}
              y2={toPoint.y}
              stroke={color}
              strokeWidth={emphasis ? 1.8 : 1.1}
              strokeOpacity={opacity}
              strokeLinecap="round"
            />
          )
        })}

        {nodes.map(node => {
          const isHolder = currentHolder?.id === node.participant.id
          return (
            <g key={node.participant.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={isHolder ? 3.8 : 3}
                fill={roleColor(node.participant.role)}
                stroke={isHolder ? '#fde68a' : '#0f172a'}
                strokeWidth={isHolder ? 1.4 : 1}
              />
              <text
                x={node.x}
                y={node.y - (isHolder ? 6 : 5)}
                textAnchor="middle"
                fontSize="3"
                fill="#94a3b8"
              >
                {node.participant.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function computeSigilLayout(participants: SigilParticipant[]) {
  if (participants.length === 0) {
    return {} as Record<string, SigilLayoutPoint>
  }

  const sorted = [...participants].sort((a, b) => {
    const roleScore = layoutRolePriority(a.role) - layoutRolePriority(b.role)
    if (roleScore !== 0) {
      return roleScore
    }
    return a.label.localeCompare(b.label)
  })

  const result: Record<string, SigilLayoutPoint> = {}
  const count = sorted.length

  sorted.forEach((participant, index) => {
    const angle = (index / count) * Math.PI * 2
    const radius = roleRadius(participant.role)
    const x = 50 + radius * Math.cos(angle)
    const y = 30 + radius * Math.sin(angle)
    result[participant.id] = { participant, x, y }
  })

  return result
}

function layoutRolePriority(role: SigilParticipant['role']) {
  switch (role) {
    case 'hub':
      return 1
    case 'agent':
      return 2
    case 'vendor':
      return 3
    case 'goal':
      return 4
    case 'observer':
      return 5
    default:
      return 6
  }
}

function roleRadius(role: SigilParticipant['role']) {
  switch (role) {
    case 'hub':
      return 6
    case 'agent':
      return 22
    case 'vendor':
      return 27
    case 'goal':
      return 32
    case 'observer':
      return 36
    default:
      return 24
  }
}

function roleColor(role: SigilParticipant['role']) {
  switch (role) {
    case 'agent':
      return '#34d399'
    case 'vendor':
      return '#60a5fa'
    case 'hub':
      return '#fbbf24'
    case 'goal':
      return '#f97316'
    case 'observer':
      return '#c084fc'
    default:
      return '#94a3b8'
  }
}

function getPassColor(pass: SigilPass) {
  const intent = pass.intent.toLowerCase()
  if (intent.includes('goal')) {
    return '#f97316'
  }
  if (intent.includes('shot')) {
    return '#38bdf8'
  }
  if (intent.includes('exchange')) {
    return '#a855f7'
  }
  if (intent.includes('return')) {
    return '#facc15'
  }
  return '#6366f1'
}

function formatLamports(value: number) {
  return `${LAMPORTS_FORMAT.format(Math.round(value))} lamports`
}

function formatUsd(value: number) {
  return USD_FORMAT.format(value)
}

function formatTimestamp(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return `${TIMESTAMP_FORMAT.format(date)} UTC`
}

function utilisation(budget: { spentLamports: number; initialLamports: number }) {
  if (!budget.initialLamports) {
    return 0
  }
  return (budget.spentLamports / budget.initialLamports) * 100
}

function getTimelineCategory(type: TelemetrySummary['timeline'][number]['type']): TimelineCategory {
  if (type.startsWith('action.')) {
    return 'actions'
  }
  if (type.startsWith('payment.')) {
    return 'payments'
  }
  if (type.startsWith('sigil.')) {
    return 'sigil'
  }
  return 'system'
}

function BudgetMetric({
  label,
  lamports,
  usd,
  tone = 'text-slate-200',
}: {
  label: string
  lamports: number
  usd: number
  tone?: string
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${tone}`}>{formatLamports(lamports)}</p>
      <p className="text-xs text-slate-500">{formatUsd(usd)}</p>
    </div>
  )
}

function TaskStatCard({
  label,
  value,
  helper,
  tone = 'text-slate-200',
}: {
  label: string
  value: number
  helper: string
  tone?: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{LAMPORTS_FORMAT.format(value)}</p>
      <p className="text-xs text-slate-500">{helper}</p>
    </div>
  )
}

function FilterToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : 'border-slate-700 bg-slate-900/70 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
    >
      {label}
    </button>
  )
}
