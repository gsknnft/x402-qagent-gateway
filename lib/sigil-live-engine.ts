/**
 * Dynamic Sigil gameplay engine with randomized strategies
 * Generates continuous, unpredictable Sigil transfer events
 */

import { randomUUID } from 'node:crypto'
import type { SigilEndpoint, TelemetryEvent } from '../packages/telemetry-core/src/types'

export interface BudgetSnapshot {
  initialLamports: number
  remainingLamports: number
  spentLamports: number
}

export interface LivePlayRuntimeOptions {
  budget?: BudgetSnapshot
  startTimestamp?: number
  sequenceOffset?: number
  tokenId?: string
  startHolderId?: string
}

export interface AgentStrategy {
  id: string
  endpoint: SigilEndpoint
  /** Probability of passing when holding (0-1) */
  passRate: number
  /** Probability of shooting when passing (0-1) */
  shootRate: number
  /** Average hold time in ms */
  holdDurationMs: number
  /** Style descriptor */
  style: 'conservative' | 'aggressive' | 'balanced' | 'playmaker'
}

export interface LivePlayConfig {
  /** Duration of live play in ms */
  durationMs: number
  /** Agents participating */
  agents: AgentStrategy[]
  /** Vendors in the ecosystem */
  vendors: SigilEndpoint[]
  /** Hub facilitator */
  hub: SigilEndpoint
  /** Goal endpoint */
  goal: SigilEndpoint
  /** Base timestamp */
  baseTimestamp?: number
  /** Token ID */
  tokenId?: string
  /** Turnover probability (0-1) */
  turnoverRate?: number
}

interface SimulationState {
  currentHolder: SigilEndpoint
  tokenId: string
  sequence: number
  timestamp: number
  events: TelemetryEvent[]
  goals: number
  shots: number
  turnovers: number
}

const NARRATIVES = {
  pass: [
    '{from} threads a precision pass to {to}, maintaining possession',
    '{from} swings the sigil wide to {to} to escape pressure',
    '{from} connects with {to} in the lane',
    '{from} dishes to {to} for the advance',
    '{from} finds {to} with a crisp exchange',
  ],
  shot: [
    '{from} drives toward the goal, firing to {to}',
    '{from} takes the shot through {to}',
    '{from} launches toward {to} with intent',
    '{from} accelerates the play through {to}',
  ],
  goal: [
    '{from} converts through {to} for the settlement goal!',
    '{from} finishes the sequence via {to} — goal scored!',
    '{from} capitalizes and scores through {to}',
    '{from} completes the play through {to} for the goal',
  ],
  turnover: [
    'Turnover! Budget exhaustion forces {from} to surrender possession',
    'Policy violation! {from} loses control to the system',
    '{from} encounters rate limit — possession lost',
    'Network congestion causes {from} to fumble possession',
  ],
  intercept: [
    '{to} intercepts the pass, creating a turnover',
    '{to} jumps the lane and steals possession',
    '{to} anticipates the play and intercepts',
  ],
}

function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function formatNarrative(template: string, from: string, to: string): string {
  return template.replace('{from}', from).replace('{to}', to)
}

