/**
 * Agent executor implementation
 * Executes actions with payment and telemetry
 */

import { randomUUID } from 'crypto'
import { AgentExecutor, AgentAction, ServiceAdapter, AdapterResult, AdapterContext } from './types'
import { BudgetManager } from './budget-manager'
import { TelemetryEvent } from '../../telemetry-core/src/types'

export class DefaultAgentExecutor implements AgentExecutor {
  private budgetManager: BudgetManager
  private agentId: string
  private emitEvent: (event: TelemetryEvent) => Promise<void>

  constructor(
    budgetManager: BudgetManager,
    agentId: string,
    emitEvent: (event: TelemetryEvent) => Promise<void>
  ) {
    this.budgetManager = budgetManager
    this.agentId = agentId
    this.emitEvent = emitEvent
  }

  async execute<TInput, TOutput>(
    action: AgentAction<TInput, TOutput>,
    adapter: ServiceAdapter<TInput, TOutput>
  ): Promise<AdapterResult<TOutput>> {
    const correlationId = randomUUID()
    const startTime = Date.now()

    try {
      // Estimate cost
      const estimatedCost = action.estimatedCost || await adapter.estimateCost(action.input)

      // Check budget
      const canAfford = await this.budgetManager.canAfford(estimatedCost)
      if (!canAfford) {
        throw new Error(`Cannot afford action: estimated cost ${estimatedCost} exceeds available budget`)
      }

      // Reserve budget
      await this.budgetManager.reserve(correlationId, estimatedCost)

      // Emit action started event
      await this.emitEvent({
        type: 'action.started',
        timestamp: new Date().toISOString(),
        correlationId,
        agentId: this.agentId,
        taskId: action.taskId,
        provenance: {},
        payload: {
          actionType: action.type,
          input: action.input,
          estimatedCost,
        },
      })

      // Create adapter context
      const budgetState = await this.budgetManager.getState()
      const context: AdapterContext = {
        correlationId,
        agentId: this.agentId,
        taskId: action.taskId,
        budgetRemaining: budgetState.available,
        emit: this.emitEvent,
      }

      // Execute adapter
      const result = await adapter.execute(action.input, context)

      // Commit budget
      await this.budgetManager.commit(correlationId, result.cost)

      const duration = Date.now() - startTime

      // Emit action completed event
      await this.emitEvent({
        type: 'action.completed',
        timestamp: new Date().toISOString(),
        correlationId,
        agentId: this.agentId,
        taskId: action.taskId,
        provenance: {},
        payload: {
          actionType: action.type,
          output: result.data,
          actualCost: result.cost,
          duration,
          success: true,
        },
      })

      return result
    } catch (error) {
      // Release reserved budget on failure
      await this.budgetManager.release(correlationId)

      const duration = Date.now() - startTime

      // Emit action completed event with failure
      await this.emitEvent({
        type: 'action.completed',
        timestamp: new Date().toISOString(),
        correlationId,
        agentId: this.agentId,
        taskId: action.taskId,
        provenance: {},
        payload: {
          actionType: action.type,
          output: null,
          actualCost: 0,
          duration,
          success: false,
        },
      })

      throw error
    }
  }
}
