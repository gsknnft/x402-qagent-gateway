# X402 Integration Guide for Developers

**How to integrate the X402 Quantum Agent Gateway into your application**

This guide helps developers integrate autonomous economic agents into existing applications using the X402 payment protocol.

---

## Table of Contents

- [Integration Scenarios](#integration-scenarios)
- [Quick Integration](#quick-integration)
- [Advanced Integration](#advanced-integration)
- [Migration from Traditional Payments](#migration-from-traditional-payments)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Integration Scenarios

### Scenario 1: Add Payment-Gated API

**Use Case:** You have an existing API and want to accept X402 payments

**Approach:** Wrap your API endpoints with X402 middleware

```typescript
import { X402Middleware } from '@x402-qagent/middleware'

const x402 = new X402Middleware({
  vendorWallet: process.env.VENDOR_WALLET_ADDRESS!,
  network: 'solana-devnet',
  pricing: {
    '/api/transform': 10_000,    // 10k lamports
    '/api/analyze': 50_000,      // 50k lamports
    '/api/generate': 100_000,    // 100k lamports
  },
})

app.post('/api/transform', x402.requirePayment(), async (req, res) => {
  const { text, operation } = req.body
  const result = transformText(text, operation)
  res.json({ result })
})
```

---

### Scenario 2: Build Autonomous Agent

**Use Case:** Create an agent that pays for services autonomously

**Approach:** Use the Agent SDK with budget management

```typescript
import { BudgetManager, DefaultAgentExecutor } from '@x402-qagent/agent-sdk'

// Initialize agent
const budget = new BudgetManager(1_000_000) // 1M lamports
const agent = new DefaultAgentExecutor(budget, 'my-agent', emitTelemetry)

// Create adapter for your service
const serviceAdapter = new MyServiceAdapter({
  vendorAddress: 'VendorWallet123',
  endpoint: 'https://api.vendor.com',
})

// Execute tasks autonomously
await agent.execute({
  type: 'my-task',
  input: { data: 'input data' },
  estimatedCost: 10_000,
  vendor: 'VendorWallet123',
}, serviceAdapter)
```

---

### Scenario 3: Migrate from Stripe/PayPal

**Use Case:** Replace traditional payment processor with X402

**Before (Stripe):**
```typescript
app.post('/api/service', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: 'price_123', quantity: 1 }],
  })
  
  res.redirect(session.url)
})
```

**After (X402):**
```typescript
app.post('/api/service', x402.requirePayment({ price: 10_000 }), async (req, res) => {
  // Payment already verified by middleware
  const result = await performService(req.body)
  res.json({ result })
})
```

---

### Scenario 4: Multi-Agent Marketplace

**Use Case:** Build a marketplace where agents buy/sell services

**Approach:** Combine agent SDK with service registry

```typescript
// Seller agent registers service
await registry.registerService({
  vendor: sellerWallet.publicKey,
  serviceName: 'Data Analysis Service',
  capability: 'data-analysis',
  pricing: { basePrice: 50_000 },
  endpoint: 'https://seller.com/api/analyze',
})

// Buyer agent discovers and purchases
const services = await registry.discoverServices({ capability: 'data-analysis' })
const bestService = services[0]

await buyerAgent.execute({
  type: 'data-analysis',
  vendor: bestService.vendor,
  estimatedCost: bestService.pricing.basePrice,
}, createAdapter(bestService))
```

---

## Quick Integration

### Step 1: Install Packages

```bash
pnpm add @x402-qagent/middleware @x402-qagent/agent-sdk @x402-qagent/telemetry
```

### Step 2: Initialize X402 Client

```typescript
import { X402Client } from '@x402-qagent/middleware'

const client = new X402Client({
  network: 'solana-devnet',
  facilitatorUrl: 'https://x402.org/facilitator',
  wallet: yourSolanaWallet,
})
```

### Step 3: Make a Payment

```typescript
const receipt = await client.pay({
  vendor: 'VendorWalletAddress',
  amount: 10_000,
  endpoint: 'https://vendor.com/api/service',
})

console.log('Payment settled:', receipt.signature)
```

### Step 4: Verify Payment (Vendor Side)

```typescript
const isValid = await client.verifyPayment(receipt)

if (isValid) {
  // Deliver service
} else {
  // Reject request
}
```

---

## Advanced Integration

### Custom Policy Engine

```typescript
import { PolicyEngine, PaymentPolicy } from '@x402-qagent/middleware'

const policy: PaymentPolicy = {
  budgetCap: 500_000,           // Max 500k lamports total
  maxPricePerRequest: 50_000,   // Max 50k per request
  
  vendorAllowlist: [
    'TrustedVendor1',
    'TrustedVendor2',
  ],
  
  maxRequestsPerMinute: 10,
  maxRequestsPerHour: 100,
  
  haltOnBudgetExhaustion: true,
  haltOnPolicyViolation: true,
}

const policyEngine = new PolicyEngine(policy)

// Check before payment
const allowed = await policyEngine.checkPayment({
  vendor: 'VendorAddress',
  amount: 10_000,
})

if (!allowed.approved) {
  console.error('Payment blocked:', allowed.reason)
}
```

### Custom Telemetry Sink

```typescript
import { TelemetrySink, TelemetryEvent } from '@x402-qagent/telemetry'

export class CustomSink implements TelemetrySink {
  async emit(event: TelemetryEvent): Promise<void> {
    // Send to your backend
    await fetch('https://your-backend.com/telemetry', {
      method: 'POST',
      body: JSON.stringify(event),
    })
    
    // Store in database
    await db.telemetry.create({ data: event })
    
    // Trigger alerts
    if (event.type === 'budget.exhausted') {
      await sendAlert('Budget exhausted!')
    }
  }
}
```

### Custom Agent Planner

```typescript
import { AgentPlanner, AgentAction } from '@x402-qagent/agent-sdk'

export class MyCustomPlanner implements AgentPlanner {
  async selectAction(
    candidates: AgentAction[],
    budget: number
  ): Promise<AgentAction | null> {
    // Your custom selection logic
    const affordable = candidates.filter(a => a.estimatedCost <= budget)
    
    if (affordable.length === 0) return null
    
    // Select cheapest
    affordable.sort((a, b) => a.estimatedCost - b.estimatedCost)
    return affordable[0]
  }
}
```

---

## Migration from Traditional Payments

### From REST API with API Keys

**Before:**
```typescript
app.post('/api/service', authenticateAPIKey, async (req, res) => {
  if (!req.user.hasCredits) {
    return res.status(402).json({ error: 'Insufficient credits' })
  }
  
  req.user.credits -= 1
  await req.user.save()
  
  const result = await performService(req.body)
  res.json({ result })
})
```

**After:**
```typescript
app.post('/api/service', x402.requirePayment({ price: 10_000 }), async (req, res) => {
  // X402 middleware handles payment verification
  // No user accounts, no credit tracking needed
  
  const result = await performService(req.body)
  res.json({ result })
})
```

### From Subscription Model

**Before:**
```typescript
app.post('/api/service', requireActiveSubscription, async (req, res) => {
  if (req.user.subscription.status !== 'active') {
    return res.status(402).json({ error: 'Subscription required' })
  }
  
  const result = await performService(req.body)
  res.json({ result })
})
```

**After:**
```typescript
app.post('/api/service', x402.requirePayment({ price: 1_000 }), async (req, res) {
  // Pay-per-use instead of subscription
  // Users only pay for what they use
  
  const result = await performService(req.body)
  res.json({ result })
})
```

---

## Production Deployment

### Environment Configuration

```bash
# .env.production
NODE_ENV=production
SOLANA_NETWORK=mainnet-beta
X402_FACILITATOR_URL=https://x402.org/facilitator

# Vendor wallet (keep secure!)
VENDOR_WALLET_PRIVATE_KEY=<your-private-key>

# Budget limits
AGENT_BUDGET_CAP=10000000  # 10M lamports
AGENT_MAX_PRICE_PER_REQUEST=100000  # 100k lamports

# Telemetry
TELEMETRY_ENDPOINT=https://your-backend.com/telemetry
TELEMETRY_RETENTION_DAYS=90

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
DATADOG_API_KEY=<your-datadog-key>
```

### Security Best Practices

```typescript
// 1. Never expose private keys
const wallet = Keypair.fromSecretKey(
  Buffer.from(process.env.VENDOR_WALLET_PRIVATE_KEY!, 'base64')
)

// 2. Validate all inputs
function validateRequest(req: Request): void {
  if (!req.body.data || typeof req.body.data !== 'string') {
    throw new Error('Invalid request')
  }
  
  // Sanitize inputs
  req.body.data = sanitize(req.body.data)
}

// 3. Rate limiting
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,             // Max 100 requests per minute
})

app.use('/api/', limiter)

// 4. HTTPS only
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.headers.host}${req.url}`)
  }
  next()
})
```

### Monitoring and Alerting

```typescript
import * as Sentry from '@sentry/node'

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})

