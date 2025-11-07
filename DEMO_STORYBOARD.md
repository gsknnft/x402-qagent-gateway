# Demo Storyboard - X402 Quantum Agent Gateway

**For Hackathon Judges:** This document outlines exactly what you'll see in the live demo.

## Executive Summary

This demo showcases **autonomous AI agents acting as economic entities** in a micro-marketplace, transacting via X402 micropayments on Solana. Unlike typical payment-gated content demos, this demonstrates:

✅ **Agents with budgets and policies** (not just API consumers)  
✅ **Multi-agent economy** (buyer ↔ seller transactions)  
✅ **Verifiable lineage** (every payment tracked with correlation IDs)  
✅ **Composable SDK** (reusable middleware for other developers)  
✅ **Integration vision** (documented hooks for SigilNet/QVera)

## Demo Flow (90 seconds)

### Act 1: Setup (0:00 - 0:15)

**What You See:**
```bash
$ cd isolation/x402-qagent-gateway
$ ./infra/validators/validate-environment.sh

🔍 X402 Quantum Agent Gateway - Environment Validator
=====================================================

✅ Node.js found: v20.19.5
✅ pnpm found: 10.18.0
✅ All packages present
✅ Environment validation PASSED
```

**Key Message:** Reproducible setup with validator script.

---

### Act 2: Seller Service Starts (0:15 - 0:25)

**What You See:**
```bash
$ cd apps/seller-service
$ pnpm start

🏪 Seller service running on port 3001
💰 Vendor address: SellerWallet123abc
📝 Offering: Text transformation @ $0.01/request
   Operations: uppercase, lowercase, reverse
   SLA: < 500ms, 99% uptime
```

**Key Message:** Micro-service behind X402 paywall, ready to sell compute.

---

### Act 3: Agent Configuration (0:25 - 0:35)

**What You See:**
```bash
$ cat examples/agent-to-agent-demo/policies/buyer-greedy.json

{
  "agentId": "buyer-agent-greedy",
  "strategy": "greedy",
  "policy": {
    "allowedVendors": ["SellerWallet123abc"],
    "budgetCap": 1000000,
    "budgetWindow": 3600,
    "rateLimits": { "sellerwallet123abc": 10 },
    "haltConditions": {
      "maxConsecutiveFailures": 3
    }
  }
}
```

**Key Message:** JSON policy controls agent behavior - budget, vendors, limits.

---

### Act 4: Agent Execution (0:35 - 1:10)

**What You See:**
```bash
$ cd apps/agent-runner
$ pnpm start

🤖 Starting Autonomous Buyer Agent...

✅ Agent initialized
💰 Budget: 1,000,000 lamports (~$0.67)
🎯 Allowed vendors: SellerWallet123abc
📊 Telemetry: Console + JSONL

📋 Tasks queued: 3

▶️  Executing task-001...
💵 Available budget: 1,000,000 lamports

[GREEN] payment.initiated {
  vendor: "SellerWallet123abc",
  amount: 6667,
  endpoint: "http://localhost:3001/api/transform",
  correlationId: "abc-123"
}

[GREEN] payment.settled {
  signature: "sim_abc-123_1699380000000",
  verified: true,
  correlationId: "abc-123"
}

[CYAN] action.started {
  actionType: "text-transform",
  input: { text: "Hello, X402!", operation: "uppercase" },
  correlationId: "abc-123"
}

[CYAN] action.completed {
  result: "HELLO, X402!",
  cost: 6667,
  duration: 120ms,
  success: true,
  correlationId: "abc-123"
}

✅ Task task-001 completed!
   Result: "HELLO, X402!"
   Cost: 6,667 lamports
   Duration: 120ms

[Repeats for task-002 and task-003...]

📊 Final Budget Status:
   Total: 1,000,000 lamports
   Spent: 20,001 lamports
   Remaining: 979,999 lamports

✨ Agent completed successfully!
```

**Key Messages:**
- Agent checks budget before each action
- Correlation IDs link payment → action → result
- Color-coded telemetry shows event flow
- Budget tracking enforces caps

---

### Act 5: Telemetry Lineage (1:10 - 1:20)

**What You See:**
```bash
$ cat apps/agent-runner/logs/agent-telemetry.jsonl | jq

{
  "type": "payment.initiated",
  "timestamp": "2025-11-07T17:00:00.000Z",
  "correlationId": "abc-123",
  "agentId": "buyer-agent-greedy",
  "payload": { "vendor": "SellerWallet123abc", "amount": 6667 }
}
{
  "type": "payment.settled",
  "timestamp": "2025-11-07T17:00:00.100Z",
  "correlationId": "abc-123",
  "payload": { "receipt": {...}, "verified": true }
}
{
  "type": "action.completed",
  "timestamp": "2025-11-07T17:00:00.250Z",
  "correlationId": "abc-123",
  "payload": { "result": "HELLO, X402!", "success": true }
}

$ # Trace specific correlation ID
$ cat agent-telemetry.jsonl | jq 'select(.correlationId == "abc-123")'

[Shows 4 events: initiated, settled, started, completed]
```

**Key Message:** Complete audit trail with correlation IDs for verifiable lineage.

---

### Act 6: SDK Showcase (1:20 - 1:30)

