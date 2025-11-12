# Kora Integration Guide

## Overview

This project integrates [Kora](https://github.com/solana-foundation/kora), Solana's signing infrastructure, with the X402 payment protocol to enable gasless transactions for the hackathon demo.

## Architecture

```
Agent Runner (Buyer)
       ↓
X402 Middleware (Payment Client)
       ↓
Facilitator Service (apps/facilitator/)
       ↓
Kora SDK (@kora/sdk)
       ↓
Kora RPC Server (Solana Transaction Signing)
       ↓
Solana Blockchain
```

## Components

### 1. Kora SDK (`packages/kora/sdks/ts/`)

The TypeScript SDK for interacting with the Kora signing service. Provides:
- `KoraClient` - Main client for RPC calls
- Transaction signing methods
- Fee estimation
- Supported tokens query

**Key Methods:**
- `signTransaction()` - Sign a transaction
- `signAndSendTransaction()` - Sign and broadcast to Solana
- `getPayerSigner()` - Get the fee payer address
- `getSupportedTokens()` - Query supported payment tokens

### 2. Facilitator Service (`apps/facilitator/`)

Express service that bridges X402 protocol with Kora:
- Implements X402 `/verify` and `/settle` endpoints
- Uses Kora SDK to sign transactions
- Returns X402-compliant responses

**Endpoints:**
- `GET /supported` - Returns supported payment kinds (includes Kora fee payer)
- `POST /verify` - Verifies payment can be processed
- `POST /settle` - Signs and sends transaction via Kora

### 3. X402 Middleware (`packages/x402-middleware/`)

Enhanced to support both demo mode and facilitator mode:
- **Demo Mode** (default): Simulated payments for testing
- **Facilitator Mode**: Uses real facilitator with Kora integration

**Configuration:**
```typescript
const client = new X402Client({
  network: 'solana-devnet',
  facilitatorUrl: 'http://localhost:3000',
  demoMode: true, // Set to false for facilitator mode
})
```

## Demo Setup

### Non-Production Configuration

This is a **non-production hackathon demo**. The setup uses:
- ✅ Local facilitator service
- ✅ Mock Kora RPC (or local Kora instance)
- ✅ Demo mode for simplified flow
- ❌ **NOT** real blockchain transactions
- ❌ **NOT** production-ready security

### Environment Variables

Create `.env` file (see `.env.example`):

```bash
# Solana Network
NETWORK=solana-devnet

# Facilitator Configuration
FACILITATOR_URL=http://localhost:3000
FACILITATOR_PORT=3000

# Kora RPC Configuration
KORA_RPC_URL=http://localhost:8080
KORA_API_KEY=demo_api_key_non_production

# Demo Mode
NEXT_PUBLIC_X402_DEMO_MODE=skip
```

### Running the Demo

**Terminal 1: Start Kora RPC (Optional)**
```bash
# If you have Kora installed locally:
cd packages/kora
kora rpc --port 8080

# Or use mock mode (facilitator handles this)
```

**Terminal 2: Start Facilitator**
```bash
cd apps/facilitator
pnpm install
pnpm start
# Runs on http://localhost:3000
```

**Terminal 3: Start Seller Service**
```bash
cd apps/seller-service
pnpm start
# Runs on http://localhost:3001
```

**Terminal 4: Run Buyer Agent**
```bash
cd apps/agent-runner
pnpm start
```

**Terminal 5: Start Electron App (Optional)**
```bash
cd electron
pnpm dev
```

## Integration Flow

### Payment Flow with Kora

1. **Agent** initiates payment via X402Client
2. **Middleware** calls facilitator `/settle` endpoint
3. **Facilitator** receives payment requirements
4. **Facilitator** calls Kora SDK `signAndSendTransaction()`
5. **Kora** signs transaction and broadcasts to Solana
6. **Facilitator** returns transaction signature to middleware
7. **Middleware** returns PaymentReceipt to agent
8. **Agent** uses receipt to access seller service

### Verification Flow

1. **Seller** receives payment signature
2. **Seller** (optional) calls facilitator `/verify`
3. **Facilitator** calls Kora SDK `signTransaction()` to validate
4. **Facilitator** returns verification status
5. **Seller** grants access if verified

## Key Features

### Gasless Transactions

Kora enables **gasless transactions** where:
- Users don't need SOL for gas fees
- They can pay fees in USDC, BONK, or custom tokens
- Kora fee payer covers the SOL transaction fee

### Demo Mode Benefits

For the hackathon demo, we use **demo mode** which:
- ✅ Doesn't require running Kora RPC server
- ✅ Doesn't make actual blockchain calls
- ✅ Simulates the full payment flow
- ✅ Demonstrates the integration pattern
- ✅ Allows testing without SOL/tokens

### Production Migration Path

To migrate to production:

1. **Deploy Kora RPC Server**
   ```bash
   kora rpc --network mainnet-beta --port 8080
   ```

2. **Configure Production Facilitator**
   ```bash
   NETWORK=solana-mainnet-beta
   KORA_RPC_URL=https://your-kora-instance.com
   KORA_API_KEY=your_production_key
   ```

3. **Disable Demo Mode**
   ```typescript
   const client = new X402Client({
     network: 'solana-mainnet-beta',
     facilitatorUrl: 'https://your-facilitator.com',
     demoMode: false, // Use real facilitator
   })
   ```

4. **Add Security**
   - API key authentication
   - HMAC signature verification
   - Rate limiting
   - Spending caps

## Code Examples

### Using Kora SDK Directly

```typescript
import { KoraClient } from '@kora/sdk'

const kora = new KoraClient({
  rpcUrl: 'http://localhost:8080',
  apiKey: 'your-api-key',
})

// Get fee payer address
const { signer_address } = await kora.getPayerSigner()

// Sign and send transaction
const { signature } = await kora.signAndSendTransaction({
  transaction: base64EncodedTransaction,
})
```

### Using X402Client with Facilitator

```typescript
import { X402Client } from '@x402-qagent/middleware'

// Demo mode (default)
const demoClient = new X402Client({
  network: 'solana-devnet',
  facilitatorUrl: 'http://localhost:3000',
  demoMode: true,
})

// Facilitator mode (with Kora)
const prodClient = new X402Client({
  network: 'solana-devnet',
  facilitatorUrl: 'http://localhost:3000',
  demoMode: false, // Uses real facilitator
})

// Make payment
const receipt = await prodClient.pay({
  vendor: sellerAddress,
  price: '$0.01',
  endpoint: '/api/transform',
})
```

## Troubleshooting

### Facilitator Connection Error

**Error:** `Facilitator error: Connection refused`

**Solution:**
1. Ensure facilitator is running: `cd apps/facilitator && pnpm start`
2. Check port 3000 is available
3. Verify `FACILITATOR_URL` in `.env`

### Kora RPC Not Found

**Error:** `Kora RPC connection failed`

**Solution:**
1. For demo mode: Ignore this (not needed)
2. For facilitator mode: Ensure Kora is running
3. Check `KORA_RPC_URL` in `.env`

### Transaction Signing Failed

**Error:** `Transaction signing failed`

**Solution:**
1. Verify Kora API key is correct
2. Check Kora server logs
3. Ensure transaction format is valid

## Security Considerations

### Non-Production Demo

⚠️ **This is a hackathon demo, NOT production-ready:**

- Simulated payments (demo mode)
- No real blockchain verification
- Mock API keys
- No rate limiting
- No spending caps enforcement

### Production Requirements

For production deployment:

1. ✅ Use real Kora RPC server
2. ✅ Implement proper API authentication
3. ✅ Add rate limiting and DDoS protection
4. ✅ Enable spending caps and monitoring
5. ✅ Verify transactions on-chain
6. ✅ Use secure key management (HSM, KMS)
7. ✅ Add transaction monitoring and alerts
8. ✅ Implement proper error handling and retries

## References

- [Kora Documentation](https://github.com/solana-foundation/kora/tree/main/docs)
- [X402 Protocol](https://github.com/coinbase/x402)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Project Architecture](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)

## Support

For issues or questions:
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Review Kora SDK documentation
- Open an issue on GitHub
