/**
 * Budget manager implementation
 * Tracks spending, reservations, and enforces caps
 */

import { BudgetManager, BudgetState } from './types'
import { PaymentPolicy } from '../../x402-middleware/src/types'

export class DefaultBudgetManager implements BudgetManager {
  private policy: PaymentPolicy
  private spent: number = 0
  private reservations: Map<string, number> = new Map()
  private windowStart: number

  constructor(policy: PaymentPolicy) {
    this.policy = policy
    this.windowStart = Date.now()
  }

  async canAfford(estimatedCost: number): Promise<boolean> {
    const state = await this.getState()
    return state.available >= estimatedCost
  }

  async reserve(correlationId: string, amount: number): Promise<void> {
    const state = await this.getState()
    
    if (state.available < amount) {
      throw new Error(`Insufficient budget: need ${amount}, have ${state.available}`)
    }

    this.reservations.set(correlationId, amount)
  }

  async commit(correlationId: string, actualCost: number): Promise<void> {
    const reserved = this.reservations.get(correlationId)
    if (!reserved) {
      throw new Error(`No reservation found for ${correlationId}`)
    }

    // Remove reservation and add to spent
    this.reservations.delete(correlationId)
    this.spent += actualCost

    // Check if window needs reset
    this.checkWindowReset()
  }

  async release(correlationId: string): Promise<void> {
    // Just remove the reservation
    this.reservations.delete(correlationId)
  }

  async getState(): Promise<BudgetState> {
    this.checkWindowReset()

    const reserved = Array.from(this.reservations.values()).reduce((sum, amt) => sum + amt, 0)
    const available = Math.max(0, this.policy.budgetCap - this.spent - reserved)

    return {
      total: this.policy.budgetCap,
      spent: this.spent,
      reserved,
      available,
      cap: this.policy.budgetCap,
      windowStart: this.windowStart,
      windowEnd: this.windowStart + this.policy.budgetWindow * 1000,
    }
  }

  private checkWindowReset(): void {
    const now = Date.now()
    const windowMs = this.policy.budgetWindow * 1000

    if (now - this.windowStart > windowMs) {
      // Reset window
      this.windowStart = now
      this.spent = 0
      this.reservations.clear()
    }
  }
}
