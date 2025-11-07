# SigilNet Integration Guide

This document outlines how to integrate the X402 Quantum Agent Gateway with SigilNet's field closure layer and QVera's protocol infrastructure.

## Overview

The X402 Agent Gateway is designed as a **composable module** that can be integrated into larger sovereign stacks. It provides clean interfaces and documented hooks for integration with:

- **SigilNet** - Categorical trust semantics and field closure control
- **QVera** - Protocol layer for telemetry, indexing, and substrate access

## Architecture Integration Points

### Current State (Standalone)

```
X402 Agent Gateway
├── Payment Middleware (X402 payments)
├── Agent SDK (autonomous agents)
└── Telemetry Core (event tracking)
```

### Future State (Integrated)

```
┌────────────────────────────────────────────────┐
│              SigilNet Core                     │
│  - Categorical Bridge (Day Convolution)       │
│  - Field Closure Layer (φ field)              │
│  - Trust Graph (SAW-based)                     │
│  - Negentropy Tracking                         │
└────────────────────────────────────────────────┘
                    ↕
┌────────────────────────────────────────────────┐
│          QVera Protocol Layer                  │
│  - Telemetry Substrate                         │
│  - Indexing Services                           │
│  - Resource Allocation                         │
└────────────────────────────────────────────────┘
                    ↕
┌────────────────────────────────────────────────┐
│       X402 Agent Gateway (Economic Layer)      │
│  - Payment Middleware                          │
│  - Agent SDK                                   │
│  - Telemetry Events → SigilNet Field Events    │
└────────────────────────────────────────────────┘
```

## Integration Steps

### Step 1: Telemetry Bridge

The telemetry layer already includes a `SigilNetSink` stub. To activate it:

```typescript
import { SigilNetSink } from '@x402-qagent/telemetry'

const sigilnetSink = new SigilNetSink({
  endpoint: 'https://your-sigilnet-gateway.com/field/events',
  authToken: process.env.SIGILNET_AUTH_TOKEN,
  fieldParams: {
    negentropyEnabled: true,
    trustDiffusionEnabled: true,
  },
  categoricalBridge: true,
})

// Add to agent's telemetry sinks
const emitEvent = async (event: TelemetryEvent) => {
  await Promise.all([
    consoleSink.emit(event),
    jsonlSink.emit(event),
    sigilnetSink.emit(event),  // New!
  ])
}
```

### Step 2: Event Transformation

The `SigilNetSink` needs to transform X402 events to SigilNet field events:

```typescript
// In packages/telemetry-core/src/sigilnet-sink.ts

async emit(event: TelemetryEvent): Promise<void> {
  const fieldEvent = this.transformToFieldEvent(event)
  
  // Send to SigilNet field closure layer
  await fetch(`${this.config.endpoint}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.authToken}`,
    },
    body: JSON.stringify(fieldEvent),
  })
}

private transformToFieldEvent(event: TelemetryEvent): SigilNetFieldEvent {
  switch (event.type) {
    case 'payment.settled':
      return {
        type: 'trust.edge_update',
        sourceNode: event.agentId,
        targetNode: event.payload.receipt.vendor,
        weight: this.calculateTrustWeight(event.payload.receipt),
        timestamp: event.timestamp,
      }
    
    case 'action.completed':
      return {
        type: 'field.coherence_signal',
        nodeId: event.agentId,
        coherence: event.payload.success ? 1.0 : 0.0,
        negentropy: this.calculateNegentropy(event),
        timestamp: event.timestamp,
      }
    
    case 'budget.delta':
      return {
        type: 'resource.allocation',
        nodeId: event.agentId,
        allocated: event.payload.newBalance,
        consumed: event.payload.spent,
        timestamp: event.timestamp,
      }
    
    default:
      return null
  }
}
```

### Step 3: Trust Graph Updates

Payment patterns should update the SigilNet trust graph:

