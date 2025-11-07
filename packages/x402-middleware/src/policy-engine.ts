/**
 * Policy engine implementation
 * Enforces spending rules and budget constraints
 */

import { Address } from 'viem'
import { PolicyEngine, PaymentPolicy, PaymentReceipt, BudgetStatus } from './types'

export class DefaultPolicyEngine implements PolicyEngine {
  private policy: PaymentPolicy
  private spendHistory: PaymentReceipt[] = []
  private vendorRequestCounts: Map<string, number> = new Map()
  private windowStart: number

  constructor(policy: PaymentPolicy) {
    this.policy = policy
    this.windowStart = Date.now()
  }

  async canSpend(amount: number, vendor: Address): Promise<boolean> {
    // Check if vendor is allowed
    if (!this.policy.allowedVendors.includes(vendor)) {
      console.warn(`Vendor ${vendor} not in allowed list`)
      return false
    }

    // Check budget cap
    const status = await this.getBudgetStatus()
    if (status.totalSpent + amount > this.policy.budgetCap) {
      console.warn(`Budget exceeded: ${status.totalSpent + amount} > ${this.policy.budgetCap}`)
      return false
    }

    // Check rate limits
    const vendorKey = vendor.toLowerCase()
    const requestCount = this.vendorRequestCounts.get(vendorKey) || 0
    const rateLimit = this.policy.rateLimits[vendorKey] || Infinity
    
    if (requestCount >= rateLimit) {
      console.warn(`Rate limit exceeded for ${vendor}: ${requestCount} >= ${rateLimit}`)
      return false
    }

    return true
  }

  async recordSpend(receipt: PaymentReceipt): Promise<void> {
    this.spendHistory.push(receipt)
    
    // Update vendor request count
    const vendorKey = receipt.vendor.toLowerCase()
    const currentCount = this.vendorRequestCounts.get(vendorKey) || 0
    this.vendorRequestCounts.set(vendorKey, currentCount + 1)

    // Clean old history if window expired
    this.cleanOldHistory()
  }

  async getBudgetStatus(): Promise<BudgetStatus> {
    this.cleanOldHistory()

    const totalSpent = this.spendHistory.reduce((sum, r) => sum + r.amount, 0)
    const remaining = Math.max(0, this.policy.budgetCap - totalSpent)

    const vendorSpending: Record<string, number> = {}
    for (const receipt of this.spendHistory) {
      const key = receipt.vendor.toLowerCase()
      vendorSpending[key] = (vendorSpending[key] || 0) + receipt.amount
    }

    return {
      totalSpent,
      remaining,
      cap: this.policy.budgetCap,
      windowStart: this.windowStart,
      windowEnd: this.windowStart + this.policy.budgetWindow * 1000,
      vendorSpending,
    }
  }

  getPolicy(): PaymentPolicy {
    return this.policy
  }

  private cleanOldHistory(): void {
    const now = Date.now()
    const windowMs = this.policy.budgetWindow * 1000

    if (now - this.windowStart > windowMs) {
      // Reset window
      this.windowStart = now
      this.spendHistory = []
      this.vendorRequestCounts.clear()
    }
  }
}
