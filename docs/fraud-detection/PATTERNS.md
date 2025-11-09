# Fraud Detection Patterns

**Protect autonomous agents from malicious vendors and exploitation**

This document outlines fraud detection and prevention patterns for X402 autonomous agents.

---

## Table of Contents

- [Threat Model](#threat-model)
- [Detection Patterns](#detection-patterns)
- [Prevention Mechanisms](#prevention-mechanisms)
- [Integration Guide](#integration-guide)
- [Best Practices](#best-practices)

---

## Threat Model

### Attack Vectors

**1. Payment Fraud:**
- Vendor accepts payment but doesn't deliver service
- Vendor delivers incomplete or incorrect service
- Vendor charges more than advertised price

**2. Service Exploitation:**
- Vendor intentionally degrades service quality over time
- Vendor mines agent behavior for competitive advantage
- Vendor front-runs agent requests

**3. Budget Attacks:**
- Malicious vendor drains agent budget through spam requests
- Coordinated vendors collude to exhaust budget
- Vendor manipulates pricing dynamically

**4. Reputation Attacks:**
- Sybil attacks (fake identities to boost reputation)
- Review fraud (fake positive reviews)
- Competitor sabotage (fake negative reviews)

---

## Detection Patterns

### 1. Anomaly Detection

**Pattern:** Detect unusual patterns in vendor behavior

```typescript
export class AnomalyDetector {
  private historicalData: Map<Address, VendorMetrics[]> = new Map()
  
  async detectPriceAnomaly(
    vendor: Address,
    currentPrice: number
  ): Promise<boolean> {
    const history = this.historicalData.get(vendor) || []
    
    if (history.length < 10) {
      return false  // Not enough data
    }
    
    // Calculate mean and std dev of historical prices
    const prices = history.map(m => m.price)
    const mean = prices.reduce((a, b) => a + b) / prices.length
    const stdDev = Math.sqrt(
      prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
    )
    
    // Detect if current price is >3 std deviations from mean
    const zScore = Math.abs((currentPrice - mean) / stdDev)
    
    if (zScore > 3) {
      console.warn(`Price anomaly detected for ${vendor}: ${currentPrice} vs avg ${mean}`)
      return true
    }
    
    return false
  }
  
  async detectResponseTimeAnomaly(
    vendor: Address,
    responseTime: number
  ): Promise<boolean> {
    const history = this.historicalData.get(vendor) || []
    
    if (history.length < 10) return false
    
    const times = history.map(m => m.responseTime)
    const mean = times.reduce((a, b) => a + b) / times.length
    
    // Alert if response time is >10x average
    if (responseTime > mean * 10) {
      console.warn(`Response time anomaly: ${responseTime}ms vs avg ${mean}ms`)
      return true
    }
    
    return false
  }
  
  async detectVolumeAnomaly(
    vendor: Address,
    recentTxCount: number,
    windowMinutes: number = 60
  ): Promise<boolean> {
    // Detect sudden spike in transaction volume
    const history = this.historicalData.get(vendor) || []
    const recentHistory = history.filter(
      m => Date.now() - new Date(m.timestamp).getTime() < windowMinutes * 60 * 1000
    )
    
    const avgTxPerHour = recentHistory.length / (windowMinutes / 60)
    
    if (recentTxCount > avgTxPerHour * 5) {
      console.warn(`Volume anomaly: ${recentTxCount} tx/hr vs avg ${avgTxPerHour}`)
      return true
    }
    
    return false
  }
}
```

---

### 2. Circuit Breaker Pattern

**Pattern:** Automatically halt payments to vendors with high failure rates

```typescript
export class CircuitBreaker {
  private state: Map<Address, CircuitState> = new Map()
  
  private readonly failureThreshold = 5    // Open circuit after 5 failures
  private readonly successThreshold = 2    // Close after 2 successes
  private readonly timeoutMs = 60_000      // 1 minute timeout
  
  async checkCircuit(vendor: Address): Promise<CircuitStatus> {
    const state = this.getState(vendor)
    
    if (state.status === 'open') {
      const timeSinceOpen = Date.now() - state.lastFailureTime
      
      if (timeSinceOpen >= this.timeoutMs) {
        // Try half-open state
        state.status = 'half-open'
        console.log(`Circuit half-open for ${vendor}`)
      } else {
        return {
          allowed: false,
          reason: `Circuit open: vendor has ${state.failureCount} consecutive failures`,
        }
      }
    }
    
    return { allowed: true }
  }
  
  async recordSuccess(vendor: Address): Promise<void> {
    const state = this.getState(vendor)
    
    if (state.status === 'half-open') {
      state.successCount++
      
      if (state.successCount >= this.successThreshold) {
        state.status = 'closed'
        state.failureCount = 0
        state.successCount = 0
        console.log(`Circuit closed for ${vendor}`)
      }
    } else {
      state.failureCount = 0
    }
  }
  
  async recordFailure(vendor: Address): Promise<void> {
    const state = this.getState(vendor)
    state.failureCount++
    state.lastFailureTime = Date.now()
    
    if (state.failureCount >= this.failureThreshold) {
      state.status = 'open'
      console.warn(`Circuit opened for ${vendor} after ${state.failureCount} failures`)
    }
  }
  
  private getState(vendor: Address): CircuitState {
    if (!this.state.has(vendor)) {
      this.state.set(vendor, {
        status: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
      })
    }
    return this.state.get(vendor)!
  }
}

interface CircuitState {
  status: 'closed' | 'open' | 'half-open'
  failureCount: number
  successCount: number
  lastFailureTime: number
}
```

**Usage:**
```typescript
const circuitBreaker = new CircuitBreaker()

// Before making payment
const status = await circuitBreaker.checkCircuit(vendor)
if (!status.allowed) {
  console.error(`Cannot pay vendor: ${status.reason}`)
  return
}

// After transaction
if (result.success) {
  await circuitBreaker.recordSuccess(vendor)
} else {
  await circuitBreaker.recordFailure(vendor)
}
```

---

### 3. Rate Limiting

**Pattern:** Prevent budget exhaustion through spending caps

```typescript
export class RateLimiter {
  private limits: Map<string, TokenBucket> = new Map()
  
  async checkLimit(
    vendor: Address,
    action: string,
    amount: number
  ): Promise<boolean> {
    const key = `${vendor}:${action}`
    let bucket = this.limits.get(key)
    
    if (!bucket) {
      bucket = new TokenBucket({
        capacity: 100_000,      // Max 100k lamports
        fillRate: 10_000,       // Refill 10k/sec
        initialTokens: 100_000,
      })
      this.limits.set(key, bucket)
    }
    
    return bucket.tryConsume(amount)
  }
}

class TokenBucket {
  private tokens: number
  private lastRefill: number
  
  constructor(private config: {
    capacity: number
    fillRate: number
    initialTokens: number
  }) {
    this.tokens = config.initialTokens
    this.lastRefill = Date.now()
  }
  
  tryConsume(amount: number): boolean {
    this.refill()
    
    if (this.tokens >= amount) {
      this.tokens -= amount
      return true
    }
    
    return false
  }
  
  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    const refillAmount = elapsed * this.config.fillRate
    
    this.tokens = Math.min(
      this.config.capacity,
      this.tokens + refillAmount
    )
    this.lastRefill = now
  }
}
```

---

### 4. Vendor Blacklisting

**Pattern:** Maintain a list of known malicious vendors

```typescript
export class VendorBlacklist {
  private blacklist: Set<Address> = new Set()
  private reportThreshold = 3  // Block after 3 fraud reports
  private reports: Map<Address, FraudReport[]> = new Map()
  
  async isBlacklisted(vendor: Address): Promise<boolean> {
    return this.blacklist.has(vendor)
  }
  
  async reportFraud(
    vendor: Address,
    reason: string,
    evidence: unknown
  ): Promise<void> {
    const vendorReports = this.reports.get(vendor) || []
    
    vendorReports.push({
      timestamp: new Date().toISOString(),
      reason,
      evidence,
    })
    
    this.reports.set(vendor, vendorReports)
    
    // Blacklist if threshold reached
    if (vendorReports.length >= this.reportThreshold) {
      this.blacklist.add(vendor)
      console.warn(`Vendor ${vendor} blacklisted after ${vendorReports.length} reports`)
      
      // Emit telemetry event
      await this.emitBlacklistEvent(vendor, vendorReports)
    }
  }
  
  async removeFromBlacklist(vendor: Address): Promise<void> {
    this.blacklist.delete(vendor)
    this.reports.delete(vendor)
  }
  
  async getBlacklist(): Promise<Address[]> {
    return Array.from(this.blacklist)
  }
}
```

---

## Prevention Mechanisms

### 1. Pre-Payment Validation

```typescript
export class PaymentValidator {
  async validateBeforePayment(
    vendor: Address,
    amount: number,
    service: string
  ): Promise<ValidationResult> {
    const issues: string[] = []
    
    // Check blacklist
    if (await this.blacklist.isBlacklisted(vendor)) {
      issues.push('Vendor is blacklisted')
    }
    
    // Check circuit breaker
    const circuitStatus = await this.circuitBreaker.checkCircuit(vendor)
    if (!circuitStatus.allowed) {
      issues.push(circuitStatus.reason)
    }
    
    // Check rate limit
    if (!await this.rateLimiter.checkLimit(vendor, service, amount)) {
      issues.push('Rate limit exceeded')
    }
    
    // Check price anomaly
    if (await this.anomalyDetector.detectPriceAnomaly(vendor, amount)) {
      issues.push('Price is anomalous')
    }
    
    return {
      valid: issues.length === 0,
      issues,
    }
  }
}
```

### 2. Post-Payment Verification

```typescript
export class PaymentVerifier {
  async verifyServiceDelivery(
    receipt: PaymentReceipt,
    expectedResult: unknown,
    actualResult: unknown
  ): Promise<boolean> {
    // Verify result matches expectation
    if (!this.resultsMatch(expectedResult, actualResult)) {
      await this.reportFraud(receipt.vendor, 'Service not delivered as promised')
      return false
    }
    
    // Verify response time was reasonable
    if (receipt.responseTime > receipt.sla.maxResponseTime) {
      await this.reportSLAViolation(receipt.vendor, receipt.responseTime)
      return false
    }
    
    return true
  }
}
```

### 3. Budget Protection

```typescript
export class BudgetProtector {
  private spendingAlerts = [
    { threshold: 0.5, alerted: false },  // Alert at 50% spent
    { threshold: 0.75, alerted: false }, // Alert at 75% spent
    { threshold: 0.9, alerted: false },  // Alert at 90% spent
  ]
  
  async checkBudgetHealth(
    spent: number,
    total: number
  ): Promise<void> {
    const percentageSpent = spent / total
    
    for (const alert of this.spendingAlerts) {
      if (percentageSpent >= alert.threshold && !alert.alerted) {
        console.warn(`Budget alert: ${(alert.threshold * 100)}% spent`)
        await this.emitBudgetAlert(percentageSpent)
        alert.alerted = true
      }
    }
    
    // Emergency halt if budget nearly exhausted
    if (percentageSpent >= 0.95) {
      console.error('Emergency budget halt - 95% spent!')
      await this.haltAgent()
    }
  }
  
  async haltAgent(): Promise<void> {
    // Stop all pending transactions
    // Emit emergency telemetry
    // Notify operator
  }
}
```

---

## Integration Guide

### Step 1: Install Fraud Detection

```typescript
import {
  AnomalyDetector,
  CircuitBreaker,
  RateLimiter,
  VendorBlacklist,
  PaymentValidator,
} from '@x402-qagent/fraud-detection'

const fraudDetection = {
  anomalyDetector: new AnomalyDetector(),
  circuitBreaker: new CircuitBreaker(),
  rateLimiter: new RateLimiter(),
  blacklist: new VendorBlacklist(),
  validator: new PaymentValidator(),
}
```

### Step 2: Wrap Agent Executor

```typescript
export class FraudProtectedExecutor extends DefaultAgentExecutor {
  async execute(
    action: AgentAction,
    adapter: ServiceAdapter
  ): Promise<ActionResult> {
    // Pre-flight checks
    const validation = await fraudDetection.validator.validateBeforePayment(
      action.vendor,
      action.estimatedCost,
      action.type
    )
    
    if (!validation.valid) {
      return {
        success: false,
        error: `Payment blocked: ${validation.issues.join(', ')}`,
        cost: 0,
      }
    }
    
    // Execute
    const result = await super.execute(action, adapter)
    
    // Post-execution checks
    if (result.success) {
      await fraudDetection.circuitBreaker.recordSuccess(action.vendor)
    } else {
      await fraudDetection.circuitBreaker.recordFailure(action.vendor)
      await fraudDetection.blacklist.reportFraud(
        action.vendor,
        result.error || 'Unknown failure',
        result
      )
    }
    
    return result
  }
}
```

### Step 3: Configure Policies

```typescript
const fraudPolicy = {
  circuitBreaker: {
    failureThreshold: 5,
    timeoutMs: 60_000,
  },
  rateLimit: {
    maxPerVendor: 100_000,  // 100k lamports
    refillRate: 10_000,     // 10k/sec
  },
  anomalyDetection: {
    priceStdDevThreshold: 3,
    responseTimeMultiplier: 10,
  },
  blacklist: {
    reportThreshold: 3,
    autoBlock: true,
  },
}
```

---

## Best Practices

### 1. Layer Multiple Defenses

```typescript
// Defense in depth
await checkBlacklist(vendor)
await checkCircuitBreaker(vendor)
await checkRateLimit(vendor, amount)
await checkAnomalies(vendor, amount)
await checkReputation(vendor)
```

### 2. Monitor and Alert

```typescript
export class FraudMonitor {
  async monitorContinuously(): Promise<void> {
    setInterval(async () => {
      const metrics = await this.collectMetrics()
      
      if (metrics.fraudAttempts > 10) {
        await this.alertOperator('High fraud activity detected')
      }
      
      if (metrics.blockedVendors > 5) {
        await this.alertOperator('Multiple vendors blocked')
      }
    }, 60_000)  // Check every minute
  }
}
```

### 3. Keep Blacklists Updated

```typescript
// Sync with community blacklist
await blacklist.syncWithCommunity('https://x402-blacklist.com/api')

// Share your fraud reports (opt-in)
await blacklist.shareReports('https://x402-reports.com/api')
```

### 4. Tune Parameters

```typescript
// Start conservative, relax over time
const initialPolicy = {
  circuitBreakerThreshold: 3,  // Very sensitive
  rateLimit: 50_000,           // Low limit
}

const maturePolicy = {
  circuitBreakerThreshold: 5,  // Less sensitive
  rateLimit: 200_000,          // Higher limit
}
```

---

## Next Steps

- **[Implementation Example](../../examples/fraud-protected-agent/)** - Working code
- **[Reputation System](../reputation/ARCHITECTURE.md)** - Trust-based selection
- **[Privacy Patterns](../privacy/PATTERNS.md)** - Fraud detection with privacy

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-09  
**Status:** 🟢 Ready for Implementation
