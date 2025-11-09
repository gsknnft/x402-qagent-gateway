# Building Custom Service Adapters

**Learn how to integrate any X402-enabled service with your autonomous agents**

Service adapters are the bridge between your agent and external services. This tutorial shows you how to build robust, production-ready adapters for any X402-enabled API.

---

## Table of Contents

- [What is a Service Adapter?](#what-is-a-service-adapter)
- [Adapter Interface](#adapter-interface)
- [Building Your First Adapter](#building-your-first-adapter)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)
- [Real-World Examples](#real-world-examples)
- [Testing Adapters](#testing-adapters)

---

## What is a Service Adapter?

A **service adapter** implements the integration logic for a specific X402-enabled service. It handles:

✅ **Service Communication** - HTTP requests, WebSockets, etc.  
✅ **Payment Integration** - X402 payment proof handling  
✅ **Error Handling** - Retries, timeouts, circuit breakers  
✅ **Data Transformation** - Converting between agent and service formats  
✅ **Cost Estimation** - Predicting request costs  

Think of adapters as **plugins** that teach your agent how to use specific services.

---

## Adapter Interface

All adapters implement the `ServiceAdapter` interface:

```typescript
interface ServiceAdapter {
  /**
   * Execute a service request with X402 payment
   * 
   * @param input - Service-specific input data
   * @param context - Agent execution context
   * @returns Result with data, cost, and metadata
   */
  execute(input: unknown, context: AdapterContext): Promise<AdapterResult>
}

interface AdapterContext {
  correlationId: string       // For telemetry tracing
  agentId: string            // Agent identifier
  budgetAvailable: number    // Current budget (lamports)
  retryAttempt?: number      // Retry count (if applicable)
}

interface AdapterResult {
  success: boolean
  data?: unknown             // Service response data
  error?: string            // Error message (if failed)
  cost: number              // Actual cost in lamports
  metadata?: Record<string, unknown>  // Additional context
}
```

---

## Building Your First Adapter

### Example: Weather API Adapter

Let's build an adapter for a hypothetical weather API that accepts X402 payments.

#### Step 1: Define Input/Output Types

```typescript
// weather-adapter.ts

interface WeatherInput {
  location: string
  units?: 'metric' | 'imperial'
}

interface WeatherOutput {
  temperature: number
  conditions: string
  humidity: number
  windSpeed: number
}
```

#### Step 2: Implement the Adapter

```typescript
import { ServiceAdapter, AdapterContext, AdapterResult } from '@x402-qagent/agent-sdk'
import { X402Client } from '@x402-qagent/middleware'

export class WeatherAdapter implements ServiceAdapter {
  private client: X402Client
  private vendorAddress: string
  private baseUrl: string
  
  constructor(config: {
    vendorAddress: string
    baseUrl: string
    network?: string
  }) {
    this.vendorAddress = config.vendorAddress
    this.baseUrl = config.baseUrl
    this.client = new X402Client({
      network: config.network || 'solana-devnet',
      facilitatorUrl: 'https://x402.org/facilitator',
    })
  }
  
  async execute(
    input: WeatherInput,
    context: AdapterContext
  ): Promise<AdapterResult> {
    try {
      const { location, units = 'metric' } = input
      
      // 1. Estimate cost (most weather APIs charge by request)
      const estimatedCost = 5_000 // 5k lamports per request
      
      // 2. Check budget
      if (context.budgetAvailable < estimatedCost) {
        return {
          success: false,
          error: 'Insufficient budget',
          cost: 0,
        }
      }
      
      // 3. Make X402 payment
      const receipt = await this.client.pay({
        vendor: this.vendorAddress,
        amount: estimatedCost,
        endpoint: `${this.baseUrl}/weather`,
        correlationId: context.correlationId,
      })
      
      // 4. Call service with payment proof
      const response = await fetch(`${this.baseUrl}/weather`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Signature': receipt.signature,
          'X-Correlation-ID': context.correlationId,
        },
        body: JSON.stringify({ location, units }),
      })
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.statusText}`)
      }
      
      // 5. Parse and return result
      const data: WeatherOutput = await response.json()
      
      return {
        success: true,
        data,
        cost: receipt.amount,
        metadata: {
          location,
          units,
          timestamp: new Date().toISOString(),
        },
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        cost: 0,
        metadata: {
          retryAttempt: context.retryAttempt,
        },
      }
    }
  }
}
```

#### Step 3: Use the Adapter

```typescript
import { BudgetManager, DefaultAgentExecutor } from '@x402-qagent/agent-sdk'
import { WeatherAdapter } from './weather-adapter'

