# Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### Issue: `pnpm: command not found`

**Solution:**
```bash
npm install -g pnpm@10.18.0
```

#### Issue: `Unsupported engine: wanted node >= 24.9.0`

**Solution:**
This is a warning, not an error. The project works with Node 20+. To use Node 24:
```bash
# Using nvm
nvm install 24
nvm use 24

# Verify
node --version
```

#### Issue: `Cannot install with frozen-lockfile`

**Solution:**
```bash
pnpm install --no-frozen-lockfile
```

### Runtime Issues

#### Issue: Agent crashes with "ENOENT: no such file or directory, open './logs/agent-telemetry.jsonl'"

**Solution:**
This is fixed in the latest version. The logs directory is now created automatically. If you're on an older version:
```bash
cd apps/agent-runner
mkdir -p logs
pnpm start
```

#### Issue: Facilitator returns "Kora RPC connection failed"

**Solution:**
This is expected in demo mode! The facilitator automatically falls back to demo responses when Kora is unavailable.

**To verify:**
```bash
curl http://localhost:3000/health

# Should return:
# {
#   "status": "healthy",
#   "kora": {
#     "status": "unavailable"  // This is OK in demo mode
#   }
# }
```

**If you want to run with actual Kora:**
1. Install Kora CLI: `cargo install kora-cli`
2. Start Kora RPC: `kora rpc --port 8080`
3. Restart facilitator

#### Issue: "Port 3000 already in use"

**Solution:**

**Option 1: Kill the process**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill
```

**Option 2: Change port**
```bash
# Edit .env
FACILITATOR_PORT=3002

# Restart facilitator
cd apps/facilitator && pnpm start
```

#### Issue: "Port 3001 already in use"

**Solution:**
```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill

# Or change port
PORT=3002 pnpm start
```

### Electron Issues

#### Issue: Electron window doesn't open

**Solution:**
1. Check if port 5173 is available:
```bash
lsof -i:5173
```

2. Make sure you're in the electron directory:
```bash
cd electron
pnpm dev
```

3. Check for errors in terminal output

#### Issue: Electron shows blank window

**Solution:**
1. Open DevTools: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows/Linux)
2. Check Console for errors
3. Verify Vite dev server is running on port 5173
4. Try hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)

#### Issue: "Cannot find module" errors in Electron

**Solution:**
```bash
cd electron
pnpm install
pnpm build
pnpm dev
```

### CORS Issues

#### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solution:**
This is fixed in the latest version. The facilitator now includes CORS headers. If you're on an older version, update to the latest:

```bash
git pull
pnpm install --no-frozen-lockfile
```

Or manually add CORS to facilitator:
```typescript
// apps/facilitator/facilitator.ts
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
```

### Payment Issues

#### Issue: "Payment verification failed"

**Solution:**
In demo mode, this usually means:
1. Seller service is not running
2. Payment signature format is invalid
3. Payment already used (replay protection)

**Debug steps:**
```bash
# Check seller service
curl http://localhost:3001/health

# Check seller logs for payment validation errors
cd apps/seller-service
pnpm start  # Watch logs
```

#### Issue: "Budget exhausted"

**Solution:**
This is expected behavior! The agent has a budget cap of 1M lamports. After completing tasks, the budget is depleted.

**To reset:**
Restart the agent:
```bash
cd apps/agent-runner
pnpm start
```

The budget resets on each run.

### Telemetry Issues

#### Issue: "Cannot read telemetry log"

**Solution:**
1. Ensure agent has run at least once
2. Check log file exists:
```bash
ls -la apps/agent-runner/logs/agent-telemetry.jsonl
```

3. If file doesn't exist, run agent:
```bash
cd apps/agent-runner
pnpm start
```

#### Issue: Telemetry log is empty

**Solution:**
This means no events were emitted. Check:
1. Agent completed successfully
2. No errors during execution
3. Telemetry sinks initialized properly

**Debug:**
```bash
# Watch agent output for event emissions
cd apps/agent-runner
pnpm start | grep -E "\[GREEN\]|\[CYAN\]"
```

### Kora Integration Issues

#### Issue: "Invalid Kora API key"

**Solution:**
In demo mode, the API key can be anything. Check your `.env`:
```bash
KORA_API_KEY=demo_api_key_non_production
```

For production Kora, use a real API key from Kora operator.

#### Issue: "Transaction signing failed"

**Solution:**
1. Verify Kora RPC is running (if not using demo mode)
2. Check Kora RPC URL in `.env`:
```bash
KORA_RPC_URL=http://localhost:8080
```

3. Test Kora connection:
```bash
curl http://localhost:8080/health  # If Kora has health endpoint
```

4. In demo mode, this is handled automatically with fallback

### Build Issues

#### Issue: TypeScript errors during build

**Solution:**
```bash
# Clean and rebuild
pnpm clean  # If available
rm -rf node_modules
pnpm install --no-frozen-lockfile
```

#### Issue: Next.js build fails

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next
pnpm dev
```

