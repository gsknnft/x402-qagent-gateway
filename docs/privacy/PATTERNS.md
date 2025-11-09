# Privacy-Preserving Patterns for X402 Agents

**Selective disclosure and privacy controls for autonomous economic agents**

This document outlines privacy-preserving patterns that enable agents to transact via X402 while maintaining control over data disclosure and identity management.

---

## Table of Contents

- [Privacy Challenges](#privacy-challenges)
- [Privacy Patterns](#privacy-patterns)
- [Implementation Guide](#implementation-guide)
- [Best Practices](#best-practices)
- [Compliance](#compliance)

---

## Privacy Challenges

### What's Private, What's Public?

In X402 agent systems:

**Public by Default:**
- ✅ On-chain payment transactions (Solana blockchain)
- ✅ Payment amounts and addresses
- ✅ Transaction signatures and timestamps

**Potentially Private:**
- ❓ Agent identity and behavior patterns
- ❓ Service usage details (what services, how often)
- ❓ Budget and spending strategies
- ❓ Telemetry and event data
- ❓ Vendor selection criteria

### Privacy Goals

1. **Agent Anonymity** - Agents can transact without revealing real-world identity
2. **Behavior Privacy** - Agent decision-making patterns aren't leaked
3. **Selective Disclosure** - Share only necessary data with each party
4. **Unlinkability** - Different transactions can't be correlated to same agent

---

## Privacy Patterns

### 1. Pseudonymous Agent Identities

**Pattern:** Rotate agent identifiers periodically to prevent long-term tracking

```typescript
export class PseudonymManager {
  private realAgentId: string
  private currentPseudonym: string
  private rotationPolicy: RotationPolicy
  
  constructor(config: {
    realAgentId: string
    rotationInterval?: number  // Rotate every N transactions
    rotationThreshold?: number // Or after N SOL spent
  }) {
    this.realAgentId = config.realAgentId
    this.currentPseudonym = this.generatePseudonym()
    this.rotationPolicy = {
      interval: config.rotationInterval || 100,
      threshold: config.rotationThreshold || 1_000_000,
      transactionCount: 0,
      spentAmount: 0,
    }
  }
  
  getPublicId(): string {
    return this.currentPseudonym
  }
  
  recordTransaction(amount: number): void {
    this.rotationPolicy.transactionCount++
    this.rotationPolicy.spentAmount += amount
    
    if (this.shouldRotate()) {
      this.rotate()
    }
  }
  
  private shouldRotate(): boolean {
    return (
      this.rotationPolicy.transactionCount >= this.rotationPolicy.interval ||
      this.rotationPolicy.spentAmount >= this.rotationPolicy.threshold
    )
  }
  
  private rotate(): void {
    console.log(`Rotating pseudonym: ${this.currentPseudonym} → new ID`)
    this.currentPseudonym = this.generatePseudonym()
    this.rotationPolicy.transactionCount = 0
    this.rotationPolicy.spentAmount = 0
  }
  
  private generatePseudonym(): string {
    return `agent-${crypto.randomUUID().slice(0, 8)}`
  }
}
```

**Usage:**
```typescript
const pseudonymManager = new PseudonymManager({
  realAgentId: 'my-real-agent-id',
  rotationInterval: 50,  // Rotate every 50 transactions
})

// Use pseudonym for public communications
const publicId = pseudonymManager.getPublicId()
await executor.execute(action, adapter, { agentId: publicId })

// Record transaction to track rotation
pseudonymManager.recordTransaction(10_000)
```

**Benefits:**
- Prevents long-term tracking of agent behavior
- Limits data linkability across transactions
- Simple to implement, minimal overhead

---

### 2. Selective Telemetry Disclosure

**Pattern:** Filter telemetry events before emission based on privacy policy

```typescript
export interface PrivacyPolicy {
  // Events that are always emitted (public)
  publicEvents: EventType[]
  
  // Events that are never emitted (private)
  privateEvents: EventType[]
  
  // Events that are anonymized before emission
  anonymizedEvents: Array<{
    type: EventType
    redactFields: string[]  // Fields to remove
  }>
}

export class PrivacyFilter {
  constructor(private policy: PrivacyPolicy) {}
  
  shouldEmit(event: TelemetryEvent): boolean {
    // Always emit public events
    if (this.policy.publicEvents.includes(event.type)) {
      return true
    }
    
    // Never emit private events
    if (this.policy.privateEvents.includes(event.type)) {
      return false
    }
    
    // Check if anonymization is required
    return this.policy.anonymizedEvents.some(a => a.type === event.type)
  }
  
  filter(event: TelemetryEvent): TelemetryEvent {
    // Find anonymization rule
    const rule = this.policy.anonymizedEvents.find(a => a.type === event.type)
    
    if (!rule) {
      return event  // No filtering needed
    }
    
    // Redact specified fields
    const filtered = { ...event }
    rule.redactFields.forEach(field => {
      if (field in filtered.payload) {
        delete filtered.payload[field]
      }
    })
    
    return filtered
  }
}
```

**Usage:**
```typescript
const privacyPolicy: PrivacyPolicy = {
  publicEvents: [
    'action.completed',  // OK to share
  ],
  privateEvents: [
    'budget.delta',      // Never share budget info
    'policy.violation',  // Keep policy violations private
  ],
  anonymizedEvents: [
    {
      type: 'payment.settled',
      redactFields: ['amount', 'vendor'],  // Remove sensitive details
    },
  ],
}

const privacyFilter = new PrivacyFilter(privacyPolicy)

const emitEvent = async (event: TelemetryEvent) => {
  if (!privacyFilter.shouldEmit(event)) {
    return  // Don't emit private events
  }
  
  const filtered = privacyFilter.filter(event)
  await telemetrySink.emit(filtered)
}
```

---

### 3. Zero-Knowledge Budget Proofs

**Pattern:** Prove sufficient budget without revealing exact amount

```typescript
export class ZKBudgetProver {
  /**
   * Generate a proof that agent has at least `minRequired` budget
   * without revealing the actual budget amount
   */
  async proveHasBudget(
    actualBudget: number,
    minRequired: number
  ): Promise<BudgetProof> {
    // Simplified example - real implementation would use ZK-SNARKs
    // For now, use a commitment scheme
    
    const commitment = this.commit(actualBudget)
    const proof = this.generateProof(actualBudget, minRequired, commitment)
    
    return {
      commitment,
      proof,
      minRequired,
      timestamp: Date.now(),
    }
  }
  
  async verifyBudgetProof(proof: BudgetProof): Promise<boolean> {
    // Verify proof without learning actual budget
    return this.verify(proof.commitment, proof.proof, proof.minRequired)
  }
  
  private commit(budget: number): string {
    // Simple commitment: hash(budget + nonce)
    const nonce = crypto.randomBytes(32)
    return crypto
      .createHash('sha256')
      .update(Buffer.concat([Buffer.from(budget.toString()), nonce]))
      .digest('hex')
  }
  
  private generateProof(
    actualBudget: number,
    minRequired: number,
    commitment: string
  ): string {
    // Simplified proof generation
    // Real implementation would use ZK-SNARK library like SnarkJS
    
    if (actualBudget < minRequired) {
      throw new Error('Insufficient budget for proof')
    }
    
    // Generate proof that commitment corresponds to budget >= minRequired
    return crypto
      .createHash('sha256')
      .update(`${commitment}:${minRequired}:${actualBudget >= minRequired}`)
      .digest('hex')
  }
  
  private verify(
    commitment: string,
    proof: string,
    minRequired: number
  ): boolean {
    // Verify proof is valid for this commitment and requirement
    // Real implementation would use ZK-SNARK verification
    return proof.length === 64  // Simplified check
  }
}
```

**Usage:**
```typescript
const zkProver = new ZKBudgetProver()

// Agent proves it has sufficient budget without revealing amount
const proof = await zkProver.proveHasBudget(
  actualBudget: 1_000_000,  // Kept secret
  minRequired: 50_000       // Public requirement
)

// Vendor can verify proof without learning actual budget
const isValid = await zkProver.verifyBudgetProof(proof)
// isValid = true, but vendor doesn't know if budget is 50k, 1M, or 10M
```

---

### 4. Privacy-Preserving Aggregations

**Pattern:** Share aggregate statistics without revealing individual data points

```typescript
export class DifferentialPrivacyAggregator {
  constructor(private epsilon: number = 0.1) {
    // epsilon controls privacy-utility tradeoff
    // Lower epsilon = more privacy, less accuracy
  }
  
  /**
   * Add Laplace noise to aggregate statistics
   * Provides differential privacy guarantee
   */
  addNoise(value: number, sensitivity: number = 1): number {
    // Laplace distribution: mean = 0, scale = sensitivity / epsilon
    const scale = sensitivity / this.epsilon
    const u = Math.random() - 0.5
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u))
    
    return value + noise
  }
  
  /**
   * Compute aggregate statistics with differential privacy
   */
  aggregateVendorUsage(
    vendorUsage: Map<Address, number>
  ): Map<Address, number> {
    const noisyUsage = new Map<Address, number>()
    
    for (const [vendor, count] of vendorUsage.entries()) {
      // Add noise to each count
      const noisyCount = Math.max(0, this.addNoise(count, 1))
      noisyUsage.set(vendor, Math.round(noisyCount))
    }
    
    return noisyUsage
  }
}
```

**Usage:**
```typescript
const dpAggregator = new DifferentialPrivacyAggregator(epsilon: 0.1)

// Original vendor usage (sensitive)
const actualUsage = new Map([
  ['VendorA', 100],
  ['VendorB', 50],
  ['VendorC', 25],
])

// Share noisy aggregate (privacy-preserving)
const noisyUsage = dpAggregator.aggregateVendorUsage(actualUsage)
// noisyUsage might be: VendorA: 98, VendorB: 52, VendorC: 24
// Close to actual but prevents exact inference
```

---

### 5. K-Anonymity for Agent Behavior

**Pattern:** Ensure agent behavior is indistinguishable from k-1 other agents

```typescript
export class KAnonymityEnforcer {
  constructor(
    private k: number = 5,  // Indistinguishable from at least 5 agents
    private agentPool: AgentBehaviorDB
  ) {}
  
  async ensureKAnonymity(
    agentBehavior: AgentBehavior
  ): Promise<boolean> {
    // Find similar agents
    const similar = await this.agentPool.findSimilar(agentBehavior, this.k)
    
    if (similar.length < this.k - 1) {
      // Not enough similar agents, behavior is too unique
      console.warn(`Behavior too unique: only ${similar.length} similar agents`)
      return false
    }
    
    return true
  }
  
  async generalizeBehavior(
    agentBehavior: AgentBehavior
  ): Promise<AgentBehavior> {
    // Generalize behavior to match more agents
    return {
      ...agentBehavior,
      // Round spending to nearest 100k
      totalSpent: Math.round(agentBehavior.totalSpent / 100_000) * 100_000,
      // Generalize vendor list to categories
      vendors: this.generalizeVendors(agentBehavior.vendors),
      // Remove rare service types
      services: agentBehavior.services.filter(s => this.isCommonService(s)),
    }
  }
}
```

---

## Implementation Guide

### Step 1: Choose Privacy Level

Define your privacy requirements:

```typescript
enum PrivacyLevel {
  PUBLIC = 'public',        // No privacy controls
  BASIC = 'basic',          // Pseudonymous IDs only
  STANDARD = 'standard',    // + Selective disclosure
  HIGH = 'high',            // + Anonymization
  MAXIMUM = 'maximum',      // + ZK proofs, k-anonymity
}
```

### Step 2: Configure Privacy Policy

```typescript
const privacyConfig = {
  level: PrivacyLevel.STANDARD,
  
  pseudonyms: {
    enabled: true,
    rotationInterval: 100,
  },
  
  telemetry: {
    publicEvents: ['action.completed'],
    privateEvents: ['budget.delta', 'policy.violation'],
    anonymizedEvents: [
      { type: 'payment.settled', redactFields: ['amount'] },
    ],
  },
  
  zkProofs: {
    enabled: false,  // Requires ZK-SNARK library
  },
  
  aggregation: {
    enabled: true,
    epsilon: 0.1,  // Differential privacy parameter
  },
}
```

### Step 3: Integrate Privacy Filters

```typescript
import { PrivacyFilter, PseudonymManager } from '@x402-qagent/privacy'

const pseudonymManager = new PseudonymManager({
  realAgentId: 'my-real-id',
  rotationInterval: privacyConfig.pseudonyms.rotationInterval,
})

const privacyFilter = new PrivacyFilter(privacyConfig.telemetry)

const emitEvent = async (event: TelemetryEvent) => {
  // Use pseudonym
  event.agentId = pseudonymManager.getPublicId()
  
  // Filter event
  if (!privacyFilter.shouldEmit(event)) {
    return
  }
  
  const filtered = privacyFilter.filter(event)
  await telemetrySink.emit(filtered)
}
```

---

## Best Practices

### 1. Layer Privacy Controls

Combine multiple patterns for defense-in-depth:

```typescript
// Layer 1: Pseudonymous ID
const publicId = pseudonymManager.getPublicId()

// Layer 2: Selective disclosure
const filtered = privacyFilter.filter(event)

// Layer 3: Anonymization
const anonymized = anonymizer.anonymize(filtered)

// Layer 4: Aggregation (before sharing with community)
const aggregated = dpAggregator.aggregate([anonymized])
```

### 2. Privacy-Utility Tradeoff

More privacy often means less utility:

| Pattern | Privacy | Utility | Cost |
|---------|---------|---------|------|
| Pseudonyms | Medium | High | Low |
| Selective Disclosure | High | Medium | Low |
| ZK Proofs | Very High | High | High |
| Differential Privacy | High | Medium | Low |
| K-Anonymity | Very High | Low | Medium |

Choose based on your threat model and requirements.

### 3. Rotate Secrets Regularly

```typescript
// Rotate pseudonyms
pseudonymManager.rotate()

// Rotate encryption keys
keyManager.rotateKeys()

// Rotate payment addresses
walletManager.generateNewAddress()
```

### 4. Audit Privacy Controls

```typescript
export class PrivacyAuditor {
  async audit(events: TelemetryEvent[]): Promise<PrivacyReport> {
    return {
      totalEvents: events.length,
      publicEvents: events.filter(e => this.isPublic(e)).length,
      privateEvents: events.filter(e => this.isPrivate(e)).length,
      anonymizedEvents: events.filter(e => this.isAnonymized(e)).length,
      uniqueAgentIds: new Set(events.map(e => e.agentId)).size,
      privacyScore: this.computePrivacyScore(events),
    }
  }
}
```

---

## Compliance

### GDPR Compliance

**Right to be Forgotten:**
```typescript
export class GDPRCompliantAgent {
  async deletePersonalData(agentId: string): Promise<void> {
    // Delete local telemetry
    await this.telemetryStore.deleteByAgentId(agentId)
    
    // Remove from reputation system
    await this.reputationTracker.forget(agentId)
    
    // Note: On-chain data cannot be deleted (inform users)
  }
}
```

**Data Minimization:**
- Only collect necessary telemetry
- Redact sensitive fields
- Use aggregation when possible

**Purpose Limitation:**
- Clearly document why data is collected
- Don't repurpose telemetry without consent

---

## Next Steps

- **[Implementation Example](../../examples/privacy-preserving-agent/)** - Working code
- **[Reputation System](../reputation/ARCHITECTURE.md)** - Privacy-preserving reputation
- **[Fraud Detection](../fraud-detection/PATTERNS.md)** - Privacy vs. security tradeoffs

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-09  
**Status:** 🟢 Ready for Implementation
