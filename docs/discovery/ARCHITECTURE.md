# Agentic Service Discovery

**Autonomous discovery and selection of X402-enabled services**

This document describes patterns for agents to autonomously discover, evaluate, and select service providers in the X402 ecosystem.

---

## Table of Contents

- [Overview](#overview)
- [Discovery Methods](#discovery-methods)
- [Service Registry](#service-registry)
- [Semantic Matching](#semantic-matching)
- [Integration Patterns](#integration-patterns)
- [Implementation Guide](#implementation-guide)

---

## Overview

### The Challenge

X402 enables payments, but **discovering services** is a separate problem:

❌ **Static Configuration** - Hard-coded vendor addresses don't scale  
❌ **Manual Discovery** - Agents can't find new services autonomously  
❌ **No Metadata** - Can't match services to agent needs  
❌ **No Price Discovery** - Can't compare vendors or negotiate

### The Solution

**Agentic service discovery** enables agents to:

✅ Find services dynamically based on capabilities  
✅ Compare vendors by price, reputation, and SLA  
✅ Discover new vendors as they join the network  
✅ Select optimal vendors for specific tasks

---

## Discovery Methods

### 1. DHT-Based Discovery (Decentralized)

**Pattern:** Use BitTorrent DHT for decentralized service catalog

```typescript
export class DHTServiceRegistry {
  private dht: DHT
  
  constructor() {
    this.dht = new DHT()
  }
  
  async registerService(listing: ServiceListing): Promise<void> {
    const key = this.computeKey(listing.capability)
    const value = JSON.stringify(listing)
    
    // Store in DHT
    await this.dht.put(key, Buffer.from(value))
    
    console.log(`Service registered: ${listing.serviceName} at ${key}`)
  }
  
  async discoverServices(capability: string): Promise<ServiceListing[]> {
    const key = this.computeKey(capability)
    
    // Query DHT
    const results = await this.dht.get(key)
    
    if (!results || results.length === 0) {
      return []
    }
    
    return results.map(r => JSON.parse(r.value.toString()))
  }
  
  private computeKey(capability: string): Buffer {
    // Deterministic key based on capability
    return crypto.createHash('sha256')
      .update(capability)
      .digest()
  }
}
```

**Benefits:**
- No central authority
- Censorship-resistant
- Globally available
- Low latency lookups

**Trade-offs:**
- No guarantees on freshness
- Potential for spam/poisoning
- Limited query capabilities

---

### 2. On-Chain Registry (Solana)

**Pattern:** Store service listings in Solana program

```typescript
// Solana program (Rust)
#[account]
pub struct ServiceListing {
    pub vendor: Pubkey,
    pub service_name: String,
    pub capability: String,
    pub base_price: u64,         // Lamports
    pub endpoint: String,
    pub sla_max_latency_ms: u32,
    pub sla_min_availability: u8, // Percentage
    pub created_at: i64,
    pub updated_at: i64,
}

// TypeScript client
export class OnChainServiceRegistry {
  async registerService(
    listing: ServiceListing,
    wallet: Keypair
  ): Promise<void> {
    const tx = new Transaction().add(
      await this.program.methods
        .registerService(
          listing.serviceName,
          listing.capability,
          listing.basePrice,
          listing.endpoint,
          listing.sla
        )
        .accounts({
          vendor: wallet.publicKey,
          listing: listingPDA,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    )
    
    await sendAndConfirmTransaction(this.connection, tx, [wallet])
  }
  
  async discoverServices(
    capability: string
  ): Promise<ServiceListing[]> {
    const accounts = await this.program.account.serviceListing.all([
      {
        memcmp: {
          offset: 8 + 32, // Skip discriminator and vendor pubkey
          bytes: bs58.encode(Buffer.from(capability)),
        },
      },
    ])
    
    return accounts.map(a => a.account)
  }
}
```

**Benefits:**
- Immutable, verifiable listings
- On-chain reputation integration
- Native X402 payment integration
- Censorship-resistant

**Trade-offs:**
- Transaction costs for updates
- Storage costs
- Latency for queries

---

### 3. IPFS/Arweave Registry (Decentralized Storage)

**Pattern:** Store service metadata in decentralized storage

```typescript
export class IPFSServiceRegistry {
  private ipfs: IPFS
  private indexCID: string // IPNS name for mutable index
  
  async registerService(listing: ServiceListing): Promise<string> {
    // Add listing to IPFS
    const cid = await this.ipfs.add(JSON.stringify(listing))
    
    // Update index
    await this.updateIndex(listing.capability, cid)
    
    // Publish to IPNS for mutable reference
    await this.ipfs.name.publish(this.indexCID)
    
    return cid
  }
  
  async discoverServices(capability: string): Promise<ServiceListing[]> {
    // Resolve IPNS to latest index
    const indexData = await this.ipfs.cat(this.indexCID)
    const index = JSON.parse(indexData.toString())
    
    // Get CIDs for this capability
    const cids = index[capability] || []
    
    // Fetch listings
    const listings = await Promise.all(
      cids.map(async cid => {
        const data = await this.ipfs.cat(cid)
        return JSON.parse(data.toString())
      })
    )
    
    return listings
  }
}
```

---

### 4. SigilNet Registry (Capability-Based)

**Pattern:** Leverage SigilNet's capability registry for discovery

```typescript
export class SigilNetServiceRegistry {
  constructor(private sigilnetUrl: string) {}
  
  async registerService(
    listing: ServiceListing,
    capability: SigilNetCapability
  ): Promise<void> {
    await fetch(`${this.sigilnetUrl}/registry/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing,
        capability: {
          type: capability.type,
          morphisms: capability.morphisms,
          composition: capability.composition,
        },
      }),
    })
  }
  
  async discoverServices(
    query: CapabilityQuery
  ): Promise<ServiceListing[]> {
    const response = await fetch(`${this.sigilnetUrl}/registry/discover`, {
      method: 'POST',
      body: JSON.stringify(query),
    })
    
    return await response.json()
  }
}
```

---

## Service Registry

### Service Listing Schema

```typescript
export interface ServiceListing {
  // Identity
  vendor: Address              // Vendor's Solana address
  serviceName: string          // Human-readable name
  description: string          // What the service does
  
