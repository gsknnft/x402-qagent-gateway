#!/bin/bash

# Demo Script - Multi-Agent Marketplace
# This script demonstrates autonomous agents transacting in a micro-economy

set -e

echo "🚀 X402 Quantum Agent Gateway - Multi-Agent Marketplace Demo"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo "❌ node is required but not installed. Aborting." >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm is required but not installed. Run: npm install -g pnpm" >&2; exit 1; }

echo -e "${BLUE}📦 Installing dependencies...${NC}"
pnpm install --silent 2>&1 | tail -n 5

echo ""
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Start seller service in background
echo -e "${BLUE}🏪 Starting Seller Service (http://localhost:3001)...${NC}"
cd apps/seller-service
SELLER_ADDRESS="SellerWallet123abc" pnpm start > /tmp/seller.log 2>&1 &
SELLER_PID=$!
cd ../..

# Wait for seller to be ready
sleep 3
echo -e "${GREEN}✅ Seller service running (PID: $SELLER_PID)${NC}"
echo ""

# Show seller info
echo -e "${YELLOW}📊 Seller Configuration:${NC}"
echo "   Vendor: SellerWallet123abc"
echo "   Service: Text transformation"
echo "   Price: \$0.01 per request"
echo "   Operations: uppercase, lowercase, reverse"
echo ""

# Run buyer agent
echo -e "${BLUE}🤖 Starting Buyer Agent...${NC}"
echo ""
cd apps/agent-runner
SELLER_ADDRESS="SellerWallet123abc" \
SELLER_ENDPOINT="http://localhost:3001/api/transform" \
pnpm start

cd ../..

# Cleanup
echo ""
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
kill $SELLER_PID 2>/dev/null || true
echo -e "${GREEN}✅ Demo completed${NC}"
echo ""

# Show telemetry summary
if [ -f "apps/agent-runner/logs/agent-telemetry.jsonl" ]; then
  echo -e "${BLUE}📊 Telemetry Summary:${NC}"
  echo ""
  echo "Event counts:"
  grep -o '"type":"[^"]*"' apps/agent-runner/logs/agent-telemetry.jsonl | sort | uniq -c
  echo ""
  echo "Full logs available at: apps/agent-runner/logs/agent-telemetry.jsonl"
fi

echo ""
echo -e "${GREEN}🎉 Demo completed successfully!${NC}"
echo ""
echo "Key takeaways:"
echo "  ✅ Agent autonomously managed budget"
echo "  ✅ Policy enforcement (vendor allowlist, rate limits)"
echo "  ✅ Payment-per-action with X402 protocol"
echo "  ✅ Full telemetry lineage with correlation IDs"
echo "  ✅ Verifiable receipts for all transactions"
