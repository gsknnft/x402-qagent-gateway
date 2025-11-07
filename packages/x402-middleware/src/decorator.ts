/**
 * Payment decorator - wraps fetch/API calls with X402 payment
 */

import { Address } from 'viem'
import { PaymentClient, PaymentReceipt, PaymentResult } from './types'
import { randomUUID } from 'crypto'

export interface PaymentDecoratorConfig {
  /** Payment client */
  client: PaymentClient
  /** Vendor address */
  vendor: Address
  /** Service endpoint */
  endpoint: string
  /** Price per request */
  price: string
  /** Description */
  description?: string
  /** Max retries on payment failure */
  maxRetries?: number
  /** Retry backoff in ms */
  retryBackoff?: number
}

/**
 * Decorate a function with X402 payment
 */
export function withPayment<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  config: PaymentDecoratorConfig
): (...args: TArgs) => Promise<PaymentResult<TReturn>> {
  return async (...args: TArgs): Promise<PaymentResult<TReturn>> => {
    const correlationId = randomUUID()
    const startTime = Date.now()
    let retries = 0
    const maxRetries = config.maxRetries || 3
    const backoff = config.retryBackoff || 1000

    while (retries <= maxRetries) {
      try {
        // Execute payment first
        const receipt = await config.client.pay({
          price: config.price,
          vendor: config.vendor,
          endpoint: config.endpoint,
          description: config.description,
          correlationId,
        })

        // Verify payment
        const verified = await config.client.verify(receipt)
        if (!verified) {
          throw new Error('Payment verification failed')
        }

        // Execute actual function
        const data = await fn(...args)
        const duration = Date.now() - startTime

        return {
          data,
          receipt,
          metadata: {
            duration,
            retries,
            correlationId,
          },
        }
      } catch (error) {
        retries++
        if (retries > maxRetries) {
          throw error
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, retries - 1)))
      }
    }

    throw new Error('Max retries exceeded')
  }
}

/**
 * Decorate fetch calls with payment
 */
export function withPaymentFetch(
  config: PaymentDecoratorConfig
): (input: RequestInfo | URL, init?: RequestInit) => Promise<PaymentResult<Response>> {
  return withPayment(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      return fetch(input, init)
    },
    config
  )
}
