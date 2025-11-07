# Architecture - X402 Quantum Agent Gateway

## Overview

This project implements an **autonomous agent economy** using X402 micropayments on Solana. Unlike simple payment-gated APIs, this demonstrates agents that act as economic entities with budgets, policies, and decision-making capabilities.

## Core Principles

1. **Economic Autonomy** - Agents decide what to buy, when, and from whom
2. **Verifiable Lineage** - Every payment and action is tracked with correlation IDs
3. **Composability** - Reusable middleware and pluggable adapters
4. **Integration Ready** - Designed for future SigilNet/QVera connection

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Buyer Agent                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Agent Planner                        │  │
│  │  - Selects next action                                │  │
│  │  - Optimizes for cost or priority                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Budget Manager                        │  │
│  │  - Tracks spending vs cap                             │  │
│  │  - Reserves budget for pending actions                │  │
│  │  - Enforces window-based limits                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Agent Executor                        │  │
│  │  - Executes actions via adapters                      │  │
│  │  - Emits telemetry events                             │  │
│  │  - Handles payment & verification                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Service Adapters                         │  │
│  │  - TextTransform, DataFetch, ComputeTask, etc.        │  │
│  │  - Pluggable service implementations                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ X402 Payment
┌─────────────────────────────────────────────────────────────┐
│                   Payment Middleware                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  X402 Client                          │  │
│  │  - Initiates payments                                 │  │
│  │  - Verifies receipts on-chain                         │  │
│  │  - Idempotency & retry logic                          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Policy Engine                         │  │
│  │  - Vendor allowlist enforcement                       │  │
│  │  - Rate limiting per vendor                           │  │
│  │  - Budget cap checks                                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Solana Blockchain                          │
│  - Payment settlement (400ms finality)                       │
│  - Transaction verification                                  │
│  - Devnet for testing, Mainnet for production                │
└─────────────────────────────────────────────────────────────┘
                            ↓ Service Request
┌─────────────────────────────────────────────────────────────┐
│                      Seller Service                          │
│  - Provides micro-services behind X402 paywall               │
│  - Verifies payment signatures                               │
│  - Returns results to buyer                                  │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### Payment Middleware (`packages/x402-middleware/`)

**Purpose:** Reusable X402 payment abstractions

**Key Components:**
- `X402Client` - Core payment client
  - `pay()` - Execute payment with idempotency key
  - `verify()` - Verify receipt on Solana blockchain
  - Automatic retry with exponential backoff
  
- `PolicyEngine` - Spending control
  - Vendor allowlist enforcement
  - Budget cap tracking (window-based)
  - Per-vendor rate limiting
  - Provenance tagging
  
- `withPayment()` decorator
  - Wraps any function with payment
  - Transparent payment injection
  - Correlation ID propagation

**Interfaces:**
```typescript
interface PaymentClient {
  pay(request: PaymentRequest): Promise<PaymentReceipt>
  verify(receipt: PaymentReceipt): Promise<boolean>
  getNetwork(): string
}

interface PolicyEngine {
  canSpend(amount: number, vendor: Address): Promise<boolean>
  recordSpend(receipt: PaymentReceipt): Promise<void>
  getBudgetStatus(): Promise<BudgetStatus>
}
```

### Agent SDK (`packages/agent-sdk/`)

**Purpose:** Framework for autonomous economic agents

**Key Components:**
- `BudgetManager` - Financial state tracking
  - Reserves budget for pending actions
  - Commits on success, releases on failure
  - Window-based budget resets
  
- `AgentExecutor` - Action execution engine
  - Estimates costs before execution
  - Reserves budget, executes action, commits/releases
  - Emits telemetry at every step
  
- `ServiceAdapter` - Service abstraction
  - `estimateCost()` - Cost prediction
  - `execute()` - Service invocation with payment
  - Pluggable implementations

- `AgentPlanner` - Decision making
  - Selects actions based on budget and priority
  - Strategies: Greedy (priority-first), CostOptimizer (cheapest-first)

**Interfaces:**
```typescript
interface ServiceAdapter<TInput, TOutput> {
  name: string
  estimateCost(input: TInput): Promise<number>
  execute(input: TInput, context: AdapterContext): Promise<AdapterResult<TOutput>>
  getVendor(): Address
  getEndpoint(): string
}

interface AgentPlanner {
  plan(state: AgentState): Promise<AgentAction[]>
  selectAction(candidates: AgentAction[], budget: number): Promise<AgentAction | null>
}
```

### Telemetry Layer (`packages/telemetry-core/`)

**Purpose:** Event tracking and lineage

**Event Types:**
- `payment.initiated` - Payment request started
- `payment.settled` - Payment verified on-chain
- `payment.failed` - Payment failed (with retry count)
- `action.started` - Agent action began
- `action.completed` - Agent action finished (success/failure)
- `budget.delta` - Budget state changed
- `agent.halted` - Agent stopped (exhausted budget, failures, etc.)
- `sla.outcome` - Service SLA tracking

