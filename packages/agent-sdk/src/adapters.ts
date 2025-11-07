/**
 * Example service adapters
 */

import { Address } from 'viem'
import { ServiceAdapter, AdapterContext, AdapterResult } from './types'
import { PaymentClient } from '../../x402-middleware/src/types'
import { usdToLamports } from '../../x402-middleware/src/utils'

/**
 * Text transformation service adapter
 * Simulates a micro-service that transforms text (e.g., uppercase, reverse)
 */
export class TextTransformAdapter implements ServiceAdapter<{ text: string; operation: string }, { result: string }> {
  name = 'text-transform'
  private client: PaymentClient
  private vendor: Address
  private endpoint: string
  private pricePerRequest: string

  constructor(client: PaymentClient, vendor: Address, endpoint: string, pricePerRequest: string = '$0.01') {
    this.client = client
    this.vendor = vendor
    this.endpoint = endpoint
    this.pricePerRequest = pricePerRequest
  }

  async estimateCost(input: { text: string; operation: string }): Promise<number> {
    // Simple fixed cost for demo
    // In production, might vary by input size
    return usdToLamports(this.pricePerRequest)
  }

  async execute(
    input: { text: string; operation: string },
    context: AdapterContext
  ): Promise<AdapterResult<{ result: string }>> {
    const startTime = Date.now()

    // Emit payment initiated event
    await context.emit({
      type: 'payment.initiated',
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      agentId: context.agentId,
      taskId: context.taskId,
      provenance: {},
      payload: {
        vendor: this.vendor,
        amount: await this.estimateCost(input),
        endpoint: this.endpoint,
        idempotencyKey: context.correlationId,
      },
    })

    // Execute payment
    const receipt = await this.client.pay({
      price: this.pricePerRequest,
      vendor: this.vendor,
      endpoint: this.endpoint,
      description: `Text transform: ${input.operation}`,
      correlationId: context.correlationId,
    })

    // Emit payment settled event
    await context.emit({
      type: 'payment.settled',
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      agentId: context.agentId,
      taskId: context.taskId,
      provenance: {},
      payload: {
        receipt,
        verified: true,
      },
    })

    // Simulate service call (in production, would call actual API)
    let result: string
    switch (input.operation) {
      case 'uppercase':
        result = input.text.toUpperCase()
        break
      case 'lowercase':
        result = input.text.toLowerCase()
        break
      case 'reverse':
        result = input.text.split('').reverse().join('')
        break
      default:
        result = input.text
    }

    const duration = Date.now() - startTime

    return {
      data: { result },
      receipt,
      cost: receipt.amount,
      duration,
      vendor: this.vendor,
    }
  }

  getVendor(): Address {
    return this.vendor
  }

  getEndpoint(): string {
    return this.endpoint
  }
}

/**
 * Data fetch service adapter
 * Simulates fetching data from an external source
 */
export class DataFetchAdapter implements ServiceAdapter<{ query: string }, { data: unknown }> {
  name = 'data-fetch'
  private client: PaymentClient
  private vendor: Address
  private endpoint: string
  private pricePerRequest: string

  constructor(client: PaymentClient, vendor: Address, endpoint: string, pricePerRequest: string = '$0.05') {
    this.client = client
    this.vendor = vendor
    this.endpoint = endpoint
    this.pricePerRequest = pricePerRequest
  }

  async estimateCost(input: { query: string }): Promise<number> {
    return usdToLamports(this.pricePerRequest)
  }

  async execute(
    input: { query: string },
    context: AdapterContext
  ): Promise<AdapterResult<{ data: unknown }>> {
    const startTime = Date.now()

    // Execute payment
    const receipt = await this.client.pay({
      price: this.pricePerRequest,
      vendor: this.vendor,
      endpoint: this.endpoint,
      description: `Data fetch: ${input.query}`,
      correlationId: context.correlationId,
    })

    // Simulate data fetch
    const data = {
      query: input.query,
      results: [
        { id: 1, value: 'Sample data 1' },
        { id: 2, value: 'Sample data 2' },
      ],
      timestamp: Date.now(),
    }

    const duration = Date.now() - startTime

    return {
      data: { data },
      receipt,
      cost: receipt.amount,
      duration,
      vendor: this.vendor,
    }
  }

  getVendor(): Address {
    return this.vendor
  }

  getEndpoint(): string {
    return this.endpoint
  }
}