// Monitor payments
client.on('payment.settled', (receipt) => {
  console.log('Payment settled:', receipt.signature)
  
  // Send to monitoring
  metrics.increment('payments.settled')
  metrics.histogram('payment.amount', receipt.amount)
})

client.on('payment.failed', (error) => {
  console.error('Payment failed:', error)
  
  // Alert on failures
  Sentry.captureException(error)
  metrics.increment('payments.failed')
  
  if (metrics.get('payments.failed.rate') > 0.1) {
    sendAlert('High payment failure rate!')
  }
})
```

### Scaling Considerations

```typescript
// 1. Connection pooling
const client = new X402Client({
  network: 'solana-mainnet-beta',
  connectionPool: {
    maxConnections: 50,
    keepAlive: true,
  },
})

// 2. Caching
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

async function getVendorInfo(address: Address): Promise<VendorInfo> {
  const cached = await redis.get(`vendor:${address}`)
  if (cached) return JSON.parse(cached)
  
  const info = await fetchVendorInfo(address)
  await redis.setex(`vendor:${address}`, 300, JSON.stringify(info))
  
  return info
}

// 3. Horizontal scaling
// Run multiple agent instances behind load balancer
// Use shared Redis for coordination
```

---

## Troubleshooting

### Payment Not Settling

**Problem:** `await client.pay()` times out

**Solutions:**
```typescript
// 1. Check network connectivity
console.log('Network:', await connection.getVersion())

