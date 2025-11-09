# Reputation System Architecture

**Trust-based vendor selection for X402 autonomous agents**

This document describes the reputation system architecture for tracking vendor reliability and enabling trust-aware agent decision-making in the X402 ecosystem.

---

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Architecture](#architecture)
- [Reputation Metrics](#reputation-metrics)
- [Trust Score Computation](#trust-score-computation)
- [Integration with Agents](#integration-with-agents)
- [Data Storage](#data-storage)
- [Privacy Considerations](#privacy-considerations)
- [Implementation](#implementation)

---

## Overview

### The Problem

X402 enables **trustless payments** - agents can pay vendors without intermediaries. However, payment verification alone doesn't guarantee:

❌ **Service Quality** - Did the vendor deliver what was promised?  
❌ **Reliability** - Does the vendor consistently meet SLAs?  
❌ **Performance** - How fast does the vendor respond?  
❌ **Value** - Is the vendor's pricing competitive?

### The Solution

A **reputation system** that tracks vendor performance over time, enabling agents to make informed decisions about which vendors to trust.

### Design Principles

✅ **Decentralized** - No central authority controls reputation  
✅ **Privacy-Preserving** - Agents control what data they share  
✅ **Incentive-Aligned** - Good vendors are rewarded with more business  
✅ **Attack-Resistant** - Difficult to game or manipulate  
✅ **Composable** - Works with any X402 implementation

---

## Core Concepts

### 1. Vendor Reputation

A **vendor's reputation** is a composite score (0.0 - 1.0) derived from multiple metrics:

```typescript
interface VendorReputation {
  address: Address              // Vendor's Solana address
  
  metrics: {
    // Volume metrics
    totalTransactions: number   // Lifetime transaction count
    totalVolume: number         // Lifetime SOL volume
    
    // Quality metrics
    successRate: number         // 0.0 - 1.0 (successful transactions / total)
    averageResponseTime: number // Milliseconds
    slaComplianceRate: number   // 0.0 - 1.0 (SLA met / total)
    
    // Reliability metrics
    uptimePercentage: number    // 0.0 - 100.0
    refundRate: number          // 0.0 - 1.0 (refunds / total)
    disputeRate: number         // 0.0 - 1.0 (disputes / total)
  }
  
  trustScore: number            // 0.0 - 1.0 (computed from metrics)
  lastUpdated: string           // ISO 8601 timestamp
  firstSeen: string             // When vendor was first tracked
}
```

### 2. Transaction Outcome

Every agent-vendor interaction produces an **outcome** that updates reputation:

```typescript
interface TransactionOutcome {
  transactionId: string
  vendor: Address
  timestamp: string
  
  // Payment details
  amount: number
  settled: boolean
  
  // Service quality
  success: boolean              // Did service deliver?
  responseTime: number          // Milliseconds
  slaViolation: boolean         // Did vendor miss SLA?
  
  // Optional feedback
  agentRating?: number          // 1-5 stars (if agent provides)
  feedback?: string             // Free-text feedback
}
```

### 3. Trust Score

The **trust score** is a single number (0.0 - 1.0) representing overall vendor trustworthiness:

- **1.0** = Perfect vendor (always delivers, fast, reliable)
- **0.5** = Average vendor (some issues, generally OK)
- **0.0** = Bad vendor (frequent failures, slow, unreliable)

---

## Architecture

### System Components

```
┌──────────────────────────────────────────────────────────┐
│                 Agent (Decision Maker)                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │   ReputationBasedPlanner                           │  │
│  │   - Query vendor reputations                       │  │
│  │   - Select vendor by trust score                   │  │
│  │   - Weight cost vs. reliability                    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│              ReputationTracker (Core)                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │   VendorReputationTracker                          │  │
│  │   - Track transaction outcomes                     │  │
│  │   - Compute trust scores                           │  │
│  │   - Persist reputation data                        │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│               Data Store (Persistence)                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │   Local: JSONL file / SQLite                       │  │
│  │   Distributed: IPFS / Arweave                      │  │
│  │   On-Chain: Solana program (future)                │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│          Telemetry Integration (Observability)            │
│  ┌────────────────────────────────────────────────────┐  │
│  │   - Emit reputation.updated events                 │  │
│  │   - Track reputation queries                       │  │
│  │   - Log vendor selection decisions                 │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

**1. Transaction Execution:**
```
Agent → Execute Payment → Vendor → Service Result
```

**2. Outcome Recording:**
```
Agent → Record Outcome → ReputationTracker → Update Metrics
```

**3. Reputation Query:**
```
Agent → Query Reputation → ReputationTracker → Return Trust Score
```

**4. Vendor Selection:**
```
Agent → List Vendors → ReputationBasedPlanner → Select by Trust Score
```

---

## Reputation Metrics

### Primary Metrics

#### 1. Success Rate
**Definition:** Percentage of transactions that succeeded  
**Formula:** `successfulTransactions / totalTransactions`  
**Weight:** HIGH (40% of trust score)

```typescript
function calculateSuccessRate(outcomes: TransactionOutcome[]): number {
  if (outcomes.length === 0) return 0.5 // Neutral for new vendors
  
  const successful = outcomes.filter(o => o.success).length
  return successful / outcomes.length
}
```

#### 2. Average Response Time
**Definition:** Mean time to complete service request  
**Formula:** `sum(responseTimes) / count(transactions)`  
**Weight:** MEDIUM (20% of trust score)

```typescript
function calculateResponseTime(outcomes: TransactionOutcome[]): number {
  if (outcomes.length === 0) return 0
  
  const totalTime = outcomes.reduce((sum, o) => sum + o.responseTime, 0)
  return totalTime / outcomes.length
}

// Normalize to 0.0 - 1.0 (lower is better)
function normalizeResponseTime(avgMs: number): number {
  const targetMs = 1000  // 1 second is ideal
  const maxMs = 10000    // 10 seconds is worst acceptable
  
  if (avgMs <= targetMs) return 1.0
  if (avgMs >= maxMs) return 0.0
  
  return 1.0 - ((avgMs - targetMs) / (maxMs - targetMs))
}
```

#### 3. SLA Compliance Rate
**Definition:** Percentage of transactions meeting SLA commitments  
**Formula:** `transactionsWithoutSLAViolation / totalTransactions`  
**Weight:** MEDIUM (20% of trust score)

```typescript
function calculateSLAComplianceRate(outcomes: TransactionOutcome[]): number {
  if (outcomes.length === 0) return 0.5
  
  const compliant = outcomes.filter(o => !o.slaViolation).length
  return compliant / outcomes.length
}
```

#### 4. Refund/Dispute Rate
**Definition:** Percentage of transactions resulting in refunds or disputes  
**Formula:** `(refunds + disputes) / totalTransactions`  
**Weight:** MEDIUM (20% of trust score)

```typescript
function calculateRefundRate(outcomes: TransactionOutcome[]): number {
  if (outcomes.length === 0) return 0.0
  
  // Lower is better, so invert
  const refunds = outcomes.filter(o => o.refunded || o.disputed).length
  return 1.0 - (refunds / outcomes.length)
}
```

### Secondary Metrics

#### 5. Uptime Percentage
Tracked separately via periodic health checks:

```typescript
interface UptimeMetric {
  vendor: Address
  timestamp: string
  available: boolean
  responseTime: number
}

function calculateUptime(checks: UptimeMetric[], windowHours: number = 24): number {
  const cutoff = Date.now() - (windowHours * 60 * 60 * 1000)
  const recent = checks.filter(c => new Date(c.timestamp).getTime() > cutoff)
  
  if (recent.length === 0) return 0.5
  
  const available = recent.filter(c => c.available).length
  return available / recent.length
}
```

#### 6. Volume Metrics (for Discovery)
Track total transaction count and SOL volume to help discover popular vendors:

```typescript
interface VolumeMetrics {
  totalTransactions: number
  totalVolume: number  // In lamports
  uniqueAgents: Set<Address>
  
  // Trending
  transactions24h: number
  transactions7d: number
  volume24h: number
  volume7d: number
}
```

---

## Trust Score Computation

### Weighted Average Formula

```typescript
function computeTrustScore(metrics: VendorMetrics): number {
  const weights = {
    successRate: 0.40,
    responseTime: 0.20,
    slaCompliance: 0.20,
    refundRate: 0.20,
  }
  
  const normalized = {
    successRate: metrics.successRate,
    responseTime: normalizeResponseTime(metrics.averageResponseTime),
    slaCompliance: metrics.slaComplianceRate,
    refundRate: 1.0 - metrics.refundRate,
  }
  
  let score = 0
  score += normalized.successRate * weights.successRate
  score += normalized.responseTime * weights.responseTime
  score += normalized.slaCompliance * weights.slaCompliance
  score += normalized.refundRate * weights.refundRate
  
  return Math.max(0, Math.min(1, score))
}
```

### Time-Weighted Scoring (Recency Bias)

Recent performance should matter more than historical performance:

```typescript
function computeTimeWeightedTrustScore(
  outcomes: TransactionOutcome[],
  decayFactor: number = 0.95
): number {
  // Sort by timestamp (oldest first)
  const sorted = outcomes.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  
  let weightedSum = 0
  let weightSum = 0
  
  sorted.forEach((outcome, index) => {
    const weight = Math.pow(decayFactor, sorted.length - index - 1)
    const score = outcome.success ? 1.0 : 0.0
    
    weightedSum += score * weight
    weightSum += weight
  })
  
  return weightSum > 0 ? weightedSum / weightSum : 0.5
}
```

### Confidence Interval Adjustment

New vendors with few transactions should have uncertain trust scores:

```typescript
function adjustForConfidence(
  rawScore: number,
  transactionCount: number,
  minSampleSize: number = 10
): number {
  if (transactionCount >= minSampleSize) {
    return rawScore
  }
  
  // Regress toward mean (0.5) for low sample sizes
  const confidence = transactionCount / minSampleSize
  return rawScore * confidence + 0.5 * (1 - confidence)
}
```

---

## Integration with Agents

### Reputation-Based Planner

```typescript
import { AgentPlanner, AgentAction } from '@x402-qagent/agent-sdk'
import { VendorReputationTracker } from './reputation-tracker'

export class ReputationBasedPlanner implements AgentPlanner {
  constructor(
    private reputationTracker: VendorReputationTracker,
    private minTrustScore: number = 0.6  // Don't use vendors below 0.6
  ) {}
  
  async selectAction(
    candidates: AgentAction[],
    budget: number
  ): Promise<AgentAction | null> {
    // Filter by budget
    const affordable = candidates.filter(a => a.estimatedCost <= budget)
    
    if (affordable.length === 0) return null
    
    // Get reputation for each vendor
    const scored = await Promise.all(
      affordable.map(async (action) => {
        const reputation = await this.reputationTracker.getReputation(action.vendor)
        return {
          action,
          trustScore: reputation?.trustScore ?? 0.5,
          cost: action.estimatedCost,
        }
      })
    )
    
    // Filter by minimum trust score
    const trusted = scored.filter(s => s.trustScore >= this.minTrustScore)
    
    if (trusted.length === 0) {
      // No trusted vendors available
      console.warn('No vendors meet minimum trust threshold')
      return null
    }
    
    // Select by highest trust score (could also optimize cost/trust ratio)
    trusted.sort((a, b) => b.trustScore - a.trustScore)
    
    return trusted[0].action
  }
}
```

### Cost-Trust Optimization

Sometimes cheaper vendors with lower trust scores might be acceptable:

```typescript
export class CostTrustOptimizerPlanner implements AgentPlanner {
  async selectAction(
    candidates: AgentAction[],
    budget: number
  ): Promise<AgentAction | null> {
    const scored = await Promise.all(
      candidates.map(async (action) => {
        const reputation = await this.reputationTracker.getReputation(action.vendor)
        const trustScore = reputation?.trustScore ?? 0.5
        
        // Value = Trust / Cost (higher is better)
        const value = trustScore / (action.estimatedCost || 1)
        
        return { action, trustScore, value }
      })
    )
    
    // Filter by budget and minimum trust (0.4)
    const viable = scored.filter(
      s => s.action.estimatedCost <= budget && s.trustScore >= 0.4
    )
    
    if (viable.length === 0) return null
    
    // Select best value
    viable.sort((a, b) => b.value - a.value)
    return viable[0].action
  }
}
```

---

## Data Storage

### Local Storage (Development)

```typescript
export class JSONLReputationStore {
  constructor(private filepath: string) {}
  
  async save(reputation: VendorReputation): Promise<void> {
    await fs.appendFile(
      this.filepath,
      JSON.stringify(reputation) + '\n'
    )
  }
  
  async load(vendorAddress: Address): Promise<VendorReputation | null> {
    const content = await fs.readFile(this.filepath, 'utf-8')
    const lines = content.split('\n').filter(Boolean)
    
    // Find most recent entry for this vendor
    for (let i = lines.length - 1; i >= 0; i--) {
      const reputation = JSON.parse(lines[i])
      if (reputation.address === vendorAddress) {
        return reputation
      }
    }
    
    return null
  }
}
```

### Distributed Storage (Production)

```typescript
export class IPFSReputationStore {
  async save(reputation: VendorReputation): Promise<string> {
    // Pin to IPFS
    const cid = await this.ipfs.add(JSON.stringify(reputation))
    
    // Optionally publish to IPNS for mutable reference
    await this.ipfs.name.publish(cid)
    
    return cid
  }
  
  async load(cid: string): Promise<VendorReputation> {
    const content = await this.ipfs.cat(cid)
    return JSON.parse(content.toString())
  }
}
```

### On-Chain Storage (Future)

```rust
// Solana program for on-chain reputation
pub struct VendorReputation {
    pub vendor: Pubkey,
    pub total_transactions: u64,
    pub successful_transactions: u64,
    pub total_volume: u64,
    pub trust_score: u16,  // 0-10000 (2 decimal places)
    pub last_updated: i64,
}
```

---

## Privacy Considerations

### Agent Privacy

Agents may not want to reveal:
- Which vendors they use
- How much they spend
- Their selection criteria

**Solutions:**
- **Local reputation tracking** (don't share with others)
- **Pseudonymous agent IDs** (rotate identifiers)
- **Aggregate reputation** (community-shared but anonymized)

### Vendor Privacy

Vendors may not want to reveal:
- Total revenue
- Customer count
- Service details

**Solutions:**
- **Opt-in reputation** (vendors choose to participate)
- **Aggregated metrics only** (no individual transaction data)
- **Zero-knowledge proofs** (prove reputation without revealing transactions)

---

## Implementation

See:
- `packages/telemetry-core/src/reputation-tracker.ts` - Core implementation
- `packages/agent-sdk/src/planners/reputation-planner.ts` - Reputation-based planner
- `examples/reputation-vendor-selection/` - Working example

---

## Next Steps

- **[Integration Guide](./INTEGRATION_GUIDE.md)** - How to add reputation tracking to your agent
- **[Privacy Patterns](../privacy/PATTERNS.md)** - Privacy-preserving reputation
- **[Fraud Detection](../fraud-detection/ARCHITECTURE.md)** - Combining reputation with fraud detection

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-09  
**Status:** 🟢 Ready for Implementation