async function main() {
  const budget = new BudgetManager(100_000)
  const executor = new DefaultAgentExecutor(budget, 'weather-agent', emitTelemetry)
  
  const weatherAdapter = new WeatherAdapter({
    vendorAddress: 'WeatherVendorWallet123',
    baseUrl: 'https://api.weather-x402.com',
  })
  
  const result = await executor.execute(
    {
      type: 'weather-query',
      input: { location: 'San Francisco, CA', units: 'metric' },
      estimatedCost: 5_000,
      vendor: 'WeatherVendorWallet123',
    },
    weatherAdapter
  )
  
  if (result.success) {
    console.log('Temperature:', result.data.temperature, '°C')
    console.log('Conditions:', result.data.conditions)
  }
}
```

---

## Advanced Patterns

### 1. Retry Logic with Exponential Backoff

```typescript
export class RobustWeatherAdapter implements ServiceAdapter {
  private maxRetries = 3
  private backoffMs = 1000
  
  async execute(input: WeatherInput, context: AdapterContext): Promise<AdapterResult> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.executeOnce(input, {
          ...context,
          retryAttempt: attempt,
        })
      } catch (error) {
        lastError = error
        
        if (attempt < this.maxRetries) {
          const delay = this.backoffMs * Math.pow(2, attempt)
          await this.sleep(delay)
        }
      }
    }
    
    return {
      success: false,
      error: `Failed after ${this.maxRetries} retries: ${lastError?.message}`,
      cost: 0,
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### 2. Circuit Breaker Pattern

```typescript
export class CircuitBreakerWeatherAdapter implements ServiceAdapter {
  private failureCount = 0
  private lastFailureTime = 0
  private circuitOpen = false
  
  private readonly failureThreshold = 5
  private readonly resetTimeoutMs = 60_000 // 1 minute
  
  async execute(input: WeatherInput, context: AdapterContext): Promise<AdapterResult> {
    // Check if circuit is open
    if (this.circuitOpen) {
      const timeSinceFailure = Date.now() - this.lastFailureTime
      
      if (timeSinceFailure < this.resetTimeoutMs) {
        return {
          success: false,
          error: 'Circuit breaker is open - service temporarily unavailable',
          cost: 0,
        }
      }
      
      // Reset circuit
      this.circuitOpen = false
      this.failureCount = 0
    }
    
    try {
      const result = await this.executeOnce(input, context)
      
      if (result.success) {
        this.failureCount = 0
      } else {
        this.recordFailure()
      }
      
      return result
      
    } catch (error) {
      this.recordFailure()
      throw error
    }
  }
  
  private recordFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.failureThreshold) {
      this.circuitOpen = true
      console.warn(`Circuit breaker opened after ${this.failureCount} failures`)
    }
  }
}
```

### 3. Caching for Cost Optimization

```typescript
export class CachedWeatherAdapter implements ServiceAdapter {
  private cache = new Map<string, { data: WeatherOutput; expiresAt: number }>()
  private cacheTTL = 5 * 60 * 1000 // 5 minutes
  
  async execute(input: WeatherInput, context: AdapterContext): Promise<AdapterResult> {
    const cacheKey = this.getCacheKey(input)
    const cached = this.cache.get(cacheKey)
    
    // Return cached result if valid
    if (cached && cached.expiresAt > Date.now()) {
      return {
        success: true,
        data: cached.data,
        cost: 0, // No payment needed for cached result!
        metadata: {
          cached: true,
          cacheAge: Date.now() - (cached.expiresAt - this.cacheTTL),
        },
      }
    }
    
    // Fetch fresh data
    const result = await this.executeOnce(input, context)
    
    // Cache successful results
    if (result.success && result.data) {
      this.cache.set(cacheKey, {
        data: result.data as WeatherOutput,
        expiresAt: Date.now() + this.cacheTTL,
      })
    }
    
    return result
  }
  
  private getCacheKey(input: WeatherInput): string {
    return `${input.location}:${input.units || 'metric'}`
  }
}
```

### 4. Batch Request Optimization

```typescript
export class BatchWeatherAdapter implements ServiceAdapter {
  private batchQueue: Array<{ input: WeatherInput; resolve: Function }> = []
  private batchTimer: NodeJS.Timeout | null = null
  private batchSize = 10
  private batchTimeoutMs = 1000
  
  async execute(input: WeatherInput, context: AdapterContext): Promise<AdapterResult> {
    return new Promise((resolve) => {
      // Add to batch queue
      this.batchQueue.push({ input, resolve })
      
      // Process batch if size reached
      if (this.batchQueue.length >= this.batchSize) {
        this.processBatch()
        return
      }
      
      // Set timer to process batch
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), this.batchTimeoutMs)
      }
    })
  }
  
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return
    
    const batch = this.batchQueue.splice(0, this.batchSize)
    clearTimeout(this.batchTimer!)
    this.batchTimer = null
    
    try {
      // Make batch API call (if service supports it)
      const locations = batch.map(item => item.input.location)
      const batchResult = await this.fetchBatchWeather(locations)
      
      // Resolve individual promises
      batch.forEach((item, index) => {
        item.resolve({
          success: true,
          data: batchResult[index],
          cost: 2_500, // Cheaper than individual requests!
        })
      })
    } catch (error) {
      batch.forEach(item => {
        item.resolve({
          success: false,
          error: error.message,
          cost: 0,
        })
      })
    }
  }
}
```

---

## Best Practices

### 1. Always Validate Input

```typescript
async execute(input: unknown, context: AdapterContext): Promise<AdapterResult> {
  // Validate input structure
  if (!this.isValidInput(input)) {
    return {
      success: false,
      error: 'Invalid input: expected { location: string, units?: string }',
      cost: 0,
    }
  }
  
  const validatedInput = input as WeatherInput
  // ... proceed with execution
}

private isValidInput(input: unknown): input is WeatherInput {
  return (
    typeof input === 'object' &&
    input !== null &&
    'location' in input &&
    typeof input.location === 'string'
  )
}
```

### 2. Provide Accurate Cost Estimates

```typescript
// Estimate cost based on input complexity
private estimateCost(input: WeatherInput): number {
  let cost = 5_000 // Base cost
  
  // Premium locations cost more
  if (this.isPremiumLocation(input.location)) {
    cost += 2_500
  }
  
  // Hourly forecasts cost more than current conditions
  if (input.includeForecast) {
    cost += input.forecastHours * 500
  }
  
  return cost
}
```

### 3. Handle Errors Gracefully

```typescript
try {
  const response = await fetch(endpoint, options)
  
  if (!response.ok) {
    // Specific error handling by status code
    switch (response.status) {
      case 402:
        return { success: false, error: 'Payment required but not provided', cost: 0 }
      case 429:
        return { success: false, error: 'Rate limit exceeded', cost: 0 }
      case 503:
        return { success: false, error: 'Service temporarily unavailable', cost: 0 }
      default:
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}`, cost: 0 }
    }
  }
  
  const data = await response.json()
  return { success: true, data, cost: estimatedCost }
  
} catch (error) {
  // Network errors, timeouts, etc.
  return {
    success: false,
    error: `Network error: ${error.message}`,
    cost: 0,
    metadata: { errorType: error.name },
  }
}
```

### 4. Add Comprehensive Logging

```typescript
async execute(input: WeatherInput, context: AdapterContext): Promise<AdapterResult> {
  const startTime = Date.now()
  
  console.log(`[${context.correlationId}] Weather request started`, {
    location: input.location,
    budgetAvailable: context.budgetAvailable,
  })
  
  try {
    const result = await this.executeOnce(input, context)
    
    console.log(`[${context.correlationId}] Weather request completed`, {
      success: result.success,
      cost: result.cost,
      duration: Date.now() - startTime,
    })
    
    return result
    
  } catch (error) {
    console.error(`[${context.correlationId}] Weather request failed`, {
      error: error.message,
      duration: Date.now() - startTime,
    })
    throw error
  }
}
```

### 5. Make Adapters Configurable

```typescript
export interface WeatherAdapterConfig {
  vendorAddress: string
  baseUrl: string
  network?: string
  timeout?: number
  retries?: number
  cacheTTL?: number
  circuitBreaker?: {
    enabled: boolean
    failureThreshold: number
    resetTimeout: number
  }
}

