#!/bin/bash

# Environment Validator for X402 Quantum Agent Gateway
# Ensures the environment meets requirements for reproducible builds

set -e

echo "🔍 X402 Quantum Agent Gateway - Environment Validator"
echo "====================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FAILED=0

# Function to check command
check_command() {
  local cmd=$1
  local required_version=$2
  local name=$3

  if command -v $cmd &> /dev/null; then
    local version=$($cmd --version 2>&1 | head -n 1)
    echo -e "${GREEN}✅ $name found:${NC} $version"
    
    if [ -n "$required_version" ]; then
      if $cmd --version 2>&1 | grep -q "$required_version"; then
        echo -e "   ${GREEN}Version check passed${NC}"
      else
        echo -e "   ${YELLOW}⚠️  Recommended version: $required_version${NC}"
      fi
    fi
  else
    echo -e "${RED}❌ $name not found${NC}"
    FAILED=1
  fi
}

# Function to check Node.js version
check_node_version() {
  if command -v node &> /dev/null; then
    local version=$(node --version | sed 's/v//')
    local major=$(echo $version | cut -d. -f1)
    
    echo -e "${GREEN}✅ Node.js found:${NC} v$version"
    
    if [ "$major" -ge 20 ]; then
      echo -e "   ${GREEN}Version check passed (>= 20.0.0)${NC}"
    else
      echo -e "   ${RED}❌ Node.js 20+ required, found v$version${NC}"
      FAILED=1
    fi
  else
    echo -e "${RED}❌ Node.js not found${NC}"
    FAILED=1
  fi
}

# Function to check directory structure
check_directory() {
  local dir=$1
  local name=$2
  
  if [ -d "$dir" ]; then
    echo -e "${GREEN}✅ $name directory exists${NC}"
  else
    echo -e "${RED}❌ $name directory missing: $dir${NC}"
    FAILED=1
  fi
}

# Function to check file exists
check_file() {
  local file=$1
  local name=$2
  
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅ $name exists${NC}"
  else
    echo -e "${RED}❌ $name missing: $file${NC}"
    FAILED=1
  fi
}

echo -e "${BLUE}📋 Checking system requirements...${NC}"
echo ""

# Check Node.js
check_node_version
echo ""

# Check package managers
check_command pnpm "10.18.0" "pnpm"
check_command npm "" "npm"
echo ""

# Check optional tools
echo -e "${BLUE}📋 Checking optional tools...${NC}"
echo ""
check_command jq "" "jq (for telemetry analysis)"
check_command curl "" "curl"
echo ""

# Check project structure
echo -e "${BLUE}📋 Checking project structure...${NC}"
echo ""
check_directory "packages/x402-middleware" "x402-middleware package"
check_directory "packages/agent-sdk" "agent-sdk package"
check_directory "packages/telemetry-core" "telemetry-core package"
check_directory "apps/seller-service" "seller-service app"
check_directory "apps/agent-runner" "agent-runner app"
check_directory "examples/agent-to-agent-demo" "demo directory"
echo ""

# Check configuration files
echo -e "${BLUE}📋 Checking configuration files...${NC}"
echo ""
check_file "package.json" "Root package.json"
check_file "examples/agent-to-agent-demo/policies/buyer-greedy.json" "Buyer greedy policy"
check_file "examples/agent-to-agent-demo/policies/buyer-optimizer.json" "Buyer optimizer policy"
check_file "examples/agent-to-agent-demo/services/seller-primary.json" "Seller configuration"
echo ""

# Check documentation
echo -e "${BLUE}📋 Checking documentation...${NC}"
echo ""
check_file "README.md" "Main README"
check_file "ARCHITECTURE.md" "Architecture documentation"
check_file "SIGILNET_INTEGRATION.md" "Integration guide"
check_file "examples/agent-to-agent-demo/README.md" "Demo README"
echo ""

# Check dependencies
echo -e "${BLUE}📋 Checking dependencies...${NC}"
echo ""
if [ -f "package.json" ]; then
  if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules directory exists${NC}"
  else
    echo -e "${YELLOW}⚠️  node_modules not found. Run: pnpm install${NC}"
  fi
else
  echo -e "${RED}❌ package.json not found${NC}"
  FAILED=1
fi
echo ""

# Compatibility Matrix
echo -e "${BLUE}📊 Compatibility Matrix:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Component         | Required  | Recommended"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Node.js           | >= 20.0.0 | 24.9.0"
echo "pnpm              | >= 9.0.0  | 10.18.0"
echo "TypeScript        | >= 5.0.0  | 5.9.0"
echo "Solana CLI        | N/A       | Latest"
echo "Anchor CLI        | N/A       | 0.30+"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Network Configuration
echo -e "${BLUE}🌐 Network Configuration:${NC}"
echo "Default Network: solana-devnet"
echo "Facilitator: https://x402.org/facilitator"
echo "Demo Mode: Simulated payments (no real blockchain calls)"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ Environment validation PASSED${NC}"
  echo ""
  echo "You're ready to run the demo!"
  echo ""
  echo "Quick start:"
  echo "  cd examples/agent-to-agent-demo/scripts"
  echo "  ./run-demo.sh"
else
  echo -e "${RED}❌ Environment validation FAILED${NC}"
  echo ""
  echo "Please fix the issues above before running the demo."
  exit 1
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
