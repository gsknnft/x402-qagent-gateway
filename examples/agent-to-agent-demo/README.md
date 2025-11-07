# Agent-to-Agent Marketplace Demo

This demo showcases autonomous AI agents transacting in a micro-economy using X402 micropayments on Solana.

## What This Demonstrates

### 🤖 **Economic Autonomy**
- Agents with budgets and spending policies
- Vendor selection based on price and reputation
- Autonomous halt on budget exhaustion or policy violation

### 🔗 **Verifiable Lineage**
- Every payment has a correlation ID
- Signed receipts for all transactions
- Complete audit trail in JSONL format

### 🏪 **Multi-Agent Marketplace**
- Seller agent provides micro-services behind X402 paywall
- Buyer agent autonomously purchases services
- Policy-driven vendor selection

### 🛠️ **Composable SDK**
- Reusable payment middleware
- Pluggable service adapters
- Telemetry sinks (Console, JSONL, SigilNet stub)

## Quick Start

### Option 1: Run Full Demo (Automated)

```bash
cd examples/agent-to-agent-demo/scripts
./run-demo.sh
```

This will:
1. Install dependencies
2. Start seller service
3. Run buyer agent
4. Show telemetry summary
5. Clean up

### Option 2: Manual Setup (Step-by-Step)

**Terminal 1 - Seller Service:**
```bash
cd apps/seller-service
SELLER_ADDRESS="SellerWallet123abc" pnpm start
```

**Terminal 2 - Buyer Agent:**
```bash
cd apps/agent-runner
SELLER_ADDRESS="SellerWallet123abc" \
SELLER_ENDPOINT="http://localhost:3001/api/transform" \
pnpm start
```

## What You'll See

### Seller Service Output
```
🏪 Seller service running on port 3001
💰 Vendor address: SellerWallet123abc
📝 Offering: Text transformation @ $0.01/request
```

### Buyer Agent Output
```
🤖 Starting Autonomous Buyer Agent...

✅ Agent initialized
💰 Budget: 1000000 lamports
🎯 Allowed vendors: SellerWallet123abc
📊 Telemetry: Console + JSONL (./logs/agent-telemetry.jsonl)

📋 Tasks queued: 3

▶️  Executing task task-001...
💵 Available budget: 1000000 lamports

[2025-11-07T17:00:00.000Z] payment.initiated {...}
[2025-11-07T17:00:00.100Z] payment.settled {...}
[2025-11-07T17:00:00.120Z] action.started {...}
[2025-11-07T17:00:00.250Z] action.completed {...}

✅ Task task-001 completed!
   Result: "HELLO, X402 WORLD!"
   Cost: 6667 lamports
   Duration: 250ms
```

## Telemetry Events

The demo emits structured events to multiple sinks:

### Console (Color-Coded)
- 🟢 Green: `payment.*` events
- 🔵 Cyan: `action.*` events
- 🟡 Yellow: `budget.*` events
- 🔴 Red: `agent.halted` events

### JSONL File
Complete audit trail at `apps/agent-runner/logs/agent-telemetry.jsonl`:

```jsonl
{"type":"payment.initiated","timestamp":"2025-11-07T17:00:00.000Z","correlationId":"abc-123",...}
{"type":"payment.settled","timestamp":"2025-11-07T17:00:00.100Z","correlationId":"abc-123",...}
{"type":"action.started","timestamp":"2025-11-07T17:00:00.120Z","correlationId":"abc-123",...}
{"type":"action.completed","timestamp":"2025-11-07T17:00:00.250Z","correlationId":"abc-123",...}
```

### Analyze Telemetry

```bash
# Count event types
cat apps/agent-runner/logs/agent-telemetry.jsonl | jq -r '.type' | sort | uniq -c

# View all payments
cat apps/agent-runner/logs/agent-telemetry.jsonl | jq 'select(.type | startswith("payment"))'

# Track specific correlation ID
cat apps/agent-runner/logs/agent-telemetry.jsonl | jq 'select(.correlationId == "abc-123")'
```

## Policy Configuration

The buyer agent uses policy files in `policies/`:

### `buyer-greedy.json`
- Strategy: Priority-first (executes high-priority tasks regardless of cost)
- Budget: 1M lamports (~$0.67)
- Vendors: Primary + Alternate
- Rate Limit: 10 requests/hour per vendor

### `buyer-optimizer.json`
- Strategy: Cost-optimizer (selects cheapest viable actions)
- Budget: 500K lamports (~$0.33)
- Vendors: Primary + Alternate + Budget
- Rate Limit: Higher limits, more vendors for cost shopping

## Service Configuration

Seller services are defined in `services/`:

### `seller-primary.json`
- Vendor: SellerWallet123abc
- Service: Text transformation
- Price: $0.01/request
- Operations: uppercase, lowercase, reverse
- SLA: < 500ms, 99% uptime
- Reputation: 0.95 score, 1250 total transactions

## Demo Scenarios

### Scenario 1: Basic Autonomy
1. Agent receives task queue
2. Checks budget before each action
3. Pays seller, receives service
4. Emits telemetry for each step
5. Shows final budget status

### Scenario 2: Policy Enforcement
1. Agent encounters disallowed vendor
2. Policy engine rejects transaction
3. Agent halts or selects alternate vendor
4. Emits policy violation event

### Scenario 3: Budget Exhaustion
1. Agent executes multiple tasks
2. Budget approaches cap
3. Agent refuses new actions
4. Emits `agent.halted` with reason `budget_exhausted`

### Scenario 4: Multi-Vendor Selection
1. Multiple sellers offer same service at different prices
2. Cost-optimizer agent selects cheapest
3. Greedy agent selects based on priority + reputation
4. Telemetry shows vendor selection reasoning

## Architecture Highlights

### Payment Flow
```
Agent → Policy Check → Budget Reserve → X402 Payment → 
Service Call → Receipt Verify → Budget Commit → Telemetry
```

### Correlation IDs
Every action gets a unique correlation ID that ties together:
- Payment initiation
- Payment settlement
- Action start
- Action completion
- Budget delta

This enables **complete lineage tracking**.

### Vendor Allowlist
Agents only pay vendors in their allowlist, preventing:
- Accidental payments to unknown services
- Budget drain from malicious actors
- Policy violations

### Rate Limiting
Per-vendor rate limits prevent:
- Excessive spending on single vendor
- DDoS-style budget drainage
- Policy circumvention

## Integration Preview

### SigilNet Hook (Stub)
```typescript
// Future: Agent events flow to SigilNet field layer
const sigilnetSink = new SigilNetSink({
  endpoint: 'https://sigilnet.example.com/field/events',
  fieldParams: { negentropyEnabled: true }
})
```

### QVera Hook (Stub)
```typescript
// Future: Agents pay for QVera indexing services
const qveraAdapter = new QVeraIndexAdapter(
  client,
  'QVeraIndexWallet456',
  'https://qvera.io/api/index/query',
  '$0.10'
)
```

## Reproducibility

Every demo run is reproducible:
1. **Deterministic budgets** - Window-based, time-locked
2. **Policy files** - JSON configuration (version controlled)
3. **Telemetry logs** - Complete JSONL audit trail
4. **Correlation IDs** - Traceable lineage for debugging

## Next Steps

### For Developers
- Clone this repo
- Modify policy files to test different strategies
- Add new service adapters
- Integrate with your own services

### For Hackathon Judges
- Run `./scripts/run-demo.sh` to see it in action
- Review telemetry logs for verifiable lineage
- Check ARCHITECTURE.md for system design
- See SIGILNET_INTEGRATION.md for future vision

## Troubleshooting

**Port 3001 already in use:**
```bash
lsof -ti:3001 | xargs kill -9
```

**Dependencies not installing:**
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Logs directory missing:**
```bash
mkdir -p apps/agent-runner/logs
```

## References

- [Main README](../../README.md) - Project overview
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Complete system design
- [SIGILNET_INTEGRATION.md](../../SIGILNET_INTEGRATION.md) - Integration guide
- [X402 Protocol](https://github.com/coinbase/x402) - Payment protocol spec