export class ConfigurableWeatherAdapter implements ServiceAdapter {
  constructor(private config: WeatherAdapterConfig) {
    this.config = {
      network: 'solana-devnet',
      timeout: 30_000,
      retries: 3,
      cacheTTL: 5 * 60 * 1000,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        resetTimeout: 60_000,
      },
      ...config,
    }
  }
  
  // ... implementation
}
```

---

## Real-World Examples

### Data Processing Pipeline Adapter

```typescript
export class DataPipelineAdapter implements ServiceAdapter {
  async execute(input: { data: unknown[]; pipeline: string[] }, context: AdapterContext) {
    let processedData = input.data
    let totalCost = 0
    
    for (const stage of input.pipeline) {
      const stageResult = await this.executeStage(stage, processedData, context)
      
      if (!stageResult.success) {
        return stageResult
      }
      
      processedData = stageResult.data
      totalCost += stageResult.cost
    }
    
    return {
      success: true,
      data: processedData,
      cost: totalCost,
      metadata: {
        stagesCompleted: input.pipeline.length,
        inputSize: input.data.length,
        outputSize: processedData.length,
      },
    }
  }
}
```

### AI Model Inference Adapter

```typescript
export class AIInferenceAdapter implements ServiceAdapter {
  async execute(
    input: { prompt: string; model: string; maxTokens: number },
    context: AdapterContext
  ): Promise<AdapterResult> {
    // Cost depends on token count
    const estimatedTokens = this.estimateTokens(input.prompt) + input.maxTokens
    const costPerToken = 10 // lamports
    const estimatedCost = estimatedTokens * costPerToken
    
    if (context.budgetAvailable < estimatedCost) {
      return {
        success: false,
        error: `Insufficient budget: need ${estimatedCost}, have ${context.budgetAvailable}`,
        cost: 0,
      }
    }
    
    const receipt = await this.client.pay({
      vendor: this.vendorAddress,
      amount: estimatedCost,
      endpoint: `${this.baseUrl}/inference`,
    })
    
    const response = await fetch(`${this.baseUrl}/inference`, {
      method: 'POST',
      headers: {
        'X-Payment-Signature': receipt.signature,
      },
      body: JSON.stringify({
        prompt: input.prompt,
        model: input.model,
        max_tokens: input.maxTokens,
      }),
    })
    
    const result = await response.json()
    
    return {
      success: true,
      data: {
        text: result.choices[0].text,
        tokensUsed: result.usage.total_tokens,
      },
      cost: result.usage.total_tokens * costPerToken,
      metadata: {
        model: input.model,
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
      },
    }
  }
}
```

---

## Testing Adapters

### Unit Tests

```typescript
import { WeatherAdapter } from './weather-adapter'