```typescript
// Successful payment increases trust edge weight
payment.settled → trust.edge_update(agent → vendor, weight++)

// Failed payment decreases trust
payment.failed → trust.edge_update(agent → vendor, weight--)

// SLA violations affect trust
sla.outcome(success=false) → trust.edge_update(agent → vendor, weight--)
```

### Step 4: Field Closure Integration

Agent budget states should influence the φ field:

```typescript
// High spending rate increases field activity
budget.delta → field.phi_update(position, activity_level)

// Budget exhaustion creates field constraint
agent.halted(budget_exhausted) → field.constraint(position, type='budget')

// Coherent behavior (successful actions) increases negentropy
action.completed(success=true) → field.negentropy_increase(node)
```

### Step 5: QVera Substrate Access

Agents can autonomously pay for QVera services:

```typescript
// Create QVera adapter
class QVeraIndexAdapter implements ServiceAdapter {
  async execute(query: IndexQuery, context: AdapterContext) {
    // Pay for indexing query via X402
    const receipt = await this.client.pay({
      price: '$0.10',
      vendor: QVERA_INDEX_SERVICE,
      endpoint: 'https://qvera.io/api/index/query',
      correlationId: context.correlationId,
    })
    
    // Query QVera indexing substrate
    const results = await fetch('https://qvera.io/api/index/query', {
      method: 'POST',
      headers: {
        'X-Payment-Signature': receipt.signature,
      },
      body: JSON.stringify(query),
    })
    
    return { data: results, receipt, cost: receipt.amount }
  }
}

// Agent can now autonomously pay for QVera indexing
agent.execute({
  type: 'qvera-index-query',
  input: { query: 'SELECT * FROM substrate WHERE...' },
})
```

## Configuration

### Environment Variables

```bash
# SigilNet integration
SIGILNET_GATEWAY_URL=https://sigilnet.example.com
SIGILNET_AUTH_TOKEN=your_auth_token
SIGILNET_FIELD_PARAMS_NEGENTROPY=true
SIGILNET_FIELD_PARAMS_TRUST_DIFFUSION=true

# QVera integration
QVERA_PROTOCOL_URL=https://qvera.example.com
QVERA_INDEX_SERVICE_ADDRESS=QVeraIndexWallet123
QVERA_SUBSTRATE_SERVICE_ADDRESS=QVeraSubstrateWallet456
```

### Agent Policy Extension

```typescript
interface ExtendedPaymentPolicy extends PaymentPolicy {
  // Existing fields...
  
  // SigilNet integration
  sigilnet?: {
    enabled: boolean
    gatewayUrl: string
    fieldUpdateInterval: number  // ms
  }
  
  // QVera integration
  qvera?: {
    enabled: boolean
    services: {
      indexing: { vendor: Address, pricePerQuery: string }
      substrate: { vendor: Address, pricePerAccess: string }
      telemetry: { vendor: Address, pricePerEvent: string }
    }
  }
}
```

## API Endpoints

### SigilNet Field Events API

The SigilNet gateway should expose:

**POST** `/field/events`
```json
{
  "type": "trust.edge_update",
  "sourceNode": "agent-001",
  "targetNode": "vendor-xyz",
  "weight": 0.85,
  "timestamp": "2025-11-07T17:00:00Z"
}
```

**GET** `/field/status`
```json
{
  "phi": {
    "nodes": [
      { "id": "agent-001", "position": [0.5, 0.3], "coherence": 0.9 }
    ]
  },
  "trustGraph": {
    "edges": [
      { "source": "agent-001", "target": "vendor-xyz", "weight": 0.85 }
    ]
  }
}
```

**WS** `/field/stream`
```json
// Real-time field updates
{ "type": "phi_update", "node": "agent-001", "phi": 0.95 }
{ "type": "trust_update", "edge": ["agent-001", "vendor-xyz"], "weight": 0.87 }
```

### QVera Protocol API

