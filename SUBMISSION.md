# X402 Quantum Agent Gateway - Hackathon Submission

## Executive Summary

**X402 Quantum Agent Gateway** is a reference architecture for autonomous agent economies on Solana. Unlike typical X402 demos that show payment-gated content, this project demonstrates **agents that act as economic entities** with budgets, policies, and autonomous decision-making capabilities.

### What Makes This Different

| Aspect | Typical X402 Demo | Our System |
|--------|------------------|------------|
| **Actor** | Human user | Autonomous AI agent |
| **Spending** | One-time payment | Managed budget with caps & windows |
| **Policy** | None | Vendor allowlist, rate limits, halt conditions |
| **Vendor Choice** | Hardcoded endpoint | Policy-driven selection (cost, reputation) |
| **Telemetry** | Transaction log | Full lineage with correlation IDs |
| **Reusability** | Hardcoded app | Composable SDK packages |
| **Integration** | Standalone | Documented hooks (SigilNet/QVera) |

## Target Tracks

### 🏆 Best Trustless Agent ($10k)
**Why we qualify:** Our agents are trustless economic entities that:
- Manage their own budgets autonomously
- Enforce policies without human intervention
- Make vendor selection decisions based on cost/reputation
- Halt execution on budget exhaustion or policy violations
- Emit verifiable lineage for all transactions

### 🏆 Best x402 API Integration ($10k)
**Why we qualify:** Our payment middleware provides:
- Clean X402 client abstraction with idempotency & retry
- Policy engine for budget/rate limiting enforcement
- Payment decorators (`withPayment()`) for any function
- Receipt verification and provenance tracking
- Pluggable architecture for multiple facilitators

### 🏆 Best x402 Dev Tool ($10k)
**Why we qualify:** Our SDK is a dev tool that:
- Provides reusable packages (`@x402-qagent/*`)
- Enables developers to build their own agents quickly
- Offers pluggable service adapters
- Includes telemetry sinks (Console, JSONL, SigilNet)
- Documents integration patterns and best practices

## Key Features

### 1. Economic Autonomy
Agents act as sovereign economic entities:
- **Budget Management** - Window-based spending caps with reservations
- **Policy Enforcement** - Vendor allowlists, rate limits, provenance tags
- **Vendor Selection** - Agents choose based on price, reputation, SLA
- **Halt Conditions** - Auto-stop on budget exhaustion or failures

### 2. Verifiable Lineage
Every action is traceable end-to-end:
```
correlationId: abc-123
  ├── payment.initiated (t=0ms)
  ├── payment.settled (t=100ms)  
  ├── action.started (t=120ms)
  └── action.completed (t=250ms)
```

All events logged to JSONL for complete audit trail.

### 3. Multi-Agent Marketplace
Demonstration of agent-to-agent economy:
- **Seller Agent** - Provides micro-services behind X402 paywall
- **Buyer Agent** - Autonomously purchases services
- **Policy-Driven** - Both agents enforce their own rules
- **Extensible** - Easy to add more sellers/buyers

### 4. Composable SDK
Reusable middleware for any developer:

```typescript
// Simple payment wrapper
import { withPayment } from '@x402-qagent/middleware'

const paidFetch = withPayment(fetch, {
  vendor: sellerAddress,
  price: '$0.01',
  client: x402Client
})

const result = await paidFetch('/api/data')
```

```typescript
// Full agent with budget
import { DefaultAgentExecutor } from '@x402-qagent/agent-sdk'

const executor = new DefaultAgentExecutor(
  budgetManager,
  'my-agent-001',
  emitTelemetry
)

await executor.execute(action, serviceAdapter)
```

### 5. Integration Ready
Documented hooks for future stack integration:

**SigilNet Integration:**
- Events → Field coherence signals
- Payments → Trust graph updates
- Budget → Resource allocation tracking

**QVera Integration:**
- Agents pay for indexing queries
- Telemetry flows to substrate
- Service SLA feeds trust scoring

## Architecture

### Component Overview
```
packages/
├── x402-middleware/       # Payment abstractions
│   ├── X402Client         # Pay & verify
│   ├── PolicyEngine       # Budget enforcement
│   ├── Decorators         # withPayment()
│   └── Utils              # Validation, conversion
├── agent-sdk/             # Agent framework
│   ├── BudgetManager      # Spending control
│   ├── AgentExecutor      # Action execution
│   ├── ServiceAdapters    # Pluggable services
│   └── Planners           # Decision strategies
└── telemetry-core/        # Event tracking
    ├── ConsoleSink        # Color output
    ├── JSONLSink          # Audit trail
    └── SigilNetSink       # Integration stub
```

### Payment Flow
```
Agent Planner
    ↓ (select action)
Budget Manager
    ↓ (check & reserve)
Agent Executor
    ↓ (estimate cost)
X402 Client
    ↓ (pay)
Solana Blockchain
    ↓ (settle)
Service Adapter
    ↓ (call service)
Budget Manager
    ↓ (commit)
Telemetry
```

## Demo

### Quick Start
```bash
cd isolation/x402-qagent-gateway
./examples/agent-to-agent-demo/scripts/run-demo.sh
```

### What You'll See
1. **Environment Validation** - Checks Node, pnpm, structure
2. **Seller Service Starts** - Micro-service on port 3001
3. **Agent Boots** - Loads policy, initializes budget
4. **Autonomous Execution** - Agent:
   - Checks budget before each action
   - Pays seller via X402
   - Receives service result
   - Emits telemetry events
   - Updates budget state
5. **Telemetry Summary** - Event counts and lineage

### Sample Output
```
🤖 Starting Autonomous Buyer Agent...

✅ Agent initialized
💰 Budget: 1,000,000 lamports (~$0.67)
🎯 Allowed vendors: SellerWallet123abc

▶️  Executing task-001...

[GREEN] payment.initiated {...}
[GREEN] payment.settled {...}
[CYAN] action.started {...}
[CYAN] action.completed {...}

✅ Task task-001 completed!
   Result: "HELLO, X402!"
   Cost: 6,667 lamports
   Duration: 120ms
```

## Documentation

### For Judges
- **[DEMO_STORYBOARD.md](DEMO_STORYBOARD.md)** - 90-second walkthrough
- **[README.md](README.md)** - Quick start guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system design

### For Developers
- **[SIGILNET_INTEGRATION.md](SIGILNET_INTEGRATION.md)** - Integration guide
- **[examples/agent-to-agent-demo/README.md](examples/agent-to-agent-demo/README.md)** - Demo deep dive
- **Policy examples** - JSON configurations in `examples/*/policies/`

## Reproducibility

### Environment Validation
```bash
./infra/validators/validate-environment.sh
```

Checks:
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Project structure
- Configuration files

### Compatibility Matrix
| Component | Required | Recommended |
|-----------|----------|-------------|
| Node.js | >= 20.0.0 | 24.9.0 |
| pnpm | >= 9.0.0 | 10.18.0 |
| TypeScript | >= 5.0.0 | 5.9.0 |

### Policy Configuration
All agent behavior is controlled by JSON policy files:
- `examples/*/policies/buyer-greedy.json` - Priority-first strategy
- `examples/*/policies/buyer-optimizer.json` - Cost-conscious strategy
- `examples/*/services/seller-primary.json` - Service catalog

## Technology Stack

- **Blockchain:** Solana (devnet for demo, mainnet-ready)
- **Payment Protocol:** X402
- **Runtime:** Node.js 20+
- **Language:** TypeScript 5+
- **Package Manager:** pnpm 10+
- **Libraries:**
  - `viem` - Type-safe Ethereum/Solana types
  - `express` - Seller service API
  - Standard Node.js crypto & fs

## Security

### Measures Implemented
✅ Signature validation (format checks)
✅ Address validation (length & character checks)
✅ Amount validation (range checks, no negatives)
✅ Budget enforcement (hard caps, rate limits)
✅ Vendor allowlists (policy-based)
✅ Idempotency keys (prevent double-spending)
✅ Correlation IDs (audit trail)

### Production Considerations
- Use real X402 facilitator (not simulation)
- Implement on-chain receipt verification
- Add oracle for SOL/USD price feed
- Enable HSM for key management
- Add monitoring & alerting

## Future Work

### Short Term
- Connect to real X402 facilitator
- On-chain payment verification
- Multiple seller services
- Reputation system for vendors

### Medium Term
- Agent marketplace (service discovery)
- Cross-agent coordination
- Multi-signature budget pools
- Advanced planners (ML-based)

### Long Term (SigilNet Integration)
- Live field closure integration
- Trust graph from payment patterns
- Negentropy tracking
- Categorical bridge semantics

## Team

Built for the Solana X402 Hackathon (Oct 28 - Nov 11, 2025) by the SigilNet team.

## License

See LICENSE file for details.

## Support

- **Demo Issues:** Open an issue in this repo
- **X402 Protocol:** [github.com/coinbase/x402](https://github.com/coinbase/x402)
- **SigilNet:** [github.com/gsknnft/SigilNet](https://github.com/gsknnft/SigilNet)

---

**This is what agent economies look like on Solana.** 🚀