describe('WeatherAdapter', () => {
  let adapter: WeatherAdapter
  
  beforeEach(() => {
    adapter = new WeatherAdapter({
      vendorAddress: 'TestVendor123',
      baseUrl: 'http://localhost:3000',
    })
  })
  
  it('should execute weather request successfully', async () => {
    const result = await adapter.execute(
      { location: 'San Francisco' },
      {
        correlationId: 'test-123',
        agentId: 'test-agent',
        budgetAvailable: 100_000,
      }
    )
    
    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('temperature')
    expect(result.cost).toBeGreaterThan(0)
  })
  
  it('should fail when budget insufficient', async () => {
    const result = await adapter.execute(
      { location: 'San Francisco' },
      {
        correlationId: 'test-123',
        agentId: 'test-agent',
        budgetAvailable: 1_000, // Too low
      }
    )
    
    expect(result.success).toBe(false)
    expect(result.error).toContain('Insufficient budget')
    expect(result.cost).toBe(0)
  })
})
```

### Integration Tests

```typescript
describe('WeatherAdapter Integration', () => {
  it('should work end-to-end with real service', async () => {
    const budget = new BudgetManager(1_000_000)
    const executor = new DefaultAgentExecutor(budget, 'test-agent', emitTelemetry)
    const adapter = new WeatherAdapter({
      vendorAddress: process.env.WEATHER_VENDOR_ADDRESS!,
      baseUrl: process.env.WEATHER_API_URL!,
    })
    
    const result = await executor.execute(
      {
        type: 'weather',
        input: { location: 'New York' },
        estimatedCost: 5_000,
        vendor: process.env.WEATHER_VENDOR_ADDRESS!,
      },
      adapter
    )
    
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })
})
```

---

## Next Steps

Now that you can build custom adapters, explore:

- **[Agent Planning Strategies](./AGENT_STRATEGIES.md)** - Optimize vendor selection
- **[Fraud Detection](../fraud-detection/INTEGRATION.md)** - Protect against malicious services
- **[Privacy Patterns](../privacy/PATTERNS.md)** - Control data sharing

---

**🎉 You're now ready to integrate any X402-enabled service with your agents!**
