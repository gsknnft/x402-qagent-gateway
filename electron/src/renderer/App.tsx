import { useEffect, useMemo, useState } from 'react';
import type { AgentRuntimeStatus } from '../main/agentManager';
import type { PolicyDetail, PolicySummary } from '../main/policyManager';
import type { TelemetrySnapshot } from '../main/telemetryService';
import type { TelemetryEvent } from '../../../packages/telemetry-core/src/types';
import './App.css';

const LAMPORTS_PER_SOL = 1_000_000_000;

const isElectron = typeof window !== 'undefined' && Boolean(window.electron?.telemetry);

function formatLamports(lamports: number): string {
  if (!Number.isFinite(lamports)) return '—';
  const sol = lamports / LAMPORTS_PER_SOL;
  return `${sol.toFixed(sol < 0.01 ? 6 : 3)} SOL`;
}

function formatUsd(lamports: number, usd: number): string {
  if (!Number.isFinite(lamports) || !Number.isFinite(usd)) return '—';
  return `${formatLamports(lamports)} • $${usd.toFixed(2)}`;
}

function formatTimestamp(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function extractEventStream(event: TelemetryEvent): string {
  return event.provenance?.stream ?? 'demo';
}

function getEventLabel(event: TelemetryEvent): string {
  switch (event.type) {
    case 'payment.initiated':
      return 'Payment Initiated';
    case 'payment.settled':
      return 'Payment Settled';
    case 'agent.halted':
      return 'Agent Halted';
    case 'action.started':
      return `Action Started (${event.payload.actionType})`;
    case 'action.completed':
      return `Action Completed (${event.payload.actionType})`;
    default:
      return event.type;
  }
}

export default function App() {
  const [agents, setAgents] = useState<AgentRuntimeStatus[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [telemetrySnapshot, setTelemetrySnapshot] = useState<TelemetrySnapshot | null>(null);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [policyContent, setPolicyContent] = useState<string>('');
  const [policyStatus, setPolicyStatus] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [isSavingPolicy, setSavingPolicy] = useState(false);
  const [policyDirty, setPolicyDirty] = useState(false);
  const [streamFilter, setStreamFilter] = useState<'all' | 'demo' | 'gameboard'>('all');

  useEffect(() => {
    if (!isElectron) return;
    const { agents: agentAPI } = window.electron;
    let unsubscribe: (() => void) | undefined;

    agentAPI
      .list()
      .then(state => {
        setAgents(state);
        setSelectedAgentId(previous => previous ?? state[0]?.id ?? null);
      })
      .catch(() => {
        // Ignore initial load failures; renderer will surface via subscription updates
      });

    unsubscribe = agentAPI.subscribe(state => {
      setAgents(state);
      setSelectedAgentId(previous => {
        if (previous && state.some(agent => agent.id === previous)) {
          return previous;
        }
        return state[0]?.id ?? null;
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    const { telemetry } = window.electron;
    const unsubscribeUpdates = telemetry.subscribe(snapshot => {
      setTelemetrySnapshot(snapshot);
      setTelemetryError(null);
    });
    const unsubscribeErrors = telemetry.onError(message => {
      setTelemetryError(message);
    });

    return () => {
      unsubscribeUpdates?.();
      unsubscribeErrors?.();
    };
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    const { policies: policyAPI } = window.electron;

    policyAPI
      .list()
      .then(result => {
        setPolicies(result);
        setSelectedPolicyId(previous => previous ?? result[0]?.id ?? null);
      })
      .catch(error => {
        const message = error instanceof Error ? error.message : String(error);
        setPolicyError(message);
      });
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    if (!selectedPolicyId) {
      setPolicyContent('');
      setPolicyStatus(null);
      return;
    }

    const { policies: policyAPI } = window.electron;
    let cancelled = false;

    policyAPI
      .load(selectedPolicyId)
      .then(detail => {
        if (cancelled) return;
        setPolicyContent(detail.content);
        setPolicyStatus(detail.updatedAt ? `Last updated ${formatTimestamp(detail.updatedAt)}` : null);
        setPolicyError(null);
        setPolicyDirty(false);
      })
      .catch(error => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setPolicyError(message);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPolicyId]);

  const selectedAgent = useMemo(
    () => agents.find(agent => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  const recentEvents = useMemo(() => {
    if (!telemetrySnapshot) return [] as TelemetryEvent[];
    const events = [...telemetrySnapshot.events].reverse();
    if (streamFilter === 'all') {
      return events.slice(0, 40);
    }
    return events.filter(event => extractEventStream(event) === streamFilter).slice(0, 40);
  }, [telemetrySnapshot, streamFilter]);

  const streamCounts = useMemo(() => {
    if (!telemetrySnapshot) return { demo: 0, gameboard: 0 };
    return telemetrySnapshot.events.reduce(
      (acc, event) => {
        const stream = extractEventStream(event);
        if (stream === 'gameboard') {
          acc.gameboard += 1;
        } else {
          acc.demo += 1;
        }
        return acc;
      },
      { demo: 0, gameboard: 0 },
    );
  }, [telemetrySnapshot]);

  const handleStartAgent = async (id: string) => {
    if (!isElectron) return;
    try {
      await window.electron.agents.start(id);
    } catch (error) {
      console.error('Failed to start agent', error);
    }
  };

  const handleStopAgent = async (id: string) => {
    if (!isElectron) return;
    try {
      await window.electron.agents.stop(id);
    } catch (error) {
      console.error('Failed to stop agent', error);
    }
  };

  const handlePolicySave = async () => {
    if (!isElectron) return;
    if (!selectedPolicyId) return;

    setSavingPolicy(true);
    try {
      const detail: PolicyDetail = await window.electron.policies.save(selectedPolicyId, policyContent);
      setPolicyStatus(detail.updatedAt ? `Saved ${formatTimestamp(detail.updatedAt)}` : 'Policy saved');
      setPolicyDirty(false);
      setPolicyError(null);
    } catch (error) {
      setPolicyError((error as Error).message);
    } finally {
      setSavingPolicy(false);
    }
  };

  if (!isElectron) {
    return (
      <div className="control-center control-center--fallback">
        <h1>X402 Quantum Agent Control Center</h1>
        <p>Launch the Electron shell via <code>pnpm dev</code> inside <code>electron/</code> to access the desktop control center.</p>
      </div>
    );
  }

  return (
    <div className="control-center">
      <header className="header">
        <div>
          <h1>X402 Agent Control Center</h1>
          <p>Manage autonomous agents, adjust policies, and inspect live telemetry without leaving the desktop shell.</p>
        </div>
        <div className="stream-pill">
          <span>Total events</span>
          <strong>{telemetrySnapshot?.summary.totalEvents ?? 0}</strong>
        </div>
      </header>

      <main className="layout">
        <section className="panel panel--agents">
          <div className="panel__header">
            <h2>Agents</h2>
            <button
              className="refresh"
              type="button"
              onClick={() => {
                window.electron.agents
                  .list()
                  .then(setAgents)
                  .catch(error => {
                    console.error('Failed to refresh agent list', error);
                  });
              }}
            >
              Refresh
            </button>
          </div>
          <div className="agent-list">
            {agents.map(agent => {
              const isSelected = agent.id === selectedAgentId;
              return (
                <button
                  key={agent.id}
                  type="button"
                  className={`agent-tile ${isSelected ? 'agent-tile--selected' : ''}`}
                  onClick={() => setSelectedAgentId(agent.id)}
                >
                  <div className={`status status--${agent.state}`}>
                    {agent.state.toUpperCase()}
                  </div>
                  <h3>{agent.label}</h3>
                  <p>{agent.description}</p>
                  <dl>
                    <div>
                      <dt>PID</dt>
                      <dd>{agent.pid ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Started</dt>
                      <dd>{formatTimestamp(agent.lastStartedAt)}</dd>
                    </div>
                    <div>
                      <dt>Exited</dt>
                      <dd>{formatTimestamp(agent.lastExitedAt)}</dd>
                    </div>
                  </dl>
                </button>
              );
            })}
            {agents.length === 0 && <div className="empty">No agents detected in workspace.</div>}
          </div>

          {selectedAgent && (
            <div className="agent-details">
              <div className="actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => handleStartAgent(selectedAgent.id)}
                  disabled={selectedAgent.state === 'running' || selectedAgent.state === 'starting'}
                >
                  Start
                </button>
                <button
                  type="button"
                  onClick={() => handleStopAgent(selectedAgent.id)}
                  disabled={selectedAgent.state === 'stopping' || !['running', 'starting'].includes(selectedAgent.state)}
                >
                  Stop
                </button>
              </div>
              <div className="log-view">
                <h3>Recent output</h3>
                <div className="log-view__scroller">
                  {selectedAgent.logs.slice(-40).map(entry => (
                    <div key={`${entry.timestamp}-${entry.message}`} className={`log-line log-line--${entry.level}`}>
                      <time>{new Date(entry.timestamp).toLocaleTimeString()}</time>
                      <span>{entry.message}</span>
                    </div>
                  ))}
                  {selectedAgent.logs.length === 0 && <div className="empty">No output yet.</div>}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="panel panel--telemetry">
          <div className="panel__header">
            <h2>Live Telemetry</h2>
            <div className="filters">
              <button
                type="button"
                className={streamFilter === 'all' ? 'active' : ''}
                onClick={() => setStreamFilter('all')}
              >
                All ({streamCounts.demo + streamCounts.gameboard})
              </button>
              <button
                type="button"
                className={streamFilter === 'demo' ? 'active' : ''}
                onClick={() => setStreamFilter('demo')}
              >
                Demo ({streamCounts.demo})
              </button>
              <button
                type="button"
                className={streamFilter === 'gameboard' ? 'active' : ''}
                onClick={() => setStreamFilter('gameboard')}
              >
                Gameboard ({streamCounts.gameboard})
              </button>
            </div>
          </div>

          {telemetryError && <div className="error">{telemetryError}</div>}

          <div className="budget">
            <div>
              <span>Remaining budget</span>
              <strong>{formatLamports(telemetrySnapshot?.summary.budget.remainingLamports ?? 0)}</strong>
            </div>
            <div>
              <span>Spent</span>
              <strong>{formatUsd(
                telemetrySnapshot?.summary.budget.spentLamports ?? 0,
                telemetrySnapshot?.summary.budget.spentUsd ?? 0,
              )}</strong>
            </div>
            <div>
              <span>Last update</span>
              <strong>{formatTimestamp(telemetrySnapshot?.summary.lastUpdated)}</strong>
            </div>
          </div>

          <div className="event-list">
            {recentEvents.map(event => {
              let costDisplay: string | null = null;
              if (event.type === 'action.completed') {
                costDisplay = formatLamports(event.payload.actualCost);
              } else if (event.type === 'payment.settled') {
                costDisplay = formatLamports(event.payload.receipt.amount);
              } else if (event.type === 'action.started' && typeof event.payload.estimatedCost === 'number') {
                costDisplay = `Est. ${formatLamports(event.payload.estimatedCost)}`;
              }

              const outputPreview =
                event.type === 'action.completed' && event.payload.output != null
                  ? JSON.stringify(event.payload.output, null, 2)
                  : null;

              return (
                <article key={`${event.timestamp}-${event.type}-${event.correlationId}`} className="event">
                  <header>
                    <span className={`event__stream event__stream--${extractEventStream(event)}`}>
                      {extractEventStream(event)}
                    </span>
                    <h3>{getEventLabel(event)}</h3>
                    <time>{formatTimestamp(event.timestamp)}</time>
                  </header>
                  <dl>
                    {event.correlationId && (
                      <div>
                        <dt>Correlation</dt>
                        <dd>{event.correlationId}</dd>
                      </div>
                    )}
                    {event.taskId && (
                      <div>
                        <dt>Task</dt>
                        <dd>{event.taskId}</dd>
                      </div>
                    )}
                    {costDisplay && (
                      <div>
                        <dt>Value</dt>
                        <dd>{costDisplay}</dd>
                      </div>
                    )}
                  </dl>
                  {outputPreview && <pre className="event__output">{outputPreview}</pre>}
                </article>
              );
            })}
            {recentEvents.length === 0 && <div className="empty">No telemetry yet. Start an agent to begin streaming events.</div>}
          </div>
        </section>

        <section className="panel panel--policies">
          <div className="panel__header">
            <h2>Policy Editor</h2>
            {policyStatus && <span className="status-pill">{policyStatus}</span>}
          </div>

          {policyError && <div className="error">{policyError}</div>}

          <label className="policy-selector">
            Policy
            <select
              value={selectedPolicyId ?? ''}
              onChange={event => setSelectedPolicyId(event.target.value || null)}
            >
              {policies.map(policy => (
                <option key={policy.id} value={policy.id}>
                  {policy.id} {policy.strategy ? `(${policy.strategy})` : ''}
                </option>
              ))}
            </select>
          </label>

          <textarea
            value={policyContent}
            placeholder={policies.length === 0 ? 'No policy files detected' : ''}
            onChange={event => {
              setPolicyContent(event.target.value);
              setPolicyDirty(true);
            }}
            spellCheck={false}
          />

          <div className="actions">
            <button
              type="button"
              className="primary"
              onClick={handlePolicySave}
              disabled={!policyDirty || isSavingPolicy || !selectedPolicyId}
            >
              {isSavingPolicy ? 'Saving…' : 'Save Policy'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedPolicyId) return;
                const { policies: policyAPI } = window.electron;
                policyAPI
                  .load(selectedPolicyId)
                  .then(detail => {
                    setPolicyContent(detail.content);
                    setPolicyDirty(false);
                    setPolicyStatus(detail.updatedAt ? `Reverted to ${formatTimestamp(detail.updatedAt)}` : 'Reverted');
                  })
                  .catch(error => {
                    const message = error instanceof Error ? error.message : String(error);
                    setPolicyError(message);
                  });
              }}
              disabled={isSavingPolicy || !policyDirty || !selectedPolicyId}
            >
              Revert Changes
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}




/* 
// apps/electron-react/src/renderer/App.tsx
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import "./App.css";

const router = createBrowserRouter(
  [
      {
    path: '/',
    element: <></>  //<HomePage />,
  },
  // {
  //   path: '*',
  //   element: <></> //<NotFound />,
  // },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

export default function App() {
  return (
    // <Providers>
      <RouterProvider router={router} />
    // </Providers>
  );
}



*/