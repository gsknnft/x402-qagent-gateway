# API Reference

Complete API documentation for X402 Quantum Agent Gateway packages.

---

## Table of Contents

- [X402 Middleware Package](#x402-middleware-package)
- [Agent SDK Package](#agent-sdk-package)
- [Telemetry Core Package](#telemetry-core-package)
- [Type Definitions](#type-definitions)
- [Usage Examples](#usage-examples)

---

## X402 Middleware Package

**Package:** `@x402-qagent/middleware`  
**Purpose:** Reusable payment abstractions for X402 protocol

### X402Client

Core payment client for executing and verifying X402 payments.

```typescript
class X402Client {
  constructor(config: X402ClientConfig)
  
  async pay(request: PaymentRequest): Promise<PaymentReceipt>
  async verify(receipt: PaymentReceipt): Promise<boolean>
  getNetwork(): Network
}
```

**Configuration:**
```typescript
interface X402ClientConfig {
  network: Network                    // 'solana-devnet' | 'solana-mainnet-beta'
  facilitatorUrl?: string            // Optional facilitator endpoint
  retryConfig?: {
    maxRetries: number               // Max payment retry attempts
    backoffMs: number                // Initial backoff delay
    maxBackoffMs: number             // Maximum backoff delay
  }
}
```

**Payment Request:**
```typescript
interface PaymentRequest {
  vendor: Address                    // Vendor Solana address
  amount: number                     // Payment amount in lamports
  endpoint: string                   // Service endpoint URL
  correlationId: string             // Unique correlation ID for tracking
  idempotencyKey?: string           // Optional idempotency key
  metadata?: Record<string, unknown> // Optional metadata
}
```

**Payment Receipt:**
```typescript
interface PaymentReceipt {
  signature: string                  // Transaction signature
  vendor: Address                    // Vendor address
  amount: number                     // Amount paid in lamports
  timestamp: string                  // ISO 8601 timestamp
  verified: boolean                  // Whether receipt is verified
  correlationId: string             // Correlation ID from request
}
```

**Example:**
```typescript
import { X402Client } from '@x402-qagent/middleware'

const client = new X402Client({
  network: 'solana-devnet',
  facilitatorUrl: 'https://x402.org/facilitator',
  retryConfig: {
    maxRetries: 3,
    backoffMs: 1000,
    maxBackoffMs: 10000
  }
})

const receipt = await client.pay({
  vendor: 'SellerWallet123abc',
  amount: 10000,  // 10,000 lamports
  endpoint: 'https://seller.example.com/api/service',
  correlationId: 'abc-123'
})

const isValid = await client.verify(receipt)
console.log(`Payment verified: ${isValid}`)
```

---

### PolicyEngine

Budget enforcement and policy management.

```typescript
class PolicyEngine {
  constructor(policy: PaymentPolicy)
  
  async canSpend(amount: number, vendor: Address): Promise<boolean>
  async recordSpend(receipt: PaymentReceipt): Promise<void>
  async getBudgetStatus(): Promise<BudgetStatus>
  async resetBudget(): Promise<void>
}
```

**Payment Policy:**
```typescript
interface PaymentPolicy {
  allowedVendors: Address[]          // Vendor allowlist
  budgetCap: number                  // Max spending in window (lamports)
  budgetWindow: number               // Window duration in seconds
  rateLimits?: {                     // Per-vendor rate limits
    [vendor: Address]: number        // Max requests per window
  }
  provenance?: {                     // Metadata for all payments
    agentId?: string
    taskId?: string
    [key: string]: string | undefined
  }
  haltConditions?: {                 // When to halt spending
    maxConsecutiveFailures?: number
    settlementTimeoutMs?: number
  }
}
```

**Budget Status:**
```typescript
interface BudgetStatus {
  totalBudget: number               // Total budget cap
  spent: number                     // Amount spent in current window
  remaining: number                 // Remaining budget
  windowStart: string               // Window start timestamp
  windowEnd: string                 // Window end timestamp
  resetAt: string                   // When budget resets
}
```

**Example:**
```typescript
import { PolicyEngine } from '@x402-qagent/middleware'

const policy = {
  allowedVendors: ['Vendor1Address', 'Vendor2Address'],
  budgetCap: 1000000,  // 1M lamports
  budgetWindow: 3600,  // 1 hour
  rateLimits: {
    'Vendor1Address': 10,  // Max 10 requests per hour
    'Vendor2Address': 5
  },
  haltConditions: {
    maxConsecutiveFailures: 3
  }
}

const engine = new PolicyEngine(policy)

// Check if can spend
const canSpend = await engine.canSpend(10000, 'Vendor1Address')
if (!canSpend) {
  console.log('Budget exhausted or vendor not allowed')
  return
}

// Record payment
await engine.recordSpend(receipt)

// Check status
const status = await engine.getBudgetStatus()
console.log(`Remaining: ${status.remaining} lamports`)
```

---

### Payment Decorator

Wrap any function with automatic payment handling.

```typescript
function withPayment<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  config: PaymentDecoratorConfig
): (...args: TArgs) => Promise<TReturn>
```

**Decorator Config:**
```typescript
interface PaymentDecoratorConfig {
  client: X402Client                 // Payment client instance
  vendor: Address                    // Vendor address
  price: string | number             // Price in USD string or lamports
  endpoint?: string                  // Optional service endpoint
  extractCorrelationId?: (...args: unknown[]) => string
}
```

**Example:**
```typescript
import { withPayment, X402Client } from '@x402-qagent/middleware'

const client = new X402Client({ network: 'solana-devnet' })

// Original function
async function fetchData(query: string): Promise<Data> {
  const response = await fetch(`https://api.example.com/data?q=${query}`)
  return response.json()
}

// Wrapped with payment
const paidFetchData = withPayment(fetchData, {
  client,
  vendor: 'DataVendorAddress',
  price: '$0.05',
  endpoint: 'https://api.example.com/data'
})

// Usage - payment happens automatically!
const data = await paidFetchData('my query')
```

---

### Utility Functions

```typescript
// Address validation
function isValidAddress(address: string): boolean

// Amount conversion
function convertUSDToLamports(usd: string, solPrice: number): number

// Signature validation
function isValidSignature(signature: string): boolean

// Correlation ID generation
function generateCorrelationId(): string
```

**Example:**
```typescript
import { isValidAddress, convertUSDToLamports } from '@x402-qagent/middleware'

const address = 'SomeAddress123'
if (!isValidAddress(address)) {
  throw new Error('Invalid Solana address')
}

const lamports = convertUSDToLamports('$0.01', 150)  // SOL price = $150
console.log(`$0.01 = ${lamports} lamports`)
```

---

## Agent SDK Package

**Package:** `@x402-qagent/agent-sdk`  
**Purpose:** Framework for building autonomous economic agents

### BudgetManager

Track and manage agent spending with reservations.

```typescript
class BudgetManager {
  constructor(initialBudget: number, config?: BudgetConfig)
  
  async reserve(amount: number, actionId: string): Promise<boolean>
  async commit(actionId: string, actualCost: number): Promise<void>
  async release(actionId: string): Promise<void>
  async getBalance(): Promise<number>
  async getReserved(): Promise<number>
  async getAvailable(): Promise<number>
  async reset(newBudget: number): Promise<void>
}
```

**Budget Config:**
```typescript
interface BudgetConfig {
  cap: number                        // Budget cap
  window: number                     // Window in seconds
  autoReset: boolean                 // Auto-reset on window expiry
  onExhausted?: () => void          // Callback when budget exhausted
}
```

**Example:**
```typescript
import { BudgetManager } from '@x402-qagent/agent-sdk'

const budget = new BudgetManager(1000000, {  // 1M lamports
  cap: 1000000,
  window: 3600,
  autoReset: true,
  onExhausted: () => console.log('Budget exhausted!')
})

// Reserve budget for action
const actionId = 'action-001'
const reserved = await budget.reserve(10000, actionId)

if (reserved) {
  try {
    // Execute action...
    const actualCost = 9500
    await budget.commit(actionId, actualCost)
  } catch (error) {
    // Release reservation on failure
    await budget.release(actionId)
  }
}

// Check balances
console.log(`Available: ${await budget.getAvailable()} lamports`)
console.log(`Reserved: ${await budget.getReserved()} lamports`)
```

---

### AgentExecutor

Execute agent actions with payment and telemetry.

```typescript
class DefaultAgentExecutor implements AgentExecutor {
  constructor(
    budgetManager: BudgetManager,
    agentId: string,
    emitTelemetry: (event: TelemetryEvent) => Promise<void>
  )
  
  async execute<TInput, TOutput>(
    action: AgentAction,
    adapter: ServiceAdapter<TInput, TOutput>
  ): Promise<ExecutionResult<TOutput>>
}
```

**Agent Action:**
```typescript
interface AgentAction {
  id: string                         // Unique action ID
  type: string                       // Action type
  input: unknown                     // Action input
  priority: number                   // Priority (0-10)
  estimatedCost?: number            // Estimated cost in lamports
  deadline?: Date                    // Optional deadline
}
```

**Execution Result:**
```typescript
interface ExecutionResult<TOutput> {
  success: boolean                   // Whether action succeeded
  output?: TOutput                   // Action output (if successful)
  error?: Error                      // Error (if failed)
  cost: number                       // Actual cost in lamports
  duration: number                   // Duration in milliseconds
  receipt?: PaymentReceipt          // Payment receipt
}
```

**Example:**
```typescript
import { DefaultAgentExecutor, BudgetManager } from '@x402-qagent/agent-sdk'
import { ConsoleSink } from '@x402-qagent/telemetry'

const budget = new BudgetManager(1000000)
const telemetry = new ConsoleSink()

const executor = new DefaultAgentExecutor(
  budget,
  'agent-001',
  async (event) => await telemetry.emit(event)
)

const action = {
  id: 'action-001',
  type: 'text-transform',
  input: { text: 'hello', operation: 'uppercase' },
  priority: 5,
  estimatedCost: 10000
}

const result = await executor.execute(action, textTransformAdapter)

if (result.success) {
  console.log(`Result: ${result.output}`)
  console.log(`Cost: ${result.cost} lamports`)
}
```

---

### ServiceAdapter

Pluggable service implementation interface.

```typescript
interface ServiceAdapter<TInput, TOutput> {
  name: string
  
  estimateCost(input: TInput): Promise<number>
  execute(input: TInput, context: AdapterContext): Promise<AdapterResult<TOutput>>
  getVendor(): Address
  getEndpoint(): string
}
```

**Adapter Context:**
```typescript
interface AdapterContext {
  correlationId: string             // Correlation ID for tracking
  agentId: string                   // Executing agent ID
  paymentClient: X402Client         // Payment client for making payments
}
```

**Adapter Result:**
```typescript
interface AdapterResult<TOutput> {
  data: TOutput                      // Service result data
  receipt: PaymentReceipt           // Payment receipt
  cost: number                       // Actual cost
}
```

**Example - Custom Adapter:**
```typescript
import { ServiceAdapter, AdapterContext, AdapterResult } from '@x402-qagent/agent-sdk'

class WeatherServiceAdapter implements ServiceAdapter<string, WeatherData> {
  name = 'weather-service'
  
  async estimateCost(location: string): Promise<number> {
    return 5000  // 5,000 lamports per query
  }
  
  async execute(
    location: string,
    context: AdapterContext
  ): Promise<AdapterResult<WeatherData>> {
    // Pay for service
    const receipt = await context.paymentClient.pay({
      vendor: this.getVendor(),
      amount: await this.estimateCost(location),
      endpoint: this.getEndpoint(),
      correlationId: context.correlationId
    })
    
    // Call service with payment proof
    const response = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers: {
        'X-Payment-Signature': receipt.signature,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ location })
    })
    
    const data = await response.json()
    
    return {
      data,
      receipt,
      cost: receipt.amount
    }
  }
  
  getVendor(): Address {
    return 'WeatherVendorAddress'
  }
  
  getEndpoint(): string {
    return 'https://weather.example.com/api/forecast'
  }
}
```

---

### AgentPlanner

Action selection strategies.

```typescript
interface AgentPlanner {
  plan(state: AgentState): Promise<AgentAction[]>
  selectAction(candidates: AgentAction[], budget: number): Promise<AgentAction | null>
}
```

**Built-in Planners:**

**1. GreedyPlanner:**
```typescript
class GreedyPlanner implements AgentPlanner {
  // Selects highest priority action that fits budget
  async selectAction(
    candidates: AgentAction[],
    budget: number
  ): Promise<AgentAction | null> {
    return candidates
      .filter(a => (a.estimatedCost || 0) <= budget)
      .sort((a, b) => b.priority - a.priority)[0] || null
  }
}
```

**2. CostOptimizerPlanner:**
```typescript
class CostOptimizerPlanner implements AgentPlanner {
  // Selects cheapest action that fits budget
  async selectAction(
    candidates: AgentAction[],
    budget: number
  ): Promise<AgentAction | null> {
    return candidates
      .filter(a => (a.estimatedCost || 0) <= budget)
      .sort((a, b) => (a.estimatedCost || 0) - (b.estimatedCost || 0))[0] || null
  }
}
```

**Example:**
```typescript
import { GreedyPlanner, CostOptimizerPlanner } from '@x402-qagent/agent-sdk'

const greedyPlanner = new GreedyPlanner()
const costPlanner = new CostOptimizerPlanner()

const actions = [
  { id: '1', type: 'A', priority: 10, estimatedCost: 10000 },
  { id: '2', type: 'B', priority: 5, estimatedCost: 5000 },
  { id: '3', type: 'C', priority: 8, estimatedCost: 8000 }
]

const budget = 15000

// Greedy: selects action 1 (highest priority)
const greedyChoice = await greedyPlanner.selectAction(actions, budget)

// Cost optimizer: selects action 2 (cheapest)
const costChoice = await costPlanner.selectAction(actions, budget)
```

---

## Telemetry Core Package

**Package:** `@x402-qagent/telemetry`  
**Purpose:** Event tracking and lineage for agent operations

### Event Types

```typescript
type TelemetryEventType =
  | 'payment.initiated'
  | 'payment.settled'
  | 'payment.failed'
  | 'action.started'
  | 'action.completed'
  | 'budget.delta'
  | 'agent.halted'
  | 'sla.outcome'
```

### Base Event Structure

```typescript
interface TelemetryEvent<T = unknown> {
  type: TelemetryEventType
  timestamp: string                  // ISO 8601
  correlationId: string             // For tracing
  agentId: string                   // Agent identifier
  taskId?: string                   // Optional task ID
  provenance: Record<string, string> // Metadata
  payload: T                         // Event-specific data
}
```

---

### ConsoleSink

Color-coded console output for telemetry events.

```typescript
class ConsoleSink {
  constructor(config?: ConsoleSinkConfig)
  
  async emit(event: TelemetryEvent): Promise<void>
}
```

**Config:**
```typescript
interface ConsoleSinkConfig {
  colorize?: boolean                 // Enable color output (default: true)
  verbose?: boolean                  // Include all event details (default: false)
  filter?: (event: TelemetryEvent) => boolean  // Event filter
}
```

**Example:**
```typescript
import { ConsoleSink } from '@x402-qagent/telemetry'

const sink = new ConsoleSink({
  colorize: true,
  verbose: false,
  filter: (event) => event.type.startsWith('payment.')
})

await sink.emit({
  type: 'payment.settled',
  timestamp: new Date().toISOString(),
  correlationId: 'abc-123',
  agentId: 'agent-001',
  provenance: {},
  payload: {
    receipt: { signature: 'sig_abc', amount: 10000 },
    verified: true
  }
})

// Output (colorized):
// [GREEN] payment.settled { ... }
```

---

### JSONLSink

Append-only JSONL file for audit trail.

```typescript
class JSONLSink {
  constructor(config: JSONLSinkConfig)
  
  async emit(event: TelemetryEvent): Promise<void>
  async close(): Promise<void>
}
```

**Config:**
```typescript
interface JSONLSinkConfig {
  filepath: string                   // Path to JSONL file
  autoFlush?: boolean               // Auto-flush after each write (default: true)
}
```

**Example:**
```typescript
import { JSONLSink } from '@x402-qagent/telemetry'

const sink = new JSONLSink({
  filepath: './logs/agent-telemetry.jsonl',
  autoFlush: true
})

await sink.emit(event)

// Later, read events
const events = require('fs')
  .readFileSync('./logs/agent-telemetry.jsonl', 'utf-8')
  .split('\n')
  .filter(Boolean)
  .map(JSON.parse)

// Filter by correlation ID
const traceEvents = events.filter(e => e.correlationId === 'abc-123')
```

---

### SigilNetSink

Integration stub for SigilNet field closure layer.

```typescript
class SigilNetSink {
  constructor(config: SigilNetSinkConfig)
  
  async emit(event: TelemetryEvent): Promise<void>
}
```

**Config:**
```typescript
interface SigilNetSinkConfig {
  endpoint: string                   // SigilNet gateway URL
  authToken?: string                 // Optional auth token
  fieldParams?: {
    negentropyEnabled?: boolean
    trustDiffusionEnabled?: boolean
  }
  categoricalBridge?: boolean       // Use Day convolution
}
```

**Example:**
```typescript
import { SigilNetSink } from '@x402-qagent/telemetry'

const sink = new SigilNetSink({
  endpoint: 'https://sigilnet.example.com/field/events',
  authToken: process.env.SIGILNET_TOKEN,
  fieldParams: {
    negentropyEnabled: true,
    trustDiffusionEnabled: true
  },
  categoricalBridge: true
})

// Events automatically transformed and sent to SigilNet
await sink.emit(event)
```

---

## Type Definitions

### Common Types

```typescript
// Solana address type
type Address = string

// Network types
type Network = 'solana-devnet' | 'solana-mainnet-beta' | 'solana-testnet'

// Agent state
interface AgentState {
  agentId: string
  budget: number
  reserved: number
  completedActions: number
  failedActions: number
  totalSpent: number
}

// Vendor metadata
interface VendorMetadata {
  address: Address
  name: string
  description: string
  services: string[]
  pricing: Record<string, number>
  sla: {
    maxLatency: number
    minAvailability: number
  }
  reputation: {
    totalTransactions: number
    successRate: number
  }
}
```

---

## Usage Examples

### Complete Agent Example

```typescript
import {
  X402Client,
  PolicyEngine,
  PaymentPolicy
} from '@x402-qagent/middleware'

import {
  BudgetManager,
  DefaultAgentExecutor,
  GreedyPlanner,
  ServiceAdapter
} from '@x402-qagent/agent-sdk'

import {
  ConsoleSink,
  JSONLSink
} from '@x402-qagent/telemetry'

// 1. Setup payment middleware
const client = new X402Client({
  network: 'solana-devnet',
  facilitatorUrl: 'https://x402.org/facilitator'
})

const policy: PaymentPolicy = {
  allowedVendors: ['VendorAddress1'],
  budgetCap: 1000000,
  budgetWindow: 3600,
  rateLimits: { 'VendorAddress1': 10 }
}

const policyEngine = new PolicyEngine(policy)

// 2. Setup agent
const budget = new BudgetManager(1000000)
const planner = new GreedyPlanner()

// 3. Setup telemetry
const consoleSink = new ConsoleSink({ colorize: true })
const jsonlSink = new JSONLSink({ filepath: './logs/agent.jsonl' })

const emitTelemetry = async (event: TelemetryEvent) => {
  await Promise.all([
    consoleSink.emit(event),
    jsonlSink.emit(event)
  ])
}

// 4. Create executor
const executor = new DefaultAgentExecutor(
  budget,
  'my-agent-001',
  emitTelemetry
)

// 5. Define actions
const actions = [
  {
    id: 'action-1',
    type: 'text-transform',
    input: { text: 'hello', operation: 'uppercase' },
    priority: 10,
    estimatedCost: 10000
  }
]

// 6. Execute actions
for (const action of actions) {
  const selected = await planner.selectAction([action], await budget.getAvailable())
  
  if (selected) {
    const result = await executor.execute(selected, textTransformAdapter)
    
    if (result.success) {
      console.log(`✅ Action completed: ${result.output}`)
    } else {
      console.log(`❌ Action failed: ${result.error}`)
    }
  }
}
```

---

### Multi-Sink Telemetry

```typescript
import {
  ConsoleSink,
  JSONLSink,
  SigilNetSink,
  TelemetryEvent
} from '@x402-qagent/telemetry'

class MultiSinkTelemetry {
  private sinks: Array<ConsoleSink | JSONLSink | SigilNetSink>
  
  constructor(sinks: Array<ConsoleSink | JSONLSink | SigilNetSink>) {
    this.sinks = sinks
  }
  
  async emit(event: TelemetryEvent): Promise<void> {
    await Promise.all(
      this.sinks.map(sink => sink.emit(event))
    )
  }
}

// Usage
const telemetry = new MultiSinkTelemetry([
  new ConsoleSink({ colorize: true }),
  new JSONLSink({ filepath: './logs/agent.jsonl' }),
  new SigilNetSink({ endpoint: 'https://sigilnet.example.com' })
])

await telemetry.emit(event)
// Event sent to console, file, and SigilNet simultaneously
```

---

### Custom Planner Example

```typescript
import { AgentPlanner, AgentAction, AgentState } from '@x402-qagent/agent-sdk'

class DeadlineAwarePlanner implements AgentPlanner {
  async plan(state: AgentState): Promise<AgentAction[]> {
    // Return all available actions
    return this.getAllActions()
  }
  
  async selectAction(
    candidates: AgentAction[],
    budget: number
  ): Promise<AgentAction | null> {
    const now = Date.now()
    
    // Filter by budget and deadline
    const viable = candidates.filter(action => {
      const withinBudget = (action.estimatedCost || 0) <= budget
      const beforeDeadline = !action.deadline || 
        action.deadline.getTime() > now
      return withinBudget && beforeDeadline
    })
    
    if (viable.length === 0) return null
    
    // Sort by urgency (closest deadline first)
    viable.sort((a, b) => {
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return a.deadline.getTime() - b.deadline.getTime()
    })
    
    return viable[0]
  }
  
  private getAllActions(): AgentAction[] {
    // Implement action retrieval logic
    return []
  }
}
```

---

## Error Handling

All async methods can throw the following errors:

```typescript
class PaymentError extends Error {
  constructor(message: string, public code: string) {
    super(message)
  }
}

// Error codes:
// - INSUFFICIENT_BUDGET
// - VENDOR_NOT_ALLOWED
// - RATE_LIMIT_EXCEEDED
// - PAYMENT_VERIFICATION_FAILED
// - NETWORK_ERROR
// - TIMEOUT
```

**Example:**
```typescript
try {
  await executor.execute(action, adapter)
} catch (error) {
  if (error instanceof PaymentError) {
    switch (error.code) {
      case 'INSUFFICIENT_BUDGET':
        console.log('Budget exhausted, waiting for reset')
        break
      case 'VENDOR_NOT_ALLOWED':
        console.log('Vendor not in allowlist')
        break
      default:
        console.error('Payment error:', error.message)
    }
  } else {
    throw error
  }
}
```

---

## TypeScript Support

All packages are fully typed with TypeScript. Import types directly:

```typescript
import type {
  PaymentRequest,
  PaymentReceipt,
  PaymentPolicy,
  BudgetStatus
} from '@x402-qagent/middleware'

import type {
  AgentAction,
  AgentState,
  ServiceAdapter,
  ExecutionResult
} from '@x402-qagent/agent-sdk'

import type {
  TelemetryEvent,
  TelemetryEventType
} from '@x402-qagent/telemetry'
```

---

## Version Compatibility

| Package | Version | Node.js | TypeScript |
|---------|---------|---------|------------|
| @x402-qagent/middleware | 1.0.0 | >=20.0.0 | >=5.0.0 |
| @x402-qagent/agent-sdk | 1.0.0 | >=20.0.0 | >=5.0.0 |
| @x402-qagent/telemetry | 1.0.0 | >=20.0.0 | >=5.0.0 |

---

## Support

For API questions or issues:
- Open an issue on GitHub
- Check examples in `examples/` directory
- Review test files for usage patterns

---

**Last Updated:** November 2025  
**API Version:** 1.0.0