  // Capabilities
  capability: string           // Primary capability (e.g., "text-transform")
  capabilities: string[]       // Additional capabilities
  
  // Pricing
  pricing: {
    basePrice: number          // Base price in lamports
    pricingModel: 'fixed' | 'dynamic' | 'tiered'
    volumeDiscounts?: Array<{
      threshold: number        // Requests per month
      discount: number         // Percentage discount
    }>
  }
  
  // SLA
  sla: {
    maxLatency: number         // Milliseconds
    minAvailability: number    // Percentage (0-100)
    maxFailureRate: number     // Percentage (0-100)
    refundPolicy: string       // Description
  }
  
  // Discovery
  endpoint: string             // HTTPS endpoint
  categories: string[]         // ["ai", "nlp", "text-processing"]
  tags: string[]              // ["gpt", "translation", "summarization"]
  
  // Metadata
  createdAt: string
  updatedAt: string
  version: string
}
```

### Registry Interface

```typescript
export interface ServiceRegistry {
  /**
   * Register a new service listing
   */
  registerService(listing: ServiceListing): Promise<void>
  
  /**
   * Update an existing service listing
   */
  updateService(
    vendor: Address,
    updates: Partial<ServiceListing>
  ): Promise<void>
  
  /**
   * Remove a service listing
   */
  removeService(vendor: Address): Promise<void>
  
  /**
   * Discover services by capability
   */
  discoverServices(query: ServiceQuery): Promise<ServiceListing[]>
  
  /**
   * Get a specific service by vendor address
   */
  getService(vendor: Address): Promise<ServiceListing | null>
}
```

---

## Semantic Matching

### Capability-Based Search

```typescript
export class SemanticMatcher {
  /**
   * Find services that match agent's needs
   */
  async findServicesByCapability(
    requiredCapability: string,
    budget: number
  ): Promise<RankedService[]> {
    // Discover all services with this capability
    const services = await this.registry.discoverServices({
      capability: requiredCapability,
    })
    
    // Filter by budget
    const affordable = services.filter(s => s.pricing.basePrice <= budget)
    
    // Rank by relevance
    const ranked = affordable.map(service => ({
      service,
      score: this.computeRelevanceScore(service, requiredCapability),
    }))
    
    // Sort by score
    ranked.sort((a, b) => b.score - a.score)
    
    return ranked
  }
  
