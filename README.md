# X402 Quantum Agent Gateway

**Autonomous AI agents that act as economic entities, transacting via X402 micropayments on Solana.**

This project showcases a complete agent economy framework where AI agents autonomously buy and sell services using the X402 payment protocol. Unlike simple payment-gated content, this demonstrates **agents with budgets, policies, and vendor selection strategies** - true economic autonomy.

> 🏆 **Solana X402 Hackathon Submission** - This project targets three tracks: Best Trustless Agent, Best x402 API Integration, and Best x402 Dev Tool. Built for devnet by default.

## 🎯 Differentiators

What makes this different from typical X402 demos:

✅ **Economic Autonomy** - Agents with budgets, policies, and vendor selection (not just paywalls)  
✅ **Verifiable Lineage** - Full telemetry streams with correlation IDs and signed events  
✅ **Multi-Agent Economy** - Agent-to-agent marketplace (seller agent + buyer agent)  
✅ **Composable Middleware** - Reusable SDK with decorators and policy hooks  
✅ **Integration Ready** - Documented hooks for SigilNet/QVera future integration

## Table of Contents

- [What is X402?](#what-is-x402)
- [Features](#features)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Usage](#usage)

---

## Architecture

This project consists of three main layers:

### 1. **Payment Middleware** (`packages/x402-middleware/`)
Reusable X402 payment abstractions:
- `X402Client` - Payment execution with idempotency & retry
- `PolicyEngine` - Budget caps, rate limits, vendor allowlists
- `withPayment()` - Decorator to wrap any function with payment
- Receipt verification and provenance tracking

### 2. **Agent SDK** (`packages/agent-sdk/`)
Framework for building autonomous economic agents:
- `BudgetManager` - Spending tracking with reservations
- `AgentExecutor` - Runs actions with payment & telemetry
- `ServiceAdapter` - Pluggable service implementations
- `AgentPlanner` - Action selection strategies (greedy, cost-optimizer)

### 3. **Telemetry Layer** (`packages/telemetry-core/`)
Event tracking and lineage:
- Multiple sinks: Console, JSONL, WebSocket
- Event schema: PaymentInitiated, Settled, ActionCompleted, BudgetDelta
- **SigilNet stub** - Integration hooks for future field closure layer
- Correlation IDs for full lineage tracking

## Demo Applications

### Seller Service (`apps/seller-service/`)
Micro-service that sells text transformations behind X402 paywall:
- POST `/api/transform` - Requires payment proof
- Operations: uppercase, lowercase, reverse
- Price: $0.01 per request

### Buyer Agent (`apps/agent-runner/`)
Autonomous agent that purchases services:
- Budget: 1M lamports (~$0.67)
- Policy: vendor allowlist, rate limits, halt conditions
- Autonomous task execution with retry logic
- Full telemetry emission

## What is X402?

**X402** is an open payment protocol that uses HTTP status code **402 "Payment Required"** to enable seamless cryptocurrency payments for web content and APIs.

### Key Benefits

- **Direct Payments** - Accept cryptocurrency payments without third-party payment processors
- **No Accounts** - No user registration or authentication required
- **Blockchain-Verified** - Payments are verified directly on the Solana blockchain
- **Simple Integration** - Add payment gates to any Next.js route with middleware
- **Flexible Pricing** - Set different prices for different content

### How It Works

```
1. User requests protected content
2. Server responds with 402 Payment Required
3. User makes payment via Coinbase Pay or crypto wallet
4. User proves payment with transaction signature
5. Server verifies on blockchain and grants access
```

---

## Features

- **X402 Payment Middleware** - Powered by `x402-next` package
- **Solana Integration** - Uses Solana blockchain for payment verification
- **Multiple Price Tiers** - Configure different prices for different routes
- **Session Management** - Automatic session handling after payment
- **Type-Safe** - Full TypeScript support with Viem types
- **Next.js 16** - Built on the latest Next.js App Router

---

## Quick Start - Agent-to-Agent Demo

### Prerequisites
- Node.js 20+ or Bun
- pnpm (recommended) or npm

### 1. Install Dependencies
```bash
cd isolation/x402-qagent-gateway
pnpm install
```

### 2. Start Seller Service
```bash
# Terminal 1
cd apps/seller-service
pnpm start

# Seller will listen on http://localhost:3001
```

### 3. Run Buyer Agent
```bash
# Terminal 2
cd apps/agent-runner
pnpm start

# Watch as the agent autonomously:
# - Checks budget
# - Pays for services
# - Executes transformations
# - Emits telemetry
```

### 4. View Telemetry
```bash
# Check logs
cat apps/agent-runner/logs/agent-telemetry.jsonl | jq

# See events:
# - payment.initiated
# - payment.settled
# - action.started
# - action.completed
# - budget.delta
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- pnpm, npm, or yarn
- A Solana wallet address to receive payments

### Installation

```bash
# Clone or create from template
npx create-solana-dapp my-app --template x402-template

# Navigate to project
cd my-app

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Visit `http://localhost:3000` to see your app running.

### Test the Payment Flow

1. Navigate to `http://localhost:3000`
2. Click on "Access Cheap Content" or "Access Expensive Content"
3. You'll be presented with a Coinbase Pay payment dialog
4. Complete the payment
5. Access is granted and you'll see the protected content

---

## How It Works

This template uses the `x402-next` package which provides middleware to handle the entire payment flow.

### Middleware Configuration

The core of the payment integration is in `middleware.ts`:

```typescript
import { Address } from 'viem'
import { paymentMiddleware, Resource, Network } from 'x402-next'
import { NextRequest } from 'next/server'

// Your Solana wallet address that receives payments
const address = 'CmGgLQL36Y9ubtTsy2zmE46TAxwCBm66onZmPPhUWNqv' as Address
const network = 'solana-devnet' as Network
const facilitatorUrl = 'https://x402.org/facilitator' as Resource
const cdpClientKey = '3uyu43EHCwgVIQx6a8cIfSkxp6cXgU30'

const x402PaymentMiddleware = paymentMiddleware(
  address,
  {
    '/content/cheap': {
      price: '$0.01',
      config: {
        description: 'Access to cheap content',
      },
      network,
    },
    '/content/expensive': {
      price: '$0.25',
      config: {
        description: 'Access to expensive content',
      },
      network,
    },
  },
  {
    url: facilitatorUrl,
  },
  {
    cdpClientKey,
    appLogo: '/logos/x402-examples.png',
    appName: 'x402 Demo',
    sessionTokenEndpoint: '/api/x402/session-token',
  },
)

export const middleware = (req: NextRequest) => {
  const delegate = x402PaymentMiddleware as unknown as (
    request: NextRequest,
  ) => ReturnType<typeof x402PaymentMiddleware>
  return delegate(req)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)', '/'],
}
```

### What Happens Under the Hood

1. **Request Interception** - Middleware checks if the requested route requires payment
2. **Payment Check** - If the route is protected, middleware checks for valid payment session
3. **402 Response** - If no valid payment, returns 402 with payment requirements
4. **Coinbase Pay Widget** - User sees payment modal powered by Coinbase
5. **Payment Verification** - After payment, transaction is verified on Solana blockchain via facilitator
6. **Session Creation** - Valid payment creates a session token
7. **Access Granted** - User can now access protected content

---

## Project Structure

```
x402-template/
├── middleware.ts              # 🛡️  X402 payment middleware configuration
├── app/
│   ├── page.tsx              # 🏠 Homepage with links to protected content
│   ├── layout.tsx            # 📐 Root layout
│   ├── globals.css           # 🎨 Global styles
│   └── content/
│       └── [type]/
│           └── page.tsx      # 🔒 Protected content pages
├── components/
│   └── cats-component.tsx    # 🐱 Example content component
├── lib/                      # 📚 Utility functions (if needed)
├── public/                   # 📁 Static assets
└── package.json              # 📦 Dependencies
```

---

## Configuration

### Environment Variables

The template uses sensible defaults, but you can customize by creating a `.env.local` file:

```bash
# Your Solana wallet address (where payments go)
NEXT_PUBLIC_WALLET_ADDRESS=your_solana_address_here

# Network (solana-devnet or solana-mainnet-beta)
NEXT_PUBLIC_NETWORK=solana-devnet

# Coinbase Pay Client Key (get from Coinbase Developer Portal)
NEXT_PUBLIC_CDP_CLIENT_KEY=your_client_key_here

# Facilitator URL (service that verifies payments)
NEXT_PUBLIC_FACILITATOR_URL=https://x402.org/facilitator
```

### Customizing Routes and Prices

Edit `middleware.ts` to add or modify protected routes:

```typescript
const x402PaymentMiddleware = paymentMiddleware(
  address,
  {
    '/premium': {
      price: '$1.00',
      config: {
        description: 'Premium content access',
      },
      network: 'solana-mainnet-beta',
    },
    '/api/data': {
      price: '$0.05',
      config: {
        description: 'API data access',
      },
      network: 'solana-mainnet-beta',
    },
  },
  // ... rest of config
)
```

### Network Selection

You can use different networks:

- `solana-devnet` - For testing (use test tokens)
- `solana-mainnet-beta` - For production (real money!)
- `solana-testnet` - Alternative test network

---

## Usage

### Creating Protected Content

Simply create pages under protected routes defined in your middleware:

```tsx
// app/content/premium/page.tsx
export default async function PremiumPage() {
  return (
    <div>
      <h1>Premium Content</h1>
      <p>This content requires payment to access.</p>
      {/* Your protected content here */}
    </div>
  )
}
```

### Adding New Price Tiers

1. Add the route configuration in `middleware.ts`
2. Create the corresponding page component
3. Users will automatically be prompted to pay when accessing the route

### Testing with Devnet

When using `solana-devnet`:

- Payments use test tokens (no real money)
- Perfect for development and testing
- Get test tokens from [Solana Faucet](https://faucet.solana.com/)

### Going to Production

To accept real payments:

1. Change network to `solana-mainnet-beta` in `middleware.ts`
2. Update your wallet address to your production wallet
3. Test thoroughly before deploying!
4. Consider implementing additional security measures

---

## Dependencies

This template uses minimal dependencies:

```json
{
  "dependencies": {
    "next": "16.0.0",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "viem": "^2.38.5",
    "x402-next": "^0.7.1"
  }
}
```

- **next** - Next.js framework
- **react** / **react-dom** - React library
- **viem** - Type-safe Ethereum/Solana types
- **x402-next** - X402 payment middleware (handles all payment logic)

---

## Learn More

### X402 Protocol

- [X402 Specification](https://github.com/coinbase/x402) - Official protocol documentation
- [X402 Next Package](https://www.npmjs.com/package/x402-next) - Middleware used in this template

### Solana

- [Solana Documentation](https://docs.solana.com/) - Official Solana docs
- [Solana Explorer](https://explorer.solana.com/) - View transactions on-chain

### Coinbase Developer

- [CDP Docs](https://docs.cdp.coinbase.com/) - Coinbase Developer documentation

---

## Troubleshooting

### Payment Not Working

1. Check that your wallet address in `middleware.ts` is correct
2. Verify you're using the correct network (devnet vs mainnet)
3. Check browser console for errors
4. Ensure Coinbase Pay client key is valid

### 402 Errors Not Displaying

1. Check middleware matcher configuration in `middleware.ts`
2. Verify route paths match your page structure
3. Clear Next.js cache: `rm -rf .next && pnpm dev`

### Session Not Persisting

1. Check that cookies are enabled in your browser
2. Verify session token endpoint is configured
3. Check for CORS issues if using custom domains

---

## Support

For issues specific to this template, please open an issue on the repository.

For X402 protocol questions, refer to the [official documentation](https://github.com/coinbase/x402).

---

## License

MIT License - Feel free to use this template for your projects.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ from [Kronos](https://www.kronos.build/)**
