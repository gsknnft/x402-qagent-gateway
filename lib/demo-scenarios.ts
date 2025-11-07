import { randomUUID } from 'node:crypto'

import type { SigilEndpoint, TelemetryEvent } from '../packages/telemetry-core/src/types'

interface ScenarioOptions {
  variant?: 'classic' | 'fast-break' | 'press-break'
  tokenId?: string
}

interface PassPlan {
  from: SigilEndpoint | null
  to: SigilEndpoint
  intent: string
  narrative: string
  meta?: Record<string, unknown>
}

export function buildSigilDemoScenario(options: ScenarioOptions = {}): TelemetryEvent[] {
  const variant = options.variant ?? 'classic'
  const baseTimestamp = Date.now()
  const tokenId = options.tokenId ?? `sigil-${randomUUID()}`
  const agentId = 'demo-playmaker'
  const taskId = `demo-${variant}`

  const facilitator: SigilEndpoint = {
    id: 'mesh.facilitator',
    label: 'Mesh Facilitator',
    role: 'hub',
  }

  const agentAlpha: SigilEndpoint = {
    id: 'agent.alpha',
    label: 'Agent Alpha',
    role: 'agent',
  }

  const agentBeta: SigilEndpoint = {
    id: 'agent.beta',
    label: 'Agent Beta',
    role: 'agent',
  }

  const sellerPrime: SigilEndpoint = {
    id: 'seller.prime',
    label: 'Seller Prime',
    role: 'vendor',
  }

  const sellerDelta: SigilEndpoint = {
    id: 'seller.delta',
    label: 'Seller Delta',
    role: 'vendor',
  }

  const oracleGoal: SigilEndpoint = {
    id: 'goal.oracle',
    label: 'Oracle Goal',
    role: 'goal',
  }

  const sentinel: SigilEndpoint = {
    id: 'observer.sentinel',
    label: 'Sentinel',
    role: 'observer',
  }

  const scripts: Record<'classic' | 'fast-break' | 'press-break', PassPlan[]> = {
    classic: [
      {
        from: facilitator,
        to: agentAlpha,
        intent: 'kickoff',
        narrative: 'Facilitator mints the sigil and delivers to Agent Alpha to start the play.',
      },
      {
        from: agentAlpha,
        to: agentBeta,
        intent: 'advance',
        narrative: 'Alpha slides the sigil across the mesh to Beta to probe the lane.',
      },
      {
        from: agentBeta,
        to: sellerPrime,
        intent: 'exchange',
        narrative: 'Beta negotiates with Seller Prime to unlock premium content.',
      },
      {
        from: sellerPrime,
        to: agentBeta,
        intent: 'return',
        narrative: 'Seller Prime settles payment and passes the sigil back for clearance.',
      },
      {
        from: agentBeta,
        to: sellerDelta,
        intent: 'shot',
        narrative: 'Beta threads a high-risk shot toward Seller Delta guarding the crease.',
        meta: { shot: true },
      },
      {
        from: sellerDelta,
        to: oracleGoal,
        intent: 'goal',
        narrative: 'Seller Delta deflects through the oracle and scores the settlement goal.',
        meta: { goal: true, shot: true },
      },
      {
        from: oracleGoal,
        to: sentinel,
        intent: 'broadcast',
        narrative: 'Oracle broadcasts the proof of settlement to the Sentinel observer.',
      },
      {
        from: sentinel,
        to: facilitator,
        intent: 'reset',
        narrative: 'Sentinel hands the sigil back to the facilitator to reset the state.',
      },
    ],
    'fast-break': [
      {
        from: facilitator,
        to: agentBeta,
        intent: 'tip-off',
        narrative: 'Facilitator fires the sigil directly to Beta to trigger the fast break.',
      },
      {
        from: agentBeta,
        to: sellerDelta,
        intent: 'accelerate',
        narrative: 'Beta pushes tempo and sends the sigil at pace toward Seller Delta.',
        meta: { shot: true },
      },
      {
        from: sellerDelta,
        to: oracleGoal,
        intent: 'goal',
        narrative: 'Seller Delta one-times the sigil through the oracle net for a clean finish.',
        meta: { goal: true, shot: true },
      },
      {
        from: oracleGoal,
        to: agentAlpha,
        intent: 'celebrate',
        narrative: 'Oracle confirms settlement and drops the sigil to Alpha for wrap-up.',
      },
      {
        from: agentAlpha,
        to: facilitator,
        intent: 'reset',
        narrative: 'Alpha resets possession with the facilitator to lock in the play.',
      },
    ],
    'press-break': [
      {
        from: facilitator,
        to: agentAlpha,
        intent: 'kickoff',
        narrative: 'Facilitator sparks the press-break drill with a standard kickoff to Alpha.',
      },
      {
        from: agentAlpha,
        to: agentBeta,
        intent: 'swing',
        narrative: 'Alpha swings the sigil wide to Beta to escape early pressure.',
      },
      {
        from: agentBeta,
        to: sentinel,
        intent: 'intercept',
        narrative: 'Sentinel jumps the lane and intercepts to simulate a defensive trap.',
        meta: { interception: true },
      },
      {
        from: sentinel,
        to: agentBeta,
        intent: 'release',
        narrative: 'Sentinel quickly releases back to Beta to keep possession alive.',
      },
      {
        from: agentBeta,
        to: sellerPrime,
        intent: 'exchange',
        narrative: 'Beta reorients the attack with Seller Prime for a structured play.',
      },
      {
        from: sellerPrime,
        to: sellerDelta,
        intent: 'handoff',
        narrative: 'Seller Prime hands off to Seller Delta on the weak side.',
      },
      {
        from: sellerDelta,
        to: oracleGoal,
        intent: 'goal',
        narrative: 'Seller Delta capitalises on the rotation and converts via the oracle goal.',
        meta: { goal: true, shot: true },
      },
      {
        from: oracleGoal,
        to: facilitator,
        intent: 'reset',
        narrative: 'Oracle recycles the sigil back to the facilitator to reset the formation.',
      },
    ],
  }

  const passes = scripts[variant]

  const events: TelemetryEvent[] = []
  const provenance = {
    scenario: variant,
    tokenId,
  }

  const kickoffTimestamp = new Date(baseTimestamp).toISOString()
  const correlationId = randomUUID()

  events.push({
    type: 'action.started',
    timestamp: kickoffTimestamp,
    correlationId,
    agentId,
    taskId,
    provenance,
    payload: {
      actionType: 'sigil.playbook',
      input: { variant },
      estimatedCost: 0,
    },
  })

  passes.forEach((plan, index) => {
    const eventTimestamp = new Date(baseTimestamp + (index + 1) * 1200).toISOString()
    events.push({
      type: 'sigil.transfer',
      timestamp: eventTimestamp,
      correlationId: `${tokenId}-${String(index + 1).padStart(2, '0')}`,
      agentId,
      taskId,
      provenance,
      payload: {
        tokenId,
        sequence: index + 1,
        from: plan.from,
        to: plan.to,
        intent: plan.intent,
        narrative: plan.narrative,
        meta: plan.meta,
      },
    })
  })

  const completionTimestamp = new Date(baseTimestamp + (passes.length + 2) * 1200).toISOString()
  events.push({
    type: 'action.completed',
    timestamp: completionTimestamp,
    correlationId,
    agentId,
    taskId,
    provenance,
    payload: {
      actionType: 'sigil.playbook',
      output: {
        tokenId,
        passes: passes.length,
        goals: passes.filter(pass => pass.meta?.goal === true).length,
        shots: passes.filter(pass => pass.meta?.shot === true || pass.intent.includes('shot')).length,
      },
      actualCost: 0,
      duration: passes.length * 1200,
      success: true,
    },
  })

  events.push({
    type: 'budget.delta',
    timestamp: new Date(baseTimestamp + (passes.length + 3) * 1200).toISOString(),
    correlationId: randomUUID(),
    agentId,
    taskId,
    provenance,
    payload: {
      previousBalance: 1_000_000,
      newBalance: 995_000,
      delta: -5_000,
      spent: 5_000,
      remaining: 995_000,
    },
  })

  return events
}
