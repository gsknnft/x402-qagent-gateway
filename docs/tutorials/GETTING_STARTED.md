# Getting Started with X402 Agents

**Build your first autonomous economic agent in 15 minutes**

This tutorial walks you through creating an autonomous agent that can pay for services using the X402 payment protocol on Solana.

---

## Table of Contents

- [What You'll Build](#what-youll-build)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Understanding X402 Payment Flow](#understanding-x402-payment-flow)
- [Building Your First Agent](#building-your-first-agent)
- [Running the Agent](#running-the-agent)
- [Understanding the Output](#understanding-the-output)
- [Next Steps](#next-steps)

---

## What You'll Build

You'll create an autonomous agent that:
- ✅ Has its own budget (1M lamports = ~$0.67)
- ✅ Autonomously pays for services using X402 protocol
- ✅ Makes decisions based on policies (budget caps, vendor allowlists)
- ✅ Emits telemetry events for observability
- ✅ Handles retries and failures gracefully

**Time to Complete:** ~15 minutes

---

## Prerequisites

### Required Software

- **Node.js** >= 20.0.0 (check: `node --version`)
- **pnpm** >= 9.0.0 (install: `npm install -g pnpm`)
- **Git** (check: `git --version`)

### Required Knowledge

- Basic TypeScript/JavaScript
- Understanding of async/await
- Familiarity with command line

### Optional (Recommended)

- Basic understanding of Solana blockchain
- Familiarity with the X402 payment protocol

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/gsknnft/x402-qagent-gateway.git
cd x402-qagent-gateway
```

### 2. Install Dependencies

```bash
pnpm install
```

This will:
- Install all workspace dependencies
- Build the core packages
- Set up the Electron app (if needed)

**Expected time:** 2-3 minutes

### 3. Verify Installation

```bash
pnpm lint
```

You should see no errors (warnings are OK).

---

## Understanding X402 Payment Flow

Before building your agent, let's understand how X402 payments work:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Agent discovers service and checks price             │
│    Agent → "I need text transformation"                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Agent checks budget and policy                       │
│    BudgetManager → "You have 1M lamports available"     │
│    PolicyEngine → "Vendor is on allowlist ✓"            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Agent executes X402 payment                          │
│    X402Client → Solana blockchain                       │
│    Payment verified ✓                                   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Service processes request                            │
│    Vendor → Transforms "hello" to "HELLO"               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Agent receives result and emits telemetry            │
│    Telemetry → payment.settled, action.completed        │
│    Budget updated → 1M - 10k = 990k lamports             │
└─────────────────────────────────────────────────────────┘
```

**Key Concepts:**
- **X402 Protocol:** HTTP 402 status code for payment-required responses
- **Budget Manager:** Tracks available funds and reservations
- **Policy Engine:** Enforces spending rules (caps, allowlists, rate limits)
- **Telemetry:** Event stream for observability and auditing

---

## Building Your First Agent

### Step 1: Create Agent Configuration

Create a new file: `my-first-agent/config.ts`

```typescript
import { PaymentPolicy } from '@x402-qagent/middleware'

export const agentConfig = {
  // Agent identity
  agentId: 'my-first-agent-001',
  
  // Initial budget (1M lamports = ~$0.67)
  initialBudget: 1_000_000,
  
  // Payment policy
  policy: {
    budgetCap: 500_000,           // Don't spend more than 500k lamports
    maxPricePerRequest: 50_000,   // Max 50k lamports per request
    
    // Vendor allowlist (optional)
    vendorAllowlist: [
      'SellerServiceWallet123',   // Replace with real vendor address
    ],
    
    // Rate limits
    maxRequestsPerMinute: 10,
    
    // Halt conditions
    haltOnBudgetExhaustion: true,
  } as PaymentPolicy,
}
```

### Step 2: Create Service Adapter

Service adapters define how your agent interacts with specific services.

Create: `my-first-agent/text-transform-adapter.ts`

```typescript
import { ServiceAdapter, AdapterContext } from '@x402-qagent/agent-sdk'

export class TextTransformAdapter implements ServiceAdapter {
  async execute(input: { text: string; operation: string }, context: AdapterContext) {
    const { text, operation } = input
    
    // Service endpoint
    const endpoint = 'http://localhost:3001/api/transform'
    
    // Make request with payment
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': context.correlationId,
      },
      body: JSON.stringify({ text, operation }),
    })
    
    if (!response.ok) {
      throw new Error(`Service failed: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    return {
      data: result.transformedText,
      cost: 10_000,  // 10k lamports per request
      metadata: {
        operation,
        originalText: text,
      },
    }
  }
}
```

### Step 3: Create Agent Main File

Create: `my-first-agent/index.ts`

```typescript
import { BudgetManager, DefaultAgentExecutor } from '@x402-qagent/agent-sdk'
import { ConsoleSink, JSONLSink } from '@x402-qagent/telemetry'
import { agentConfig } from './config'
import { TextTransformAdapter } from './text-transform-adapter'

async function main() {
  console.log('🤖 Starting X402 Agent...\n')
  
  // 1. Initialize telemetry
  const consoleSink = new ConsoleSink({ colorize: true })
  const jsonlSink = new JSONLSink({ filepath: './logs/agent.jsonl' })
  
  const emitEvent = async (event) => {
    await Promise.all([
      consoleSink.emit(event),
      jsonlSink.emit(event),
    ])
  }
  
  // 2. Initialize budget manager
  const budget = new BudgetManager(agentConfig.initialBudget)
  console.log(`💰 Budget initialized: ${agentConfig.initialBudget} lamports\n`)
  
  // 3. Create agent executor
  const executor = new DefaultAgentExecutor(
    budget,
    agentConfig.agentId,
    emitEvent
  )
  
  // 4. Create service adapter
  const textAdapter = new TextTransformAdapter()
  
  // 5. Define tasks
  const tasks = [
    { text: 'hello world', operation: 'uppercase' },
    { text: 'GOODBYE', operation: 'lowercase' },
    { text: 'racecar', operation: 'reverse' },
  ]
  
  // 6. Execute tasks autonomously
  console.log('🚀 Executing tasks...\n')
  
  for (const task of tasks) {
    try {
      console.log(`📋 Task: Transform "${task.text}" (${task.operation})`)
      
      const result = await executor.execute(
        {
          type: 'text-transform',
          input: task,
          estimatedCost: 10_000,
          vendor: 'SellerServiceWallet123',
        },
        textAdapter
      )
      
      if (result.success) {
        console.log(`✅ Result: ${result.data}`)
        console.log(`💵 Cost: ${result.cost} lamports`)
      } else {
        console.log(`❌ Failed: ${result.error}`)
      }
      
      console.log(`💰 Budget remaining: ${await budget.getAvailable()} lamports\n`)
    } catch (error) {
      console.error(`❌ Task failed:`, error.message)
    }
  }
  
  // 7. Final budget status
  const finalBudget = await budget.getAvailable()
  const spent = agentConfig.initialBudget - finalBudget
  
  console.log('\n📊 Final Report:')
  console.log(`   Initial budget: ${agentConfig.initialBudget} lamports`)
  console.log(`   Amount spent: ${spent} lamports`)
  console.log(`   Remaining: ${finalBudget} lamports`)
  console.log(`\n✅ Agent completed successfully!`)
}

main().catch(console.error)
```

### Step 4: Create Package.json

Create: `my-first-agent/package.json`

```json
{
  "name": "my-first-agent",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx index.ts"
  },
  "dependencies": {
    "@x402-qagent/agent-sdk": "workspace:*",
    "@x402-qagent/middleware": "workspace:*",
    "@x402-qagent/telemetry": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

---

## Running the Agent

### 1. Start the Seller Service (Terminal 1)

The seller service provides the text transformation API:

```bash
cd apps/seller-service
pnpm start
```

You should see:
```
🏪 Seller Service started on http://localhost:3001
💵 Accepting X402 payments for text transformations
💰 Price: $0.01 per request (10,000 lamports)
```

### 2. Run Your Agent (Terminal 2)

```bash
cd my-first-agent
pnpm install
pnpm start
```

Expected output:
```
🤖 Starting X402 Agent...

💰 Budget initialized: 1000000 lamports

🚀 Executing tasks...

📋 Task: Transform "hello world" (uppercase)
✅ Result: HELLO WORLD
💵 Cost: 10000 lamports
💰 Budget remaining: 990000 lamports

📋 Task: Transform "GOODBYE" (lowercase)
✅ Result: goodbye
💵 Cost: 10000 lamports
💰 Budget remaining: 980000 lamports

📋 Task: Transform "racecar" (reverse)
✅ Result: racecar
💵 Cost: 10000 lamports
💰 Budget remaining: 970000 lamports

📊 Final Report:
   Initial budget: 1000000 lamports
   Amount spent: 30000 lamports
   Remaining: 970000 lamports

✅ Agent completed successfully!
```

---

## Understanding the Output

### Telemetry Events

Your agent emits several types of events:

**1. Payment Initiated**
```json
{
  "type": "payment.initiated",
  "agentId": "my-first-agent-001",
  "correlationId": "abc-123",
  "payload": {
    "vendor": "SellerServiceWallet123",
    "amount": 10000,
    "endpoint": "http://localhost:3001/api/transform"
  }
}
```

**2. Payment Settled**
```json
{
  "type": "payment.settled",
  "agentId": "my-first-agent-001",
  "correlationId": "abc-123",
  "payload": {
    "receipt": {
      "signature": "sig_abc123...",
      "verified": true,
      "amount": 10000
    }
  }
}
```

**3. Action Completed**
```json
{
  "type": "action.completed",
  "agentId": "my-first-agent-001",
  "correlationId": "abc-123",
  "payload": {
    "success": true,
    "result": "HELLO WORLD",
    "cost": 10000
  }
}
```

**4. Budget Delta**
```json
{
  "type": "budget.delta",
  "agentId": "my-first-agent-001",
  "payload": {
    "previousBalance": 1000000,
    "newBalance": 990000,
    "delta": -10000,
    "reason": "payment_completed"
  }
}
```

### Viewing Telemetry Logs

```bash
# View raw telemetry (JSONL format)
cat my-first-agent/logs/agent.jsonl

# Pretty-print with jq
cat my-first-agent/logs/agent.jsonl | jq

# Filter by event type
cat my-first-agent/logs/agent.jsonl | jq 'select(.type == "payment.settled")'

# Trace specific correlation ID
cat my-first-agent/logs/agent.jsonl | jq 'select(.correlationId == "abc-123")'
```

---

## Next Steps

Congratulations! You've built your first autonomous X402 agent. Here's what to explore next:

### 1. Add Policy Enforcement

Learn how to restrict agent behavior:
- Budget caps and rate limits
- Vendor allowlists/blocklists
- Halt conditions
- **Tutorial:** [Building Robust Agent Policies](./AGENT_POLICIES.md)

### 2. Build Custom Adapters

Create adapters for other services:
- API integrations
- Data processing pipelines
- Multi-step workflows
- **Tutorial:** [Building Custom Service Adapters](./CUSTOM_ADAPTERS.md)

### 3. Implement Agent Strategies

Make smarter decisions:
- Cost-optimizing planners
- Reputation-based vendor selection
- Multi-objective optimization
- **Tutorial:** [Advanced Agent Planning Strategies](./AGENT_STRATEGIES.md)

### 4. Add Fraud Protection

Protect your agent from malicious vendors:
- Anomaly detection
- Circuit breakers
- Vendor reputation tracking
- **Tutorial:** [Fraud-Resistant Agents](../fraud-detection/INTEGRATION.md)

### 5. Enable Privacy Features

Control data sharing:
- Pseudonymous identities
- Selective telemetry disclosure
- Zero-knowledge proofs
- **Tutorial:** [Privacy-Preserving Agents](../privacy/PATTERNS.md)

### 6. Multi-Agent Coordination

Build agent swarms:
- Shared budgets
- Task decomposition
- Agent-to-agent communication
- **Tutorial:** [Multi-Agent Coordination](./MULTI_AGENT_COORDINATION.md)

---

## Troubleshooting

### Agent Can't Connect to Seller Service

**Problem:** `ECONNREFUSED` error when agent tries to pay vendor

**Solution:**
1. Ensure seller service is running: `cd apps/seller-service && pnpm start`
2. Check the service is listening on port 3001
3. Verify endpoint URL in your adapter

### Budget Exhausted Too Quickly

**Problem:** Agent halts after just a few requests

**Solution:**
1. Increase initial budget: `initialBudget: 10_000_000` (10M lamports)
2. Check service pricing in adapter
3. Review policy budget caps

### Telemetry Not Appearing

**Problem:** No logs in `logs/agent.jsonl`

**Solution:**
1. Ensure `logs/` directory exists: `mkdir -p logs`
2. Check file permissions
3. Verify `JSONLSink` is initialized correctly

### Type Errors in TypeScript

**Problem:** TypeScript compilation errors

**Solution:**
1. Ensure packages are built: `pnpm build`
2. Check TypeScript version: `pnpm add -D typescript@^5.3.3`
3. Review import paths

---

## Additional Resources

- **[API Reference](../../API_REFERENCE.md)** - Complete SDK documentation
- **[Architecture](../../ARCHITECTURE.md)** - System design deep-dive
- **[Examples](../../examples/)** - More working examples
- **[Contributing](../../CONTRIBUTING.md)** - How to contribute

---

## Community & Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/gsknnft/x402-qagent-gateway/issues)
- **GitHub Discussions:** [Ask questions and share ideas](https://github.com/gsknnft/x402-qagent-gateway/discussions)
- **Discord:** (Coming soon)

---

**🎉 Congratulations!** You've successfully built your first autonomous economic agent using the X402 protocol. Welcome to the future of autonomous agent economies!
