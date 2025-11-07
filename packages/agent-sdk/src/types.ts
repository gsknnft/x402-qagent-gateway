/**
 * Agent SDK type definitions
 * Enables autonomous economic agents with budget constraints
 */

import { Address } from 'viem'
import { PaymentReceipt, PaymentPolicy } from '../../x402-middleware/src/types'
import { TelemetryEvent } from '../../telemetry-core/src/types'

/**
 * Service adapter context - passed to all adapters
 */
export interface AdapterContext {
  /** Correlation ID for this request */
  correlationId: string
  /** Agent ID */
  agentId: string
  /** Task ID if part of a task */
  taskId?: string
  /** Current budget status */
  budgetRemaining: number
  /** Telemetry emitter */
  emit: (event: TelemetryEvent) => Promise<void>
}

/**
 * Service adapter result
 */
export interface AdapterResult<T> {
  /** The actual data/output */
  data: T
  /** Payment receipt */
  receipt: PaymentReceipt
  /** Cost in lamports */
  cost: number
  /** Duration in milliseconds */
  duration: number
  /** Vendor address */
  vendor: Address
}

/**
 * Service adapter interface - pluggable service implementations
 */
export interface ServiceAdapter<TInput, TOutput> {
  /** Adapter name/identifier */
  name: string
  
  /** Estimated cost for operation */
  estimateCost(input: TInput): Promise<number>
  
  /** Execute the service and pay for it */
  execute(input: TInput, context: AdapterContext): Promise<AdapterResult<TOutput>>
  
  /** Get vendor address for this service */
  getVendor(): Address
  
  /** Get service endpoint */
  getEndpoint(): string
}

/**
 * Action definition - what an agent can do
 */
export interface AgentAction<TInput = unknown, TOutput = unknown> {
  /** Action type identifier */
  type: string
  /** Input data */
  input: TInput
  /** Estimated cost (optional, will be calculated if not provided) */
  estimatedCost?: number
  /** Priority (higher = more important) */
  priority?: number
  /** Task ID this action belongs to */
  taskId?: string
}

/**
 * Agent planner interface - decides what to do next
 */
export interface AgentPlanner {
  /**
   * Plan next actions given current state and budget
   */
  plan(state: AgentState): Promise<AgentAction[]>
  
  /**
   * Select best action from candidates
   */
  selectAction(candidates: AgentAction[], budget: number): Promise<AgentAction | null>
}

/**
 * Agent executor interface - runs actions with payment
 */
export interface AgentExecutor {
  /**
   * Execute an action with payment
   */
  execute<TInput, TOutput>(
    action: AgentAction<TInput, TOutput>,
    adapter: ServiceAdapter<TInput, TOutput>
  ): Promise<AdapterResult<TOutput>>
}

/**
 * Budget manager interface - tracks and enforces spending
 */
export interface BudgetManager {
  /**
   * Check if can afford action
   */
  canAfford(estimatedCost: number): Promise<boolean>
  
  /**
   * Reserve budget for action
   */
  reserve(correlationId: string, amount: number): Promise<void>
  
  /**
   * Commit reserved budget (action succeeded)
   */
  commit(correlationId: string, actualCost: number): Promise<void>
  
  /**
   * Release reserved budget (action failed)
   */
  release(correlationId: string): Promise<void>
  
  /**
   * Get current budget state
   */
  getState(): Promise<BudgetState>
}

/**
 * Budget state
 */
export interface BudgetState {
  /** Total budget allocated */
  total: number
  /** Currently spent */
  spent: number
  /** Currently reserved (pending actions) */
  reserved: number
  /** Available for new actions */
  available: number
  /** Budget cap */
  cap: number
  /** Window start */
  windowStart: number
  /** Window end */
  windowEnd: number
}

/**
 * Agent state
 */
export interface AgentState {
  /** Agent ID */
  agentId: string
  /** Current task ID */
  currentTaskId?: string
  /** Budget state */
  budget: BudgetState
  /** Payment policy */
  policy: PaymentPolicy
  /** Running flag */
  running: boolean
  /** Consecutive failures */
  consecutiveFailures: number
  /** Completed actions count */
  completedActions: number
  /** Failed actions count */
  failedActions: number
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Unique agent identifier */
  agentId: string
  /** Payment policy */
  policy: PaymentPolicy
  /** Available service adapters */
  adapters: Record<string, ServiceAdapter<unknown, unknown>>
  /** Planner implementation */
  planner: AgentPlanner
  /** Telemetry sinks */
  telemetrySinks?: Array<{ emit: (event: TelemetryEvent) => Promise<void> }>
}

/**
 * Vendor selection strategy
 */
export interface VendorSelectionStrategy {
  /**
   * Select best vendor from candidates
   */
  selectVendor(
    candidates: Array<{
      vendor: Address
      endpoint: string
      estimatedCost: number
      reputation?: number
    }>
  ): Promise<Address>
}