#### Issue: Electron build fails

**Solution:**
```bash
cd electron
rm -rf app/dist
pnpm build:main
pnpm build:preload
pnpm build:renderer
```

## Network Issues

#### Issue: "connect ECONNREFUSED 127.0.0.1:3000"

**Solution:**
The facilitator is not running. Start it:
```bash
cd apps/facilitator
pnpm start
```

#### Issue: "connect ECONNREFUSED 127.0.0.1:3001"

**Solution:**
The seller service is not running. Start it:
```bash
cd apps/seller-service
pnpm start
```

## Environment Issues

#### Issue: Environment variables not loaded

**Solution:**
1. Ensure `.env` file exists in project root:
```bash
ls -la .env
```

2. If missing, copy from example:
```bash
cp .env.example .env
```

3. Edit `.env` with your configuration

4. Restart services

#### Issue: "Network not supported"

**Solution:**
Check `NETWORK` in `.env`:
```bash
# Must be one of:
NETWORK=solana-devnet
# NETWORK=solana-testnet
# NETWORK=solana-mainnet-beta
```

## Performance Issues

#### Issue: Agent execution is slow

**Solution:**
This is expected in demo mode as it simulates delays. To speed up:
1. Reduce delay between tasks
2. Use facilitator mode (slightly faster)
3. Adjust timeout values in policy

#### Issue: High memory usage

**Solution:**
1. Check for memory leaks in logs
2. Reduce telemetry verbosity
3. Limit number of concurrent tasks
4. Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`

## Getting Help

### Before opening an issue

1. Check this troubleshooting guide
2. Read [KORA_INTEGRATION.md](./KORA_INTEGRATION.md)
3. Check [IMPLEMENTATION_REVIEW.md](./IMPLEMENTATION_REVIEW.md)
4. Review relevant README files in each app directory

### When opening an issue

Include:
- Node version: `node --version`
- pnpm version: `pnpm --version`
- Operating system
- Complete error message
- Steps to reproduce
- What you've tried

### Quick Diagnostics

Run this to collect system info:
```bash
echo "Node: $(node --version)"
echo "pnpm: $(pnpm --version)"
echo "OS: $(uname -a)"
echo "Ports in use:"
lsof -i:3000,3001,5173,8080 2>/dev/null || echo "lsof not available"
```

## Demo Mode vs Production

### Demo Mode (Default)
- ✅ No blockchain transactions
- ✅ No Kora RPC required
- ✅ Simulated payments
- ✅ Fast and simple

**Use for:** Testing, development, hackathon demo

### Facilitator Mode
- ⚠️ Requires Kora RPC
- ⚠️ More complex setup
- ✅ Shows real integration pattern

**Use for:** Demonstrating Kora integration, preparing for production

### Production Mode
- ❌ Not implemented in demo
- ❌ Requires mainnet Kora
- ❌ Requires real API keys
- ❌ Requires security measures

**Use for:** Actual deployment (requires additional work)

See [KORA_INTEGRATION.md](./KORA_INTEGRATION.md) for migration guide.
