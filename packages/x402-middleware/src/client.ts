/**
 * X402 Payment Client implementation
 */

import { Address } from 'viem'
import { PaymentClient, PaymentRequest, PaymentReceipt } from './types'
import { randomUUID } from 'crypto'
import { usdToLamports, isValidSignature, isValidAddress } from './utils'

export class X402Client implements PaymentClient {
  private network: string
  private facilitatorUrl: string

  constructor(network: string, facilitatorUrl: string) {
    this.network = network
    this.facilitatorUrl = facilitatorUrl
  }

  /**
   * Normalize price strings into lamport amounts so demo inputs remain flexible.
   */
  private parsePrice(price: string): number {
    const raw = price.trim()

    // Allow lamport inputs like "1000" or "1000 lamports"
    const lamportMatch = raw.match(/^([0-9]+)(\s*lamports?)?$/i)
    if (lamportMatch) {
      const lamports = Number.parseInt(lamportMatch[1], 10)
      if (Number.isNaN(lamports) || lamports <= 0) {
        throw new Error(`Invalid lamport amount: ${price}`)
      }
      return lamports
    }

    // Fall back to USD parsing, tolerating missing symbol
    const normalized = raw.startsWith('$') ? raw : `$${raw}`
    const lamports = usdToLamports(normalized)
    if (lamports <= 0) {
      throw new Error(`Invalid USD amount: ${price}`)
    }
    return lamports
  }

  async pay(request: PaymentRequest): Promise<PaymentReceipt> {
    const idempotencyKey = request.idempotencyKey || randomUUID()
    const correlationId = request.correlationId || randomUUID()

    // IMPLEMENTATION NOTE: This is a simplified version
    // In production, this would:
    // 1. Call X402 facilitator to initiate payment
    // 2. Wait for user to approve via Coinbase Pay or wallet
    // 3. Monitor blockchain for settlement
    // 4. Return verified receipt
    
    // For now, we'll simulate the payment flow
    const amount = this.parsePrice(request.price)
    
    // Simulate API call to facilitator
    const receipt: PaymentReceipt = {
      signature: `sim_${idempotencyKey}_${Date.now()}`,
      amount,
      timestamp: Date.now(),
      vendor: request.vendor,
      endpoint: request.endpoint,
      correlationId,
      idempotencyKey,
      network: this.network,
    }

    return receipt
  }

  async verify(receipt: PaymentReceipt): Promise<boolean> {
    // IMPLEMENTATION NOTE: In production, this would:
    // 1. Query Solana blockchain for transaction
    // 2. Verify signature matches expected format
    // 3. Confirm amount and recipient
    // 4. Check settlement finality
    
    // Validate structure
    if (!isValidSignature(receipt.signature)) {
      return false
    }
    
    if (!isValidAddress(receipt.vendor)) {
      return false
    }
    
    if (receipt.amount <= 0 || receipt.amount > 1e12) {
      return false // Reject negative or unrealistic amounts
    }
    
    return true
  }

  getNetwork(): string {
    return this.network
  }
}
