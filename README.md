# X402 Quantum Agent Gateway

![Node.js](https://img.shields.io/badge/node-20.x%2B-green) ![TypeScript](https://img.shields.io/badge/typescript-5.x-blue) ![Solana](https://img.shields.io/badge/solana-devnet%20%7C%20mainnet-purple) ![License](https://img.shields.io/badge/license-MIT-yellow)

**Autonomous AI agents that act as economic entities, transacting via X402 micropayments on Solana.**

This project showcases a complete agent economy framework where AI agents autonomously buy and sell services using the X402 payment protocol. Unlike simple payment-gated content, this demonstrates **agents with budgets, policies, and vendor selection strategies** - true economic autonomy.

> 🏆 **Solana X402 Hackathon Submission** - This project targets three tracks: Best Trustless Agent, Best x402 API Integration, and Best x402 Dev Tool. Built for devnet by default.

📚 **[API Reference](API_REFERENCE.md)** | **[Architecture](ARCHITECTURE.md)** | **[Contributing](CONTRIBUTING.md)** | **[Security](SECURITY.md)** | **[Future Enhancements](FUTURE_ENHANCEMENTS.md)** | **[X402 Ecosystem Contributions](X402_ECOSYSTEM_CONTRIBUTIONS.md)**

## 🎯 Differentiators

What makes this different from typical X402 demos:

✅ **Economic Autonomy** - Agents with budgets, policies, and vendor selection (not just paywalls)  
✅ **Verifiable Lineage** - Full telemetry streams with correlation IDs and signed events  
✅ **Multi-Agent Economy** - Agent-to-agent marketplace (seller agent + buyer agent)  
✅ **Composable Middleware** - Reusable SDK with decorators and policy hooks  
✅ **Integration Ready** - Documented hooks for SigilNet/QVera future integration

## Table of Contents

- [🎯 Differentiators](#-differentiators)
- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [🏗️ Architecture](#️-architecture)
- [📦 Packages](#-packages)
- [🖥️ Desktop App (Electron)](#️-desktop-app-electron)
- [🌐 Web Dashboard](#-web-dashboard)
- [🔧 Development](#-development)
- [📖 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

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

## ✨ Features

### Core Capabilities

- **🤖 Economic Autonomy** - Agents with budgets, policies, and vendor selection (not just paywalls)
- **🔍 Verifiable Lineage** - Full telemetry streams with correlation IDs and signed events
- **🏪 Multi-Agent Economy** - Agent-to-agent marketplace (seller agent + buyer agent)
- **🧩 Composable Middleware** - Reusable SDK with decorators and policy hooks
- **🔗 Integration Ready** - Documented hooks for SigilNet/QVera future integration

### Technical Features

#### Payment Middleware (`@x402-qagent/middleware`)
- **X402Client** - Payment execution with idempotency & retry logic
- **PolicyEngine** - Budget caps, rate limits, vendor allowlists
- **Payment Decorators** - `withPayment()` wrapper for any function
- **Receipt Verification** - On-chain payment validation
- **Provenance Tracking** - Complete payment audit trail

#### Agent SDK (`@x402-qagent/agent-sdk`)
- **BudgetManager** - Spending tracking with reservations
- **AgentExecutor** - Runs actions with payment & telemetry
- **ServiceAdapters** - Pluggable service implementations
- **AgentPlanners** - Action selection strategies (greedy, cost-optimizer)
- **State Management** - Budget tracking across actions

#### Telemetry Layer (`@x402-qagent/telemetry`)
- **Multiple Sinks** - Console (colorized), JSONL (audit trail), WebSocket streams
- **Event Schema** - PaymentInitiated, Settled, ActionCompleted, BudgetDelta
- **SigilNet Stub** - Integration hooks for future field closure layer
- **Correlation IDs** - Full lineage tracking across events

#### Desktop Application (Electron)
- **Agent Control Center** - Desktop app for managing autonomous agents
- **Real-time Monitoring** - Live agent status and telemetry visualization
- **Policy Editor** - Visual configuration without JSON editing
- **Multi-Agent Support** - Manage multiple agents simultaneously
- **Cross-platform** - Windows, macOS, Linux support

#### Web Dashboard (Next.js)
- **Telemetry Visualization** - Real-time event stream viewer
- **Payment History** - Complete transaction log with filtering
- **Budget Tracking** - Visual budget usage and forecasting
- **Service Catalog** - Browse available services and vendors

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0 (recommended: 24.9.0)
- **pnpm** >= 9.0.0 (recommended: 10.18.0)  
  Install with: `npm install -g pnpm`
- **Git** (for cloning)

### Installation

```bash
# Clone the repository
git clone https://github.com/gsknnft/x402-qagent-gateway.git
cd x402-qagent-gateway

# Install dependencies
pnpm install
```

### Running the Agent-to-Agent Demo

The quickest way to see the system in action:

```bash
# Terminal 1: Start the Seller Service
cd apps/seller-service
pnpm start
# Seller will listen on http://localhost:3001

# Terminal 2: Run the Buyer Agent
cd apps/agent-runner
pnpm start
# Watch the agent autonomously purchase services!
```

**What happens:**
1. Seller service starts, offering text transformation for $0.01/request
2. Buyer agent initializes with 1M lamports budget (~$0.67)
3. Agent autonomously executes tasks:
   - Checks budget availability
   - Pays seller via X402 protocol
   - Receives service results
   - Emits telemetry events
   - Updates budget state

### Running the Web Dashboard

```bash
# Start Next.js development server
pnpm dev

# Visit http://localhost:3000
# - View real-time telemetry
# - Monitor agent activity
# - Track payment history
```

### Running the Electron Desktop App

```bash
cd electron
pnpm dev

# Electron window opens with:
# - Agent control center
# - Real-time monitoring
# - Policy configuration
# - Multi-agent management
```

### View Telemetry

```bash
# View telemetry log (after running agent)
cat apps/agent-runner/logs/agent-telemetry.jsonl | jq

# Filter by event type
cat apps/agent-runner/logs/agent-telemetry.jsonl | jq 'select(.type == "payment.settled")'

# Trace specific correlation ID
cat apps/agent-runner/logs/agent-telemetry.jsonl | jq 'select(.correlationId == "abc-123")'
```

---

## 🖥️ Desktop App (Electron)

The X402 Quantum Agent Gateway includes a full-featured **Electron desktop application** for managing autonomous agents with a beautiful UI.

### Features

#### Agent Control Center
- **Multi-Agent Management** - Run and monitor multiple agents simultaneously
- **Real-Time Dashboard** - Live agent status, budget tracking, and task execution
- **Visual Policy Editor** - Configure agent policies without editing JSON files
- **Telemetry Viewer** - Stream and filter events in real-time

#### Technology Stack
- **Electron 39+** - Latest Electron with Node 24 runtime
- **React 19** - Modern React with concurrent features
- **TypeScript 5.9** - Full type safety
- **Vite** - Fast HMR and optimized builds
- **PNPM Workspaces** - Isolated package management

### Quick Start

```bash
cd electron
pnpm install   # Install dependencies (auto-builds on postinstall)
pnpm dev       # Start development mode with hot reload
```

**Development Mode:**
- Vite dev server runs on port 5173
- Electron window launches automatically
- Hot module replacement (HMR) for instant updates
- React DevTools available

### Building for Production

```bash
cd electron
pnpm build     # Build main, preload, and renderer
pnpm package   # Create distributable (dmg/exe/AppImage)
```

**Output:**
- **macOS:** `.dmg` installer (universal: arm64 + x64)
- **Windows:** `.exe` NSIS installer (x64 + ia32)
- **Linux:** `.AppImage` + `.deb` + `.rpm` packages

**Build artifacts:** `electron/release/build/`

### Architecture

```
electron/
├── src/
│   ├── main/        # Electron main process (Node.js)
│   ├── preload/     # Secure IPC bridge
│   └── renderer/    # React UI (Next.js integration ready)
├── configs/         # Vite build configurations
├── scripts/         # Build automation scripts
└── app/dist/        # Build output
```

**Key Features:**
- **Context Isolation** - Secure IPC via preload bridge
- **Incremental Builds** - Persistent Vite cache for faster rebuilds
- **Multi-Platform** - Cross-platform build support
- **Native Modules** - Automatic native module rebuild

### Electron + Next.js Integration

The Electron app can run the Next.js web dashboard embedded:

```bash
# Terminal 1: Start Next.js dev server
pnpm dev

# Terminal 2: Start Electron (pointing to Next.js)
cd electron
NEXT_URL=http://localhost:3000 pnpm dev
```

This gives you:
- Full Next.js features in Electron window
- Real-time telemetry from agents
- Payment history and analytics
- Service catalog browsing

### Deployment

```bash
# macOS code signing (requires Apple Developer cert)
pnpm package --mac --publish never

# Windows code signing (requires cert)
pnpm package --win --publish never

# Linux (no signing required)
pnpm package --linux --publish never
```

**Auto-update ready:** Configured for GitHub Releases distribution

For detailed build documentation, see [electron/BUILD.md](electron/BUILD.md)

---

## 📦 Packages

The project is organized as a **pnpm monorepo** with reusable packages:

### `@x402-qagent/middleware`

Payment middleware for X402 protocol integration.

**Install:**
```bash
pnpm add @x402-qagent/middleware
```

**Usage:**
```typescript
import { X402Client, PolicyEngine, withPayment } from '@x402-qagent/middleware'

// Create payment client
const client = new X402Client({
  network: 'solana-devnet',
  facilitatorUrl: 'https://x402.org/facilitator'
})

// Wrap function with automatic payment
const paidFetch = withPayment(fetch, {
  client,
  vendor: 'VendorAddress',
  price: '$0.01'
})

// Use it - payment happens automatically!
const data = await paidFetch('https://api.example.com/data')
```

**Exports:**
- `X402Client` - Payment client with retry logic
- `PolicyEngine` - Budget and rate limit enforcement
- `withPayment()` - Payment decorator
- `isValidAddress()`, `isValidSignature()` - Validation utilities
- TypeScript types for all interfaces

### `@x402-qagent/agent-sdk`

Framework for building autonomous economic agents.

**Install:**
```bash
pnpm add @x402-qagent/agent-sdk
```

**Usage:**
```typescript
import {
  BudgetManager,
  DefaultAgentExecutor,
  GreedyPlanner
} from '@x402-qagent/agent-sdk'

// Create budget manager
const budget = new BudgetManager(1000000)  // 1M lamports

// Create executor
const executor = new DefaultAgentExecutor(
  budget,
  'my-agent',
  emitTelemetry
)

// Execute action with automatic payment
const result = await executor.execute(action, serviceAdapter)
```

**Exports:**
- `BudgetManager` - Budget tracking with reservations
- `DefaultAgentExecutor` - Action executor with payment
- `GreedyPlanner`, `CostOptimizerPlanner` - Decision strategies
- `ServiceAdapter` - Interface for service implementations
- TypeScript types for all interfaces

### `@x402-qagent/telemetry`

Event tracking and lineage for agent operations.

**Install:**
```bash
pnpm add @x402-qagent/telemetry
```

**Usage:**
```typescript
import { ConsoleSink, JSONLSink } from '@x402-qagent/telemetry'

// Create telemetry sinks
const console = new ConsoleSink({ colorize: true })
const file = new JSONLSink({ filepath: './logs/agent.jsonl' })

// Emit events
await console.emit({
  type: 'payment.settled',
  timestamp: new Date().toISOString(),
  correlationId: 'abc-123',
  agentId: 'agent-001',
  provenance: {},
  payload: { receipt, verified: true }
})
```

**Exports:**
- `ConsoleSink` - Colorized console output
- `JSONLSink` - JSONL file writer for audit trail
- `SigilNetSink` - Integration stub for SigilNet
- Event type definitions
- TypeScript types for all interfaces

### Package Development

```bash
# Work on specific package
cd packages/x402-middleware

# Run tests
pnpm test

# Build package
pnpm build

# Link for local development
pnpm link

# In another project
pnpm link @x402-qagent/middleware
```

For complete API documentation, see **[API_REFERENCE.md](API_REFERENCE.md)**

---

## 🌐 Web Dashboard

Next.js web application for visualizing agent activity and telemetry.

### Features

- **Real-Time Telemetry Stream** - WebSocket-powered event viewer
- **Payment History** - Filterable transaction log with correlation tracing
- **Budget Analytics** - Visual charts for budget usage and forecasting
- **Service Catalog** - Browse available services and vendors
- **Agent Status** - Monitor agent health and performance

### Running

```bash
pnpm dev
# Visit http://localhost:3000
```

### API Endpoints

The Next.js app provides REST APIs for telemetry access:

**GET** `/api/telemetry/log` - Fetch telemetry events
```bash
curl http://localhost:3000/api/telemetry/log?type=payment.settled
```

**GET** `/api/telemetry/summary` - Get event summary statistics
```bash
curl http://localhost:3000/api/telemetry/summary
```

**GET** `/api/telemetry/stream` - WebSocket stream of real-time events
```javascript
const ws = new WebSocket('ws://localhost:3000/api/telemetry/stream')
ws.onmessage = (event) => console.log(JSON.parse(event.data))
```

**POST** `/api/telemetry/clear` - Clear telemetry log
```bash
curl -X POST http://localhost:3000/api/telemetry/clear
```

### Building for Production

```bash
pnpm build
pnpm start  # Production server
```

---

## 🔧 Development

### Workspace Commands

```bash
# Install all dependencies
pnpm install

# Run linter
pnpm lint

# Build all packages
pnpm build

# Clean telemetry logs
pnpm clean:telemetry
```

### Working on Packages

```bash
# Build specific package
pnpm --filter @x402-qagent/middleware build

# Test specific package
pnpm --filter @x402-qagent/middleware test

# Add dependency to package
pnpm --filter @x402-qagent/middleware add viem
```

### Environment Variables

Create `.env.local` for local development:

```bash
# Solana network
NEXT_PUBLIC_NETWORK=solana-devnet

# X402 facilitator
NEXT_PUBLIC_FACILITATOR_URL=https://x402.org/facilitator

# SigilNet integration (optional)
SIGILNET_GATEWAY_URL=
SIGILNET_AUTH_TOKEN=

# QVera integration (optional)
QVERA_PROTOCOL_URL=
```

### Code Quality

```bash
# Run ESLint
pnpm lint

# Auto-fix issues
pnpm lint --fix

# Type checking
pnpm tsc --noEmit
```

---

## 📖 Documentation

### Core Documentation
- **[API Reference](API_REFERENCE.md)** - Complete API documentation for all packages
- **[Architecture](ARCHITECTURE.md)** - System design and component details
- **[Demo Storyboard](DEMO_STORYBOARD.md)** - 90-second demo walkthrough for judges
- **[Submission](SUBMISSION.md)** - Hackathon submission details
- **[SigilNet Integration](SIGILNET_INTEGRATION.md)** - Integration guide for SigilNet/QVera
- **[Future Enhancements](FUTURE_ENHANCEMENTS.md)** - Roadmap and optimization strategies
- **[Security](SECURITY.md)** - Security best practices and vulnerability reporting
- **[Contributing](CONTRIBUTING.md)** - Development guidelines and PR process
- **[Electron Build Guide](electron/BUILD.md)** - Detailed Electron build documentation

### X402 Ecosystem Contributions
- **[Ecosystem Roadmap](X402_ECOSYSTEM_CONTRIBUTIONS.md)** - Strategic contributions to X402 protocol ecosystem

### Tutorials
- **[Getting Started](docs/tutorials/GETTING_STARTED.md)** - Build your first X402 agent in 15 minutes
- **[Custom Adapters](docs/tutorials/CUSTOM_ADAPTERS.md)** - Integrate any X402-enabled service

### Advanced Patterns
- **[Reputation System](docs/reputation/ARCHITECTURE.md)** - Trust-based vendor selection
- **[Privacy Patterns](docs/privacy/PATTERNS.md)** - Privacy-preserving agent design
- **[Fraud Detection](docs/fraud-detection/PATTERNS.md)** - Protect agents from malicious vendors

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code standards
- Testing guidelines
- Pull request process

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Run linter (`pnpm lint`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **X402 Protocol** - [Coinbase X402 Specification](https://github.com/coinbase/x402)
- **Solana** - [Solana Documentation](https://docs.solana.com/)
- **SigilNet** - Categorical trust semantics and field closure
- **QVera** - Protocol infrastructure and indexing substrate

---

## 🚀 What's Next?

See [FUTURE_ENHANCEMENTS.md](FUTURE_ENHANCEMENTS.md) for our roadmap including:

**Short-term (0-3 months):**
- Real X402 facilitator integration
- Enhanced agent strategies
- Comprehensive test suite
- Desktop app enhancements

**Medium-term (3-12 months):**
- Agent marketplace
- Multi-agent coordination
- Advanced analytics
- SigilNet integration
- Cross-chain support

**Long-term (1-2 years):**
- AI-powered optimization
- Enterprise features
- Regulatory compliance
- Global agent economy at scale

---

**Built with ❤️ for the Solana X402 Hackathon**

🌟 Star us on GitHub | 🐛 Report Issues | 💡 Request Features | 📖 Read the Docs