export function generateLivePlay(config: LivePlayConfig, runtime: LivePlayRuntimeOptions = {}): TelemetryEvent[] {
  const {
    durationMs,
    agents,
    vendors,
    hub,
    goal,
    baseTimestamp: baseFromConfig,
    tokenId: configTokenId,
    turnoverRate = 0.05,
  } = config

  const {
    budget,
    startTimestamp,
    sequenceOffset = 0,
    tokenId,
    startHolderId,
  } = runtime

  const resolvedTokenId = tokenId ?? configTokenId ?? `sigil-live-${randomUUID()}`
  const resolvedStartTimestamp = startTimestamp ?? baseFromConfig ?? Date.now()

  const allParticipants = [
    ...agents.map(a => a.endpoint),
    ...vendors,
    hub,
    goal,
  ]

  const participantIndex = new Map(allParticipants.map(endpoint => [endpoint.id, endpoint]))
  const initialHolder = startHolderId ? participantIndex.get(startHolderId) ?? hub : hub

  const state: SimulationState = {
    currentHolder: initialHolder,
    tokenId: resolvedTokenId,
    sequence: sequenceOffset,
    timestamp: resolvedStartTimestamp,
    events: [],
    goals: 0,
    shots: 0,
    turnovers: 0,
  }

  const agentId = 'live-playmaker'
  const taskId = `live-play-${randomUUID()}`
  const provenance: Record<string, string> = {
    mode: 'live',
    stream: 'gameboard',
    tokenId: resolvedTokenId,
  }

  // Kickoff event
  state.events.push({
    type: 'action.started',
    timestamp: new Date(state.timestamp).toISOString(),
    correlationId: randomUUID(),
    agentId,
    taskId,
    provenance,
    payload: {
      actionType: 'sigil.live',
      input: { durationMs, participants: allParticipants.length },
      estimatedCost: 0,
    },
  })

  if (!startHolderId) {
    const firstAgent = pickRandom(agents)
    state.sequence++
    const kickoffEvent = createTransferEvent(
      state,
      null,
      firstAgent.endpoint,
      'kickoff',
      formatNarrative(
        `Facilitator sparks live play by delivering to {to}`,
        hub.label || hub.id,
        firstAgent.endpoint.label || firstAgent.endpoint.id,
      ),
      agentId,
      taskId,
      provenance,
    )
    state.events.push(kickoffEvent)
    state.currentHolder = firstAgent.endpoint
    state.timestamp += 500
  } else {
    // Slightly advance the clock so new events appear after the previous possession
    state.timestamp += 300
  }

  // Run live simulation loop
  while (state.timestamp - resolvedStartTimestamp < durationMs) {
    const currentStrategy = agents.find(a => a.endpoint.id === state.currentHolder.id)

    if (!currentStrategy) {
      // Current holder is not an agent (vendor, hub, goal)
      // Pass back to random agent or hub
      const nextAgent = Math.random() > 0.5 ? pickRandom(agents) : null
      const nextHolder = nextAgent ? nextAgent.endpoint : hub
      
      state.sequence++
      state.events.push(
        createTransferEvent(
          state,
          state.currentHolder,
          nextHolder,
          'return',
          formatNarrative(
            pickRandom(NARRATIVES.pass),
            state.currentHolder.label || state.currentHolder.id,
            nextHolder.label || nextHolder.id,
          ),
          agentId,
          taskId,
          provenance,
        ),
      )
      state.currentHolder = nextHolder
      state.timestamp += 600
      continue
    }

    // Agent holding the ball - make decision
    const decision = Math.random()
    
    // Check for turnover
    if (decision < turnoverRate) {
      state.turnovers++
      const interceptor = pickRandom([...vendors, hub])
      state.sequence++
      state.events.push(
        createTransferEvent(
          state,
          state.currentHolder,
          interceptor,
          'turnover',
          pickRandom(NARRATIVES.turnover).replace('{from}', state.currentHolder.label || state.currentHolder.id),
          agentId,
          taskId,
          provenance,
          { turnover: true },
        ),
      )
      state.currentHolder = interceptor
      state.timestamp += 400
      continue
    }

    // Decide: hold, pass, or shoot
    if (decision < turnoverRate + (1 - currentStrategy.passRate)) {
      // Hold longer
      state.timestamp += currentStrategy.holdDurationMs
      continue
    }

    // Pass or shoot
    const isShot = Math.random() < currentStrategy.shootRate
    
    if (isShot) {
      // Shoot toward goal (via vendor)
      const isGoal = Math.random() > 0.4 // 60% success rate
      
      if (isGoal) {
        // Pass to vendor first
        const shootingVendor = pickRandom(vendors)
        state.sequence++
        state.shots++
        state.events.push(
          createTransferEvent(
            state,
            state.currentHolder,
            shootingVendor,
            'shot',
            formatNarrative(
              pickRandom(NARRATIVES.shot),
              state.currentHolder.label || state.currentHolder.id,
              shootingVendor.label || shootingVendor.id,
            ),
            agentId,
            taskId,
            provenance,
            { shot: true },
          ),
        )
        state.currentHolder = shootingVendor
        state.timestamp += 300

        // Vendor completes to goal
        state.sequence++
        state.goals++
        state.events.push(
          createTransferEvent(
            state,
            state.currentHolder,
            goal,
            'goal',
            formatNarrative(
              pickRandom(NARRATIVES.goal),
              state.currentHolder.label || state.currentHolder.id,
              goal.label || goal.id,
            ),
            agentId,
            taskId,
            provenance,
            { goal: true, shot: true },
          ),
        )
        state.currentHolder = goal
  state.timestamp += 500

        // Reset to hub
        state.sequence++
        state.events.push(
          createTransferEvent(
            state,
            goal,
            hub,
            'reset',
            `${goal.label || goal.id} resets possession with the facilitator`,
            agentId,
            taskId,
            provenance,
          ),
        )
        state.currentHolder = hub
        state.timestamp += 400

        // Hub to random agent
        const nextAgent = pickRandom(agents)
        state.sequence++
        state.events.push(
          createTransferEvent(
            state,
            hub,
            nextAgent.endpoint,
            'restart',
            `Facilitator restarts play with ${nextAgent.endpoint.label || nextAgent.endpoint.id}`,
            agentId,
            taskId,
            provenance,
          ),
        )
        state.currentHolder = nextAgent.endpoint
  state.timestamp += 500
      } else {
        // Missed shot - vendor intercepts
        const defendingVendor = pickRandom(vendors)
        state.sequence++
        state.shots++
        state.events.push(
          createTransferEvent(
            state,
            state.currentHolder,
            defendingVendor,
            'blocked',
            `${defendingVendor.label || defendingVendor.id} blocks the shot from ${state.currentHolder.label || state.currentHolder.id}`,
            agentId,
            taskId,
            provenance,
            { shot: true, blocked: true },
          ),
        )
        state.currentHolder = defendingVendor
        state.timestamp += 400
      }
    } else {
      // Regular pass to teammate or vendor
      const passTargets = [
        ...agents.filter(a => a.endpoint.id !== state.currentHolder.id).map(a => a.endpoint),
        ...vendors,
      ]
      const nextHolder = pickRandom(passTargets)
      
      state.sequence++
      state.events.push(
        createTransferEvent(
          state,
          state.currentHolder,
          nextHolder,
          'advance',
          formatNarrative(
            pickRandom(NARRATIVES.pass),
            state.currentHolder.label || state.currentHolder.id,
            nextHolder.label || nextHolder.id,
          ),
          agentId,
          taskId,
          provenance,
        ),
      )
      state.currentHolder = nextHolder
      state.timestamp += currentStrategy.holdDurationMs + 200
    }
  }

  const passesGenerated = Math.max(state.sequence - sequenceOffset, 0)

  // Completion event
  state.events.push({
    type: 'action.completed',
    timestamp: new Date(state.timestamp).toISOString(),
    correlationId: randomUUID(),
    agentId,
    taskId,
    provenance,
    payload: {
      actionType: 'sigil.live',
      output: {
        tokenId: resolvedTokenId,
        passes: passesGenerated,
        goals: state.goals,
        shots: state.shots,
        turnovers: state.turnovers,
      },
      actualCost: 0,
      duration: state.timestamp - resolvedStartTimestamp,
      success: true,
    },
  })

  const initialBudget = budget?.initialLamports ?? 1_000_000
  const previousRemaining = budget?.remainingLamports ?? initialBudget
  const previousSpent = budget?.spentLamports ?? (initialBudget - previousRemaining)
  const computedSpendBase =
    state.goals * 2_500 + state.shots * 1_200 + state.turnovers * 800 + passesGenerated * 150
  const scenarioSpend = Math.min(previousRemaining, Math.max(5_000, computedSpendBase))
  const newRemaining = Math.max(previousRemaining - scenarioSpend, 0)
  const newSpent = Math.min(initialBudget, previousSpent + (previousRemaining - newRemaining))
  const delta = newRemaining - previousRemaining

  state.events.push({
    type: 'budget.delta',
    timestamp: new Date(state.timestamp + 100).toISOString(),
    correlationId: randomUUID(),
    agentId,
    taskId,
    provenance,
    payload: {
      previousBalance: previousRemaining,
      newBalance: newRemaining,
      delta,
      spent: newSpent,
      remaining: newRemaining,
    },
  })

  if (newRemaining === 0) {
    state.events.push({
      type: 'agent.halted',
      timestamp: new Date(state.timestamp + 300).toISOString(),
      correlationId: `halt-${resolvedTokenId}-${randomUUID()}`,
      agentId,
      taskId,
      provenance,
      payload: {
        reason: 'budget_exhausted',
        details: 'Budget depleted during live sigil play.',
      },
    })
  }

  return state.events
}