**Sinks:**
- `ConsoleSink` - Colorized console output
- `JSONLSink` - Append-only JSONL file (for analysis)
- `SigilNetSink` - Stub for future SigilNet integration

**Event Structure:**
```typescript
interface BaseEvent {
  type: string
  timestamp: string
  correlationId: string  // For tracing
  agentId: string
  taskId?: string
  provenance: Record<string, string>
  payload: T
}
```

## Payment Flow

1. **Action Planning**
   - Agent planner selects next action
   - Budget manager checks affordability
   - Budget is reserved for action

2. **Payment Execution**
   - Service adapter estimates cost
   - X402 client initiates payment
   - Facilitator coordinates with Solana
   - Receipt returned with transaction signature

3. **Verification**
   - Receipt verified on Solana blockchain
   - Payment marked as settled
   - Event emitted with correlation ID

4. **Service Execution**
   - Adapter calls service with payment proof
   - Service verifies payment, executes request
   - Result returned to agent

5. **Budget Commit**
   - Reserved budget released
   - Actual cost committed to spending
   - Budget delta event emitted

## Policy Configuration

Agents are configured with policies that control spending:

```typescript
{
  allowedVendors: [Address],      // Vendor allowlist
  budgetCap: number,               // Max spending in window
  budgetWindow: number,            // Window in seconds
  rateLimits: {                    // Per-vendor request limits
    [vendor]: number
  },
  provenance: {                    // Metadata for all payments
    agentId: string,
    taskId?: string,
    commitHash?: string
  },
  haltConditions: {                // When to stop agent
    maxConsecutiveFailures: number,
    settlementTimeoutMs: number
  }
}
```

## Integration Points (Future Work)

### SigilNet Integration

The telemetry layer includes a `SigilNetSink` stub that documents the integration interface:

```typescript
interface SigilNetSinkConfig {
  endpoint: string                 // SigilNet gateway
  authToken?: string
  fieldParams?: {
    negentropyEnabled: boolean     // Track negentropy
    trustDiffusionEnabled: boolean // Update trust graph
  }
  categoricalBridge?: boolean      // Use Day convolution
}
```

**Event Mapping:**
- `payment.*` events → Trust graph updates
- `action.*` events → Field coherence signals
- `budget.*` events → Resource allocation tracking

**Required Endpoints:**
- `POST /field/events` - Submit field events
- `GET /field/status` - Query field status
- `WS /field/stream` - Real-time field updates

### QVera Integration

The agent SDK can be extended to work with QVera's protocol layer:

1. Agents become telemetry producers
2. Payment receipts feed into indexing substrate
3. Service SLA outcomes inform trust scoring
4. Budget policies sync with resource allocation

## Scalability

**Current Demo:**
- 1 seller service
- 1 buyer agent
- ~3 transactions

**Production Scale:**
- Multiple seller services with different offerings
- Multiple buyer agents with different policies
- Vendor selection strategies (cheapest, fastest, most trusted)
- Agent marketplaces for service discovery
- Reputation systems for vendor trust

## Security Considerations

1. **Payment Verification**
   - All payments verified on Solana blockchain
   - Idempotency keys prevent double-spending
   - Receipt replay protection

2. **Budget Enforcement**
   - Hard caps on spending per window
   - Rate limiting per vendor
   - Reservation system prevents overspending

3. **Vendor Trust**
   - Allowlist enforcement
   - Payment signature verification
   - Service SLA tracking

4. **Provenance**
   - All events tagged with correlation IDs
   - Full lineage tracking in telemetry
   - Audit trail in JSONL logs

## Reproducibility

The system is designed for reproducibility:

1. **Deterministic Budget** - Window-based resets are time-deterministic
2. **Event Logs** - Complete JSONL audit trail
3. **Policy Files** - JSON-serializable configuration
4. **Version Pinning** - Locked dependencies in package.json

## Next Steps

### Short Term (Post-Hackathon)
- Real X402 facilitator integration (vs simulation)
- On-chain payment verification
- Multiple seller services with different offerings
- Vendor selection strategies

### Medium Term
- Agent marketplace for service discovery
- Reputation system for vendors
- Multi-agent coordination (agents cooperating on tasks)
- Cross-agent budget pooling

### Long Term (SigilNet Integration)
- Live SigilNet field closure integration
- Trust graph updates from payment patterns
- Negentropy tracking for agent behavior
- Categorical bridge for compositional semantics

## References

- [X402 Protocol Spec](https://github.com/coinbase/x402)
- [Solana Documentation](https://docs.solana.com/)
- [SigilNet](https://github.com/gsknnft/SigilNet)
- [QVera](https://github.com/CoreFlamePrime/QVera)