// 2. Verify wallet has SOL for transaction fees
const balance = await connection.getBalance(wallet.publicKey)
console.log('Wallet balance:', balance)

// 3. Increase timeout
const receipt = await client.pay(request, { timeout: 60000 })

// 4. Check Solana network status
// https://status.solana.com
```

### Budget Exhausted Unexpectedly

**Problem:** Agent halts with budget exhaustion

**Solutions:**
```typescript
// 1. Check actual spending
const spent = initialBudget - await budget.getAvailable()
console.log('Spent:', spent, 'lamports')

// 2. Review telemetry
const events = await loadTelemetry()
const payments = events.filter(e => e.type === 'payment.settled')
console.log('Payments:', payments.length)

// 3. Adjust budget cap
const policy = {
  budgetCap: 10_000_000,  // Increase if needed
}
```

### Vendor Not Responding

**Problem:** Service calls timing out

**Solutions:**
```typescript
// 1. Check vendor health
const health = await fetch(`${vendor.endpoint}/health`)
console.log('Vendor status:', health.status)

// 2. Add retry logic
const adapter = new RetryAdapter({
  maxRetries: 3,
  backoffMs: 1000,
})

// 3. Circuit breaker
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 60000,
})
```

---

## Next Steps

- **[Getting Started Tutorial](./GETTING_STARTED.md)** - Build your first agent
- **[Custom Adapters](./CUSTOM_ADAPTERS.md)** - Create service integrations
- **[API Reference](../../API_REFERENCE.md)** - Complete SDK documentation
- **[Examples](../../examples/)** - Working code examples

---

## Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/gsknnft/x402-qagent-gateway/issues)
- **GitHub Discussions:** [Ask questions](https://github.com/gsknnft/x402-qagent-gateway/discussions)
- **Documentation:** [Full docs](../../README.md)

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-09  
**Status:** 🟢 Production Ready
