# X402 Facilitator with Kora Integration

## Overview

This facilitator service bridges the X402 payment protocol with Kora's signing infrastructure, enabling gasless transactions on Solana for the hackathon demo.

## Features

- ✅ X402-compliant `/verify` and `/settle` endpoints
- ✅ Kora SDK integration for transaction signing
- ✅ Support for gasless transactions
- ✅ Returns supported payment kinds with fee payer info
- ✅ Non-production demo mode

## Architecture

```
X402 Client → Facilitator → Kora SDK → Solana Blockchain
```

## Environment Variables

Create `.env` file in the project root:

```bash
# Kora RPC Configuration
KORA_RPC_URL=http://localhost:8080
KORA_API_KEY=demo_api_key_non_production

# Facilitator Configuration
FACILITATOR_PORT=3000
NETWORK=solana-devnet
```

## Installation

```bash
pnpm install
```

## Running

```bash
# Development mode with auto-reload
pnpm dev

# Production mode
pnpm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### GET /supported

Returns supported payment kinds.

**Response:**
```json
{
  "kinds": [
    {
      "x402Version": 1,
      "scheme": "exact",
      "network": "solana-devnet",
      "extra": {
        "feePayer": "KoraFeePayerAddress..."
      }
    }
  ]
}
```

### POST /verify

Verifies a payment can be processed.

**Request:**
```json
{
  "paymentPayload": {
    "payload": {
      "transaction": "base64EncodedTransaction"
    }
  },
  "paymentRequirements": {
    "network": "solana-devnet",
    "recipient": "vendorAddress",
    "amount": "6667"
  }
}
```

**Response:**
```json
{
  "isValid": true
}
```

### POST /settle

Signs and sends a transaction via Kora.

**Request:**
```json
{
  "paymentPayload": {
    "payload": {
      "transaction": "base64EncodedTransaction"
    }
  },
  "paymentRequirements": {
    "network": "solana-devnet",
    "recipient": "vendorAddress",
    "amount": "6667"
  }
}
```

**Response:**
```json
{
  "transaction": "signatureHash...",
  "success": true,
  "network": "solana-devnet"
}
```

## Integration with Kora

The facilitator uses the Kora SDK to:

1. **Get Fee Payer**: Retrieve the Kora fee payer address
2. **Sign Transactions**: Sign transactions without requiring user's SOL
3. **Send Transactions**: Broadcast signed transactions to Solana

Example:
```typescript
import { KoraClient } from '@kora/sdk'

const kora = new KoraClient({ 
  rpcUrl: KORA_RPC_URL,
  apiKey: KORA_API_KEY 
})

// Get fee payer for gasless transactions
const { signer_address } = await kora.getPayerSigner()

// Sign and send transaction
const { signature } = await kora.signAndSendTransaction({
  transaction: base64Transaction
})
```

## Demo Mode

For the hackathon demo, this service operates in **non-production mode**:

- ⚠️ Uses mock/demo Kora instance
- ⚠️ No real blockchain transactions
- ⚠️ Simplified error handling
- ⚠️ No rate limiting or security measures

## Production Deployment

To deploy to production:

1. **Set up production Kora instance**:
   ```bash
   kora rpc --network mainnet-beta --port 8080
   ```

2. **Configure environment**:
   ```bash
   NETWORK=solana-mainnet-beta
   KORA_RPC_URL=https://your-kora-instance.com
   KORA_API_KEY=your_production_api_key
   ```

3. **Add security**:
   - Implement API authentication
   - Add rate limiting
   - Enable CORS for specific origins
   - Add request validation
   - Implement logging and monitoring

4. **Deploy**:
   ```bash
   # Build
   pnpm build
   
   # Run with PM2 or similar
   pm2 start facilitator.ts --name x402-facilitator
   ```

## Testing

### Manual Testing

```bash
# Get supported payment kinds
curl http://localhost:3000/supported

# Test verify endpoint
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "paymentPayload": { "payload": { "transaction": "test" } },
    "paymentRequirements": { 
      "network": "solana-devnet",
      "recipient": "test",
      "amount": "1000"
    }
  }'
```

### Integration Testing

Run the full demo:
```bash
# Terminal 1: Start facilitator
pnpm start

# Terminal 2: Start seller service
cd ../seller-service && pnpm start

# Terminal 3: Run buyer agent
cd ../agent-runner && pnpm start
```

## Troubleshooting

### Kora Connection Failed

**Problem**: Cannot connect to Kora RPC

**Solutions**:
1. Verify Kora is running: Check `KORA_RPC_URL`
2. Check API key: Verify `KORA_API_KEY` is correct
3. For demo mode: Can use mock responses

### Transaction Signing Failed

**Problem**: Transaction signature generation fails

**Solutions**:
1. Verify transaction format is valid base64
2. Check Kora server logs
3. Ensure network matches Kora configuration

### Port Already in Use

**Problem**: Port 3000 is already in use

**Solutions**:
1. Change `FACILITATOR_PORT` in `.env`
2. Kill process using port 3000: `lsof -ti:3000 | xargs kill`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT - See [LICENSE](../../LICENSE)