**What You See:**
```bash
$ tree packages/

packages/
├── x402-middleware/       # Reusable payment abstractions
│   ├── src/
│   │   ├── client.ts      # X402Client with retry
│   │   ├── policy-engine.ts  # Budget enforcement
│   │   └── decorator.ts   # withPayment() wrapper
├── agent-sdk/             # Agent framework
│   ├── src/
│   │   ├── budget-manager.ts  # Spending control
│   │   ├── executor.ts    # Action execution
│   │   └── adapters.ts    # Service adapters
└── telemetry-core/        # Event tracking
    ├── src/
    │   ├── console-sink.ts   # Color output
    │   ├── jsonl-sink.ts     # Audit trail
    │   └── sigilnet-sink.ts  # Integration stub
```

**Key Message:** Composable SDK - other developers can reuse these packages.

---

## What Makes This Different

### Typical X402 Demo
```
User → clicks button → pays via Coinbase → sees content
```

### Our Demo
```
Agent (with policy) →
  checks budget →
  selects vendor →
  pays via X402 →
  receives service →
  emits telemetry →
  updates budget →
  continues autonomously
```

## Differentiation Matrix

| Feature | Typical Demo | Our System |
|---------|-------------|------------|
| **Actor** | Human user | Autonomous agent |
| **Budget** | One-time payment | Managed budget with caps |
| **Policy** | None | Vendor allowlist, rate limits |
| **Telemetry** | Transaction log | Full lineage with correlation IDs |
| **Vendor Selection** | Hardcoded | Policy-driven (cost, reputation) |
| **SDK** | Hardcoded app | Reusable middleware |
| **Integration** | Standalone | Documented hooks (SigilNet/QVera) |

## Technical Highlights

### 1. Economic Autonomy
Agent makes decisions:
- Which vendor to use (cost vs. reputation)
- When to halt (budget exhausted, too many failures)
- How to prioritize tasks (greedy vs. cost-optimizer)

### 2. Verifiable Lineage
Every action traceable:
```
correlationId: abc-123
  ├── payment.initiated (t=0ms)
  ├── payment.settled (t=100ms)
  ├── action.started (t=120ms)
  └── action.completed (t=250ms)
```

### 3. Composable Middleware
Drop-in SDK:
```typescript
import { withPayment } from '@x402-qagent/middleware'

const paidFetch = withPayment(fetch, {
  vendor: sellerAddress,
  price: '$0.01'
})

const result = await paidFetch('/api/data')
// Payment happens automatically!
```

### 4. Integration Vision
Future SigilNet connection:
```typescript
import { SigilNetSink } from '@x402-qagent/telemetry'

// Events flow to SigilNet field layer
sigilnetSink.emit(event)
// → Trust graph updates
// → Field coherence tracking
// → Negentropy calculation
```

## Questions Judges Might Ask

### Q: "How is this different from Coinbase Pay demo?"
**A:** Coinbase Pay shows human users paying for content. We show **autonomous agents with budgets and policies** transacting in a marketplace.

### Q: "Why would I use this over direct X402?"
**A:** Our SDK adds budget management, policy enforcement, vendor selection, and telemetry - **reusable components** that every agent needs.

### Q: "How does this integrate with SigilNet/QVera?"
**A:** We provide documented integration hooks. SigilNetSink is a stub showing exactly how events map to field updates. See SIGILNET_INTEGRATION.md.

### Q: "Is this production-ready?"
**A:** This is a reference architecture. Payment client is simulated (no real blockchain calls). Production would use actual X402 facilitator and on-chain verification.

### Q: "Can I reuse this code?"
**A:** Yes! The packages are designed as composable middleware. Install `@x402-qagent/middleware` and you're ready to build your own agents.

## Architecture Diagram (for visual slide)

```
┌─────────────────────────────────────┐
│         Buyer Agent                 │
│  - Budget: 1M lamports              │
│  - Policy: vendor allowlist, caps   │
│  - Strategy: greedy / optimizer     │
└─────────────────────────────────────┘
            ↓ X402 Payment
┌─────────────────────────────────────┐
│      Payment Middleware             │
│  - PolicyEngine (budget checks)     │
│  - X402Client (pay & verify)        │
│  - Decorators (wrap functions)      │
└─────────────────────────────────────┘
            ↓ Solana
┌─────────────────────────────────────┐
│      Blockchain Settlement          │
│  - 400ms finality                   │
│  - $0.00025 fees                    │
│  - Verifiable receipts              │
└─────────────────────────────────────┘
            ↓ Service Request
┌─────────────────────────────────────┐
│         Seller Service              │
│  - Text transformation              │
│  - $0.01 per request                │
│  - Verifies payment signature       │
└─────────────────────────────────────┘
            ↓ Telemetry
┌─────────────────────────────────────┐
│    Telemetry Layer (Lineage)        │
│  - Console (color-coded)            │
│  - JSONL (audit trail)              │
│  - SigilNet stub (future)           │
└─────────────────────────────────────┘
```

## Call to Action (for judges)

**Try it yourself:**
```bash
git clone https://github.com/gsknnft/SigilNet
cd isolation/x402-qagent-gateway
./examples/agent-to-agent-demo/scripts/run-demo.sh
```

**5 minutes to see:**
- Autonomous agent with budget
- Policy-driven vendor selection
- Verifiable lineage with correlation IDs
- Composable SDK ready for reuse

---

**This is what agent economies look like on Solana.** 🚀
