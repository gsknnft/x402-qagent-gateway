/**
 * X402 Payment Client implementation
 * 
 * Supports both simulation mode (for testing) and facilitator mode (with Kora integration)
 */

import { Address } from 'viem'
import { PaymentClient, PaymentRequest, PaymentReceipt } from './types'
import { randomUUID } from 'crypto'
import { usdToLamports, isValidSignature, isValidAddress } from './utils'

export interface X402ClientOptions {
  network: string
  facilitatorUrl: string
  /** 
   * Demo mode uses simulation instead of actual facilitator calls
   * Set to true for non-production hackathon demo
   */
  demoMode?: boolean
}

export class X402Client implements PaymentClient {
  private network: string
  private facilitatorUrl: string
  private demoMode: boolean

  constructor(options: X402ClientOptions | string, facilitatorUrl?: string) {
    // Support legacy constructor: X402Client(network, facilitatorUrl)
    if (typeof options === 'string') {
      this.network = options
      this.facilitatorUrl = facilitatorUrl || 'https://x402.org/facilitator'
      this.demoMode = true // Default to demo mode for backward compatibility
    } else {
      this.network = options.network
      this.facilitatorUrl = options.facilitatorUrl
      this.demoMode = options.demoMode ?? true // Default to demo mode
    }
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
    const amount = this.parsePrice(request.price)

    if (this.demoMode) {
      // DEMO MODE: Simulate the payment flow without actual blockchain calls
      // This is for non-production hackathon demonstration only
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

    // FACILITATOR MODE: Call the X402 facilitator with Kora integration
    // This would be used in production with actual blockchain transactions
    try {
      // Note: In a real implementation, this would call the facilitator's /settle endpoint
      // The facilitator uses Kora SDK to sign and send the transaction
      // For now, this is a placeholder showing the integration pattern
      const response = await fetch(`${this.facilitatorUrl}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentRequirements: {
            network: this.network,
            recipient: request.vendor,
            amount: amount.toString(),
          },
          paymentPayload: {
            // This would contain the actual transaction data
            payload: {
              transaction: '', // Transaction bytes would go here
            },
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Facilitator error: ${response.statusText}`)
      }

      const data = await response.json()
      
      const receipt: PaymentReceipt = {
        signature: data.transaction || `tx_${idempotencyKey}_${Date.now()}`,
        amount,
        timestamp: Date.now(),
        vendor: request.vendor,
        endpoint: request.endpoint,
        correlationId,
        idempotencyKey,
        network: this.network,
      }

      return receipt
    } catch (error) {
      console.error('Payment via facilitator failed:', error)
      throw new Error(`Payment failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async verify(receipt: PaymentReceipt): Promise<boolean> {
    // Validate structure (common to both modes)
    if (!isValidSignature(receipt.signature)) {
      return false
    }
    
    if (!isValidAddress(receipt.vendor)) {
      return false
    }
    
    if (receipt.amount <= 0 || receipt.amount > 1e12) {
      return false // Reject negative or unrealistic amounts
    }

    if (this.demoMode) {
      // DEMO MODE: Simple validation without blockchain checks
      // This is for non-production hackathon demonstration only
      return true
    }

    // FACILITATOR MODE: Verify via facilitator which checks blockchain
    // In production, this would:
    // 1. Query Solana blockchain for transaction
    // 2. Verify signature matches expected format
    // 3. Confirm amount and recipient
    // 4. Check settlement finality
    try {
      const response = await fetch(`${this.facilitatorUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentRequirements: {
            network: this.network,
            recipient: receipt.vendor,
            amount: receipt.amount.toString(),
          },
          paymentPayload: {
            payload: {
              transaction: receipt.signature,
            },
          },
        }),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      return data.isValid === true
    } catch (error) {
      console.error('Verification via facilitator failed:', error)
      return false
    }
  }

  getNetwork(): string {
    return this.network
  }
}
