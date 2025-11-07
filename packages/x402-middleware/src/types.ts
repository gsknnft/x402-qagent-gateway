/**
 * Core type definitions for X402 payment middleware
 * Designed for composability and future SigilNet/QVera integration
 */

import { Address } from 'viem'

/**
 * Payment receipt returned after successful X402 payment
 */
export interface PaymentReceipt {
  /** Transaction signature on Solana blockchain */
  signature: string
  /** Amount paid in lamports */
  amount: number
  /** Timestamp of payment */
  timestamp: number
  /** Vendor address that received payment */
  vendor: Address
  /** Service endpoint that was accessed */
  endpoint: string
  /** Correlation ID for lineage tracking */
  correlationId: string
  /** Idempotency key to prevent double-spending */
  idempotencyKey: string
  /** Network where payment was made */
  network: string
}

/**
 * Payment request configuration
 */
export interface PaymentRequest {
  /** Amount to pay in USD (e.g., "$0.01") */
  price: string
  /** Vendor address to pay */
  vendor: Address
  /** Service endpoint URL */
  endpoint: string
  /** Optional description */
  description?: string
  /** Optional correlation ID */
  correlationId?: string
  /** Optional idempotency key */
  idempotencyKey?: string
}

/**
 * Policy configuration for agent spending
 */
export interface PaymentPolicy {
  /** Allowed vendor addresses */
  allowedVendors: Address[]
  /** Budget cap in lamports */
  budgetCap: number
  /** Budget window in seconds */
  budgetWindow: number
  /** Per-vendor rate limits (requests per window) */
  rateLimits: Record<string, number>
  /** Provenance tags for all payments */
  provenance: {
    agentId: string
    taskId?: string
    commitHash?: string
    [key: string]: string | undefined
  }
  /** Halt conditions */
  haltConditions: {
    maxConsecutiveFailures: number
    settlementTimeoutMs: number
  }
}

/**
 * Payment client interface - abstraction for X402 operations
 */
export interface PaymentClient {
  /**
   * Execute a payment and return receipt
   */
  pay(request: PaymentRequest): Promise<PaymentReceipt>
  
  /**
   * Verify a payment receipt on-chain
   */
  verify(receipt: PaymentReceipt): Promise<boolean>
  
  /**
   * Get current network
   */
  getNetwork(): string
}

/**
 * Policy engine interface - controls spending behavior
 */
export interface PolicyEngine {
  /**
   * Check if agent can spend amount with vendor
   */
  canSpend(amount: number, vendor: Address): Promise<boolean>
  
  /**
   * Record a completed spend
   */
  recordSpend(receipt: PaymentReceipt): Promise<void>
  
  /**
   * Get current budget status
   */
  getBudgetStatus(): Promise<BudgetStatus>
  
  /**
   * Get policy configuration
   */
  getPolicy(): PaymentPolicy
}

/**
 * Budget status tracking
 */
export interface BudgetStatus {
  /** Total spent in current window */
  totalSpent: number
  /** Remaining budget in current window */
  remaining: number
  /** Budget cap */
  cap: number
  /** Window start timestamp */
  windowStart: number
  /** Window end timestamp */
  windowEnd: number
  /** Per-vendor spending */
  vendorSpending: Record<string, number>
}

/**
 * Payment decorator result
 */
export interface PaymentResult<T> {
  /** The actual result from the service */
  data: T
  /** Payment receipt */
  receipt: PaymentReceipt
  /** Execution metadata */
  metadata: {
    duration: number
    retries: number
    correlationId: string
  }
}