  private computeRelevanceScore(
    service: ServiceListing,
    query: string
  ): number {
    let score = 0
    
    // Exact capability match
    if (service.capability === query) {
      score += 10
    }
    
    // Additional capabilities
    if (service.capabilities.includes(query)) {
      score += 5
    }
    
    // Tag matches
    score += service.tags.filter(t => query.includes(t)).length
    
    // Category matches
    score += service.categories.filter(c => query.includes(c)).length
    
    return score
  }
}
```

### Multi-Criteria Ranking

```typescript
export class ServiceRanker {
  async rankServices(
    services: ServiceListing[],
    criteria: RankingCriteria
  ): Promise<RankedService[]> {
    const ranked = services.map(service => {
      const scores = {
        price: this.scoreByCost(service, criteria.budget),
        reputation: this.scoreByReputation(service.vendor),
        sla: this.scoreBySLA(service.sla, criteria.requirements),
        availability: this.scoreByAvailability(service.vendor),
      }
      
      // Weighted average
      const totalScore = 
        scores.price * criteria.weights.price +
        scores.reputation * criteria.weights.reputation +
        scores.sla * criteria.weights.sla +
        scores.availability * criteria.weights.availability
      
      return {
        service,
        score: totalScore,
        breakdown: scores,
      }
    })
    
    ranked.sort((a, b) => b.score - a.score)
    return ranked
  }
  
  private scoreByCost(service: ServiceListing, budget: number): number {
    if (service.pricing.basePrice > budget) return 0
    
    // Prefer services that are cheaper relative to budget
    return 1 - (service.pricing.basePrice / budget)
  }
  
  private scoreByReputation(vendor: Address): number {
    const reputation = this.reputationTracker.getReputation(vendor)
    return reputation?.trustScore ?? 0.5
  }
  
  private scoreBySLA(sla: ServiceListing['sla'], requirements: SLARequirements): number {
    let score = 1.0
    
    if (sla.maxLatency > requirements.maxLatency) {
      score *= 0.5
    }
    
    if (sla.minAvailability < requirements.minAvailability) {
      score *= 0.5
    }
    
    return score
  }
}
```

---

## Integration Patterns

### Agent-Driven Discovery

```typescript
export class DiscoveryPlanner implements AgentPlanner {
  constructor(
    private registry: ServiceRegistry,
    private ranker: ServiceRanker,
    private reputationTracker: VendorReputationTracker
  ) {}
  
  async selectAction(
    candidates: AgentAction[],
    budget: number
  ): Promise<AgentAction | null> {
    // If no candidates provided, discover services
    if (candidates.length === 0) {
      candidates = await this.discoverCandidates(budget)
    }
    
    // Rank by multiple criteria
    const ranked = await this.ranker.rankServices(
      candidates.map(a => a.service),
      {
        budget,
        weights: {
          price: 0.3,
          reputation: 0.4,
          sla: 0.2,
          availability: 0.1,
        },
        requirements: {
          maxLatency: 5000,
          minAvailability: 99.0,
        },
      }
    )
    
    if (ranked.length === 0) return null
    
    // Select top-ranked service
    return {
      type: ranked[0].service.capability,
      vendor: ranked[0].service.vendor,
      estimatedCost: ranked[0].service.pricing.basePrice,
      service: ranked[0].service,
    }
  }
  
  private async discoverCandidates(budget: number): Promise<AgentAction[]> {
    // Discover services for needed capabilities
    const services = await this.registry.discoverServices({
      maxPrice: budget,
      minAvailability: 95.0,
    })
    
    return services.map(service => ({
      type: service.capability,
      vendor: service.vendor,
      estimatedCost: service.pricing.basePrice,
      service,
    }))
  }
}
```

### Dynamic Vendor Selection

```typescript
export class DynamicVendorSelector {
  async selectVendor(
    capability: string,
    budget: number,
    context: SelectionContext
  ): Promise<Address | null> {
    // Discover services
    const services = await this.registry.discoverServices({
      capability,
      maxPrice: budget,
    })
    
    if (services.length === 0) {
      console.warn(`No services found for ${capability}`)
      return null
    }
    
    // Apply filters
    const filtered = this.applyFilters(services, context.filters)
    
    // Rank by context
    const ranked = await this.rankByContext(filtered, context)
    
    return ranked[0]?.vendor ?? null
  }
  