**POST** `/api/index/query`
```json
{
  "query": "SELECT * FROM payments WHERE agent_id = ?",
  "params": ["agent-001"],
  "paymentSignature": "sig_abc123..."
}
```

**POST** `/api/substrate/access`
```json
{
  "resource": "telemetry_stream",
  "duration": 3600,
  "paymentSignature": "sig_xyz789..."
}
```

## Migration Path

### Phase 1: Standalone (Current)
- X402 agents run independently
- Local telemetry (console, JSONL)
- No SigilNet/QVera dependency

### Phase 2: Telemetry Bridge
- Enable SigilNetSink
- Events flow to SigilNet field layer
- Read-only integration (no agent changes)

### Phase 3: Trust Integration
- Payment patterns update trust graph
- Field coherence influences agent behavior
- Bidirectional data flow

### Phase 4: Full Integration
- Agents use QVera services autonomously
- Field closure modulates agent policies
- Categorical bridge for compositional semantics

## Example Integration

```typescript
import { X402Client } from '@x402-qagent/middleware'
import { DefaultAgentExecutor } from '@x402-qagent/agent-sdk'
import { SigilNetSink } from '@x402-qagent/telemetry'

// Configure SigilNet integration
const sigilnetSink = new SigilNetSink({
  endpoint: process.env.SIGILNET_GATEWAY_URL,
  authToken: process.env.SIGILNET_AUTH_TOKEN,
  fieldParams: {
    negentropyEnabled: true,
    trustDiffusionEnabled: true,
  },
  categoricalBridge: true,
})

// Create agent with SigilNet telemetry
const agent = new DefaultAgentExecutor(
  budgetManager,
  'agent-sigilnet-001',
  async (event) => {
    await sigilnetSink.emit(event)  // Events flow to SigilNet
  }
)

// Execute actions - telemetry automatically flows to SigilNet field layer
await agent.execute(action, adapter)

// Query SigilNet for agent's field status
const fieldStatus = await fetch(
  `${process.env.SIGILNET_GATEWAY_URL}/field/status?node=agent-sigilnet-001`
)

// Adjust agent policy based on field coherence
if (fieldStatus.coherence < 0.5) {
  policy.budgetCap *= 0.8  // Reduce spending in low-coherence state
}
```

## Testing Integration

### Mock SigilNet Service

```typescript
// For testing, run a mock SigilNet endpoint
import express from 'express'

const app = express()
app.post('/field/events', (req, res) => {
  console.log('Received field event:', req.body)
  res.json({ accepted: true })
})
app.listen(4000)

// Point agents to mock
SIGILNET_GATEWAY_URL=http://localhost:4000
```

### Validate Event Flow

```typescript
// Check events are flowing
tail -f logs/agent-telemetry.jsonl | grep "payment.settled"

// Verify SigilNet received events
curl http://localhost:4000/field/status
```

## Troubleshooting

**Events not reaching SigilNet:**
- Check `SIGILNET_GATEWAY_URL` is correct
- Verify auth token is valid
- Check network connectivity
- Review SigilNetSink logs

**Trust graph not updating:**
- Ensure `trustDiffusionEnabled: true` in config
- Verify event transformation logic
- Check SigilNet field endpoint is processing events

**Performance impact:**
- SigilNetSink uses async emission (non-blocking)
- Buffer events locally if network latency is high
- Consider batching for high-frequency agents

## References

- [SigilNet Field Closure Documentation](https://github.com/gsknnft/SigilNet/blob/main/docs/FIELD_CLOSURE.md)
- [QVera Protocol Specification](https://github.com/CoreFlamePrime/QVera)
- [Day Convolution Bridge](https://github.com/gsknnft/SigilNet/blob/main/docs/DAY_CONVOLUTION_BRIDGE.md)

## Support

For integration questions:
- Open an issue in this repo
- Join the SigilNet Discord
- Reference this guide in your PR
