import Link from 'next/link'

import { getTelemetrySummary } from '@/lib/telemetry'

const LAMPORTS_FORMAT = new Intl.NumberFormat('en-US')
const USD_FORMAT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  hour12: false,
})

export default async function Home() {
  const summary = await getTelemetrySummary()
  const hasEvents = summary.totalEvents > 0
  const statusBadge = summary.haltEvent
    ? {
        label: 'Halted',
        className: 'bg-rose-500/20 text-rose-200 border border-rose-500/40',
        helper: summary.haltEvent.details,
      }
    : {
        label: 'Ready',
        className: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40',
        helper: 'Monitoring telemetry from the latest agent run.',
      }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 md:px-10">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-10 shadow-2xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                <span>Quantum Agent Gateway</span>
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Agent Telemetry Control Plane</h1>
                <p className="max-w-2xl text-base text-slate-300">
                  Inspect autonomous buyer activity, budget utilisation, and X402 payment lineage. This dashboard reads the
                  JSONL telemetry emitted by the CLI demo and renders a verifiable execution trace.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <span className={`rounded-full px-4 py-1 text-sm font-medium ${statusBadge.className}`}>{statusBadge.label}</span>
              <p className="text-xs text-slate-400">
                Last log update:{' '}
                {summary.lastUpdated ? formatTimestamp(summary.lastUpdated) : 'No telemetry captured yet'}
              </p>
              <p className="text-xs text-slate-500 max-w-[260px] text-right">{statusBadge.helper}</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm text-slate-300">
              Generate fresh telemetry by running the CLI marketplace demo in your shell:
            </p>
            <pre className="mt-3 select-all overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200">
              ./examples/agent-to-agent-demo/scripts/run-demo.sh
            </pre>
            <p className="mt-3 text-xs text-slate-500">
              The agent writes structured events to <code className="font-mono text-slate-300">apps/agent-runner/logs/agent-telemetry.jsonl</code>{' '}
              which powers the live panels below.
            </p>
          </div>
        </section>

        {!hasEvents ? (
          <section className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-100">No telemetry yet</h2>
            <p className="mt-3 text-sm text-slate-400">
              Run the demo script to let the autonomous buyer agent transact with the seller service. As soon as telemetry is
              emitted, this dashboard will visualise the payments, actions, and budget movements in real time.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-lg font-semibold text-slate-100">Budget Status</h2>
                <p className="mt-2 text-sm text-slate-400">Lamport balance derived from the latest telemetry snapshot.</p>
                <div className="mt-6 space-y-4">
                  <BudgetMetric label="Initial" lamports={summary.budget.initialLamports} usd={summary.budget.initialUsd} />
                  <BudgetMetric label="Spent" lamports={summary.budget.spentLamports} usd={summary.budget.spentUsd} tone="text-rose-300" />
                  <BudgetMetric label="Remaining" lamports={summary.budget.remainingLamports} usd={summary.budget.remainingUsd} tone="text-emerald-300" />
                  <div className="mt-6">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Utilisation</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, utilisation(summary.budget))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-lg font-semibold text-slate-100">Task Throughput</h2>
                <p className="mt-2 text-sm text-slate-400">Action lifecycle reconstructed from the telemetry stream.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <TaskStatCard label="Planned" value={summary.taskStats.planned} helper="Distinct task IDs" />
                  <TaskStatCard label="Succeeded" value={summary.taskStats.succeeded} helper="Action completions" tone="text-emerald-300" />
                  <TaskStatCard label="Failed" value={summary.taskStats.failed} helper="Failures recorded" tone="text-rose-300" />
                </div>
                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-400">
                  <p className="font-medium text-slate-200">Event mix</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {summary.eventCounts.slice(0, 6).map(item => (
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
                  <span className="text-xs text-slate-500">Most recent first</span>
                </div>
                {summary.recentActions.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-400">No completed actions reported yet.</p>
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
                        {summary.recentActions.map(action => (
                          <tr key={action.correlationId} className="align-top">
                            <td className="py-3 pr-4">
                              <p className="font-medium text-slate-100">{action.actionType}</p>
                              <p className="text-xs text-slate-500">{formatTimestamp(action.timestamp)}</p>
                              {action.taskId ? (
                                <p className="mt-1 text-xs text-slate-500">task: {action.taskId}</p>
                              ) : null}
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
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-100">Vendor Spend</h2>
                  <span className="text-xs text-slate-500">Aggregated from payment.settled events</span>
                </div>
                {summary.vendorSpend.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-400">No settlements recorded.</p>
                ) : (
                  <ul className="mt-6 space-y-3">
                    {summary.vendorSpend.map(vendor => (
                      <li key={vendor.vendor} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{vendor.vendor}</p>
                          <p className="text-xs text-slate-500">{formatUsd(vendor.amountUsd)} spent</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-100">{formatLamports(vendor.amountLamports)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100">Event Timeline</h2>
                <span className="text-xs text-slate-500">Latest 20 telemetry events</span>
              </div>
              <ul className="mt-6 space-y-4">
                {summary.timeline.map(event => (
                  <li key={event.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{event.type}</span>
                      <span className="text-xs text-slate-500">{formatTimestamp(event.timestamp)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-200">{event.summary}</p>
                  </li>
                ))}
              </ul>
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
                    <span className="text-slate-400">Architecture overview</span>
                    <code className="inline-flex w-fit rounded bg-slate-900/80 px-2 py-1 text-xs text-slate-200">ARCHITECTURE.md</code>
                  </li>
                  <li className="flex flex-col gap-1">
                    <span className="text-slate-400">Demo storyboard</span>
                    <code className="inline-flex w-fit rounded bg-slate-900/80 px-2 py-1 text-xs text-slate-200">DEMO_STORYBOARD.md</code>
                  </li>
                  <li className="flex flex-col gap-1">
                    <span className="text-slate-400">Telemetry log</span>
                    <code className="inline-flex w-fit rounded bg-slate-900/80 px-2 py-1 text-xs text-slate-200">apps/agent-runner/logs/agent-telemetry.jsonl</code>
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

function utilisation(budget: {
  spentLamports: number
  initialLamports: number
}) {
  if (!budget.initialLamports) {
    return 0
  }
  return (budget.spentLamports / budget.initialLamports) * 100
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