  private applyFilters(
    services: ServiceListing[],
    filters: SelectionFilters
  ): ServiceListing[] {
    let filtered = services
    
    if (filters.blacklist) {
      filtered = filtered.filter(s => !filters.blacklist.includes(s.vendor))
    }
    
    if (filters.whitelist) {
      filtered = filtered.filter(s => filters.whitelist.includes(s.vendor))
    }
    
    if (filters.minReputation) {
      filtered = filtered.filter(s => {
        const rep = this.reputationTracker.getReputation(s.vendor)
        return (rep?.trustScore ?? 0) >= filters.minReputation
      })
    }
    
    return filtered
  }
}
```

---

## Implementation Guide

### Step 1: Choose Discovery Method

```typescript
// Option 1: DHT (decentralized, no infrastructure)
const registry = new DHTServiceRegistry()

// Option 2: On-chain (verifiable, costs SOL)
const registry = new OnChainServiceRegistry(connection, program)

// Option 3: IPFS (decentralized storage)
const registry = new IPFSServiceRegistry(ipfs)

// Option 4: SigilNet (capability-based)
const registry = new SigilNetServiceRegistry('https://sigilnet.example.com')
```

### Step 2: Register Services (Vendor Side)

```typescript
// Vendor registers their service
await registry.registerService({
  vendor: vendorWallet.publicKey.toString(),
  serviceName: 'Premium Text Transformer',
  description: 'High-quality text transformations with 99.9% uptime',
  capability: 'text-transform',
  capabilities: ['uppercase', 'lowercase', 'reverse', 'capitalize'],
  pricing: {
    basePrice: 10_000,
    pricingModel: 'fixed',
  },
  sla: {
    maxLatency: 1000,
    minAvailability: 99.9,
    maxFailureRate: 0.1,
    refundPolicy: 'Full refund if SLA violated',
  },
  endpoint: 'https://api.text-transform.com',
  categories: ['text-processing', 'nlp'],
  tags: ['fast', 'reliable', 'premium'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: '1.0.0',
})
```

### Step 3: Discover Services (Agent Side)

```typescript
// Agent discovers services dynamically
const matcher = new SemanticMatcher(registry)

const services = await matcher.findServicesByCapability(
  'text-transform',
  budget: 50_000
)

console.log(`Found ${services.length} services`)
services.forEach(({ service, score }) => {
  console.log(`  ${service.serviceName}: ${score} (${service.pricing.basePrice} lamports)`)
})
```

### Step 4: Integrate with Agent

```typescript
const agent = new DefaultAgentExecutor(
  budget,
  'discovery-agent',
  emitTelemetry
)

// Use discovery planner
const planner = new DiscoveryPlanner(registry, ranker, reputationTracker)

// Agent autonomously discovers and selects vendors
const action = await planner.selectAction([], budget.getAvailable())

if (action) {
  const result = await agent.execute(action, createAdapter(action.service))
}
```

---

## Best Practices

### 1. Cache Discovery Results

```typescript
const cache = new LRUCache<string, ServiceListing[]>({
  max: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
})

async function discoverWithCache(capability: string): Promise<ServiceListing[]> {
  const cached = cache.get(capability)
  if (cached) return cached
  
  const services = await registry.discoverServices({ capability })
  cache.set(capability, services)
  
  return services
}
```

### 2. Validate Service Listings

```typescript
function validateListing(listing: ServiceListing): boolean {
  // Check required fields
  if (!listing.vendor || !listing.endpoint) return false
  
  // Validate pricing
  if (listing.pricing.basePrice <= 0) return false
  
  // Validate SLA
  if (listing.sla.minAvailability < 0 || listing.sla.minAvailability > 100) {
    return false
  }
  
  return true
}
```

### 3. Monitor Service Health

```typescript
export class ServiceHealthMonitor {
  async monitorServices(registry: ServiceRegistry): Promise<void> {
    const services = await registry.discoverServices({})
    
    for (const service of services) {
      const health = await this.checkHealth(service.endpoint)
      
      if (!health.available) {
        console.warn(`Service ${service.serviceName} is down`)
        await this.reportDowntime(service.vendor)
      }
    }
  }
}
```

---

## Next Steps

- **[Implementation Example](../../examples/agentic-service-discovery/)** - Working code
- **[Reputation System](../reputation/ARCHITECTURE.md)** - Combine discovery with reputation
- **[Privacy Patterns](../privacy/PATTERNS.md)** - Privacy-preserving discovery

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-09  
**Status:** 🟢 Ready for Implementation