function createTransferEvent(
  state: SimulationState,
  from: SigilEndpoint | null,
  to: SigilEndpoint,
  intent: string,
  narrative: string,
  agentId: string,
  taskId: string,
  provenance: Record<string, string>,
  meta?: Record<string, unknown>,
): TelemetryEvent {
  return {
    type: 'sigil.transfer',
    timestamp: new Date(state.timestamp).toISOString(),
  correlationId: `${state.tokenId}-${String(state.sequence).padStart(4, '0')}`,
    agentId,
    taskId,
    provenance,
    payload: {
      tokenId: state.tokenId,
      sequence: state.sequence,
      from,
      to,
      intent,
      narrative,
      meta,
    },
  }
}

export function createDefaultLivePlayConfig(): LivePlayConfig {
  const hub: SigilEndpoint = {
    id: 'mesh.facilitator',
    label: 'Mesh Facilitator',
    role: 'hub',
  }

  const goal: SigilEndpoint = {
    id: 'goal.oracle',
    label: 'Oracle Goal',
    role: 'goal',
  }

  const vendors: SigilEndpoint[] = [
    { id: 'seller.prime', label: 'Seller Prime', role: 'vendor' },
    { id: 'seller.delta', label: 'Seller Delta', role: 'vendor' },
    { id: 'seller.gamma', label: 'Seller Gamma', role: 'vendor' },
  ]

  const agents: AgentStrategy[] = [
    {
      id: 'agent.alpha',
      endpoint: { id: 'agent.alpha', label: 'Agent Alpha', role: 'agent' },
      passRate: 0.85,
      shootRate: 0.15,
      holdDurationMs: 800,
      style: 'conservative',
    },
    {
      id: 'agent.beta',
      endpoint: { id: 'agent.beta', label: 'Agent Beta', role: 'agent' },
      passRate: 0.75,
      shootRate: 0.35,
      holdDurationMs: 500,
      style: 'aggressive',
    },
    {
      id: 'agent.gamma',
      endpoint: { id: 'agent.gamma', label: 'Agent Gamma', role: 'agent' },
      passRate: 0.80,
      shootRate: 0.25,
      holdDurationMs: 650,
      style: 'balanced',
    },
    {
      id: 'agent.delta',
      endpoint: { id: 'agent.delta', label: 'Agent Delta', role: 'agent' },
      passRate: 0.90,
      shootRate: 0.20,
      holdDurationMs: 700,
      style: 'playmaker',
    },
  ]

  return {
    durationMs: 20_000, // 20 seconds of play
    agents,
    vendors,
    hub,
    goal,
    turnoverRate: 0.08,
  }
}
