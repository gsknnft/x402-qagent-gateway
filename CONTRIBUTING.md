# Contributing to X402 Quantum Agent Gateway

Thank you for your interest in contributing to the X402 Quantum Agent Gateway! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Getting Help](#getting-help)

---

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

**In summary:**
- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive criticism
- Respect differing viewpoints
- Report unacceptable behavior

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** >= 20.0.0 (recommended: 24.9.0)
- **pnpm** >= 9.0.0 (recommended: 10.18.0)
- **Git** >= 2.0.0
- **TypeScript** knowledge
- **Solana** basics (helpful but not required)

### Quick Start

1. **Fork the repository**
   ```bash
   # Visit https://github.com/gsknnft/x402-qagent-gateway
   # Click "Fork" button
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/x402-qagent-gateway.git
   cd x402-qagent-gateway
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/gsknnft/x402-qagent-gateway.git
   ```

4. **Install dependencies**
   ```bash
   pnpm install
   ```

5. **Verify setup**
   ```bash
   pnpm lint
   pnpm build
   ```

---

## Development Setup

### Environment Configuration

1. **Copy environment template**
   ```bash
   cp .env.example .env.local
   ```

2. **Configure variables** (`.env.local`)
   ```bash
   # Solana network
   NEXT_PUBLIC_NETWORK=solana-devnet
   
   # X402 facilitator
   NEXT_PUBLIC_FACILITATOR_URL=https://x402.org/facilitator
   
   # Optional: SigilNet integration
   SIGILNET_GATEWAY_URL=
   SIGILNET_AUTH_TOKEN=
   ```

### Workspace Structure

This is a **pnpm monorepo** with multiple packages:

```
x402-qagent-gateway/
├── packages/
│   ├── x402-middleware/    # Payment middleware
│   ├── agent-sdk/          # Agent framework
│   └── telemetry-core/     # Event tracking
├── apps/
│   ├── agent-runner/       # Buyer agent demo
│   └── seller-service/     # Seller service demo
├── electron/               # Electron desktop app
├── app/                    # Next.js web app
├── examples/               # Demo examples
└── docs/                   # Additional docs
```

### Installing Dependencies

```bash
# Install all workspace dependencies
pnpm install

# Install in specific workspace
pnpm --filter @x402-qagent/middleware install

# Add a dependency to a workspace
pnpm --filter @x402-qagent/middleware add viem
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @x402-qagent/middleware build

# Build in watch mode
pnpm --filter @x402-qagent/middleware build --watch
```

### Running Demos

```bash
# Terminal 1: Start seller service
cd apps/seller-service
pnpm start

# Terminal 2: Run buyer agent
cd apps/agent-runner
pnpm start

# Web app (Next.js)
pnpm dev

# Electron app
cd electron
pnpm dev
```

---

## Project Structure

### Package Organization

Each package follows this structure:

```
packages/package-name/
├── src/
│   ├── index.ts           # Public exports
│   ├── types.ts           # Type definitions
│   └── [feature].ts       # Feature implementations
├── package.json
├── tsconfig.json
└── README.md             # Package-specific docs
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `packages/x402-middleware/` | X402 payment client, policy engine, decorators |
| `packages/agent-sdk/` | Budget manager, executor, adapters, planners |
| `packages/telemetry-core/` | Event sinks (console, JSONL, SigilNet) |
| `apps/agent-runner/` | Autonomous buyer agent demo |
| `apps/seller-service/` | Micro-service seller demo |
| `electron/` | Electron desktop application |
| `app/` | Next.js web application |
| `examples/` | Usage examples and demos |

---

## Development Workflow

### Branch Strategy

We use **GitHub Flow**:

1. `main` - production-ready code
2. Feature branches from `main`
3. Pull requests to merge back to `main`

### Creating a Feature Branch

```bash
# Update main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bugfix
git checkout -b fix/issue-description
```

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/fixes
- `chore/` - Maintenance tasks

**Examples:**
- `feature/multi-agent-coordination`
- `fix/budget-reservation-race-condition`
- `docs/update-api-reference`
- `refactor/simplify-policy-engine`

---

## Code Standards

### TypeScript Guidelines

**1. Strict Type Checking**
```typescript
// ✅ Good - explicit types
function calculateCost(amount: number, rate: number): number {
  return amount * rate
}

// ❌ Bad - implicit any
function calculateCost(amount, rate) {
  return amount * rate
}
```

**2. Interface vs Type**
```typescript
// ✅ Use interface for objects
interface PaymentRequest {
  vendor: Address
  amount: number
}

// ✅ Use type for unions/intersections
type Network = 'solana-devnet' | 'solana-mainnet-beta'
```

**3. Avoid `any`**
```typescript
// ❌ Bad
function process(data: any): any {
  return data.result
}

// ✅ Good
function process<T>(data: { result: T }): T {
  return data.result
}
```

**4. Use `unknown` for unknown types**
```typescript
// ✅ Good
function parse(json: string): unknown {
  return JSON.parse(json)
}

const data = parse('{"key": "value"}')
if (typeof data === 'object' && data !== null) {
  // Type guard before use
}
```

### Code Style

**Formatting:**
- **Indentation:** 2 spaces
- **Quotes:** Single quotes for strings
- **Semicolons:** Required
- **Line length:** 100 characters max
- **Trailing commas:** Yes

**Linting:**
```bash
# Run ESLint
pnpm lint

# Auto-fix issues
pnpm lint --fix
```

**Configuration:**
- ESLint: `eslint.config.mjs`
- TypeScript: `tsconfig.json`
- Prettier: `.prettierrc` (if added)

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `budgetManager` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Functions | camelCase | `calculateCost()` |
| Classes | PascalCase | `BudgetManager` |
| Interfaces | PascalCase | `PaymentRequest` |
| Types | PascalCase | `Network` |
| Enums | PascalCase | `EventType` |
| Files | kebab-case | `budget-manager.ts` |

### Comments and Documentation

**1. JSDoc for public APIs**
```typescript
/**
 * Executes a payment via X402 protocol
 * 
 * @param request - Payment request details
 * @returns Payment receipt with transaction signature
 * @throws {PaymentError} If payment fails or is rejected
 * 
 * @example
 * ```typescript
 * const receipt = await client.pay({
 *   vendor: 'VendorAddress',
 *   amount: 10000,
 *   endpoint: 'https://vendor.com/api'
 * })
 * ```
 */
async pay(request: PaymentRequest): Promise<PaymentReceipt> {
  // Implementation
}
```

**2. Inline comments for complex logic**
```typescript
// Calculate exponential backoff delay
// Formula: min(maxBackoff, initialBackoff * 2^attempt)
const delay = Math.min(
  this.config.maxBackoffMs,
  this.config.backoffMs * Math.pow(2, attempt)
)
```

**3. TODO comments**
```typescript
// TODO: Add retry logic for network failures
// TODO(username): Optimize budget calculation algorithm
// FIXME: Race condition in budget reservation
```

---

## Testing Guidelines

### Test Structure

We use **Jest** for testing:

```
package/
├── src/
│   └── budget-manager.ts
└── __tests__/
    └── budget-manager.test.ts
```

### Writing Tests

**1. Unit Tests**
```typescript
import { BudgetManager } from '../src/budget-manager'

describe('BudgetManager', () => {
  describe('reserve', () => {
    it('should reserve budget for action', async () => {
      const budget = new BudgetManager(100000)
      
      const reserved = await budget.reserve(10000, 'action-1')
      
      expect(reserved).toBe(true)
      expect(await budget.getReserved()).toBe(10000)
      expect(await budget.getAvailable()).toBe(90000)
    })
    
    it('should reject reservation exceeding budget', async () => {
      const budget = new BudgetManager(100000)
      
      const reserved = await budget.reserve(150000, 'action-1')
      
      expect(reserved).toBe(false)
    })
  })
})
```

**2. Integration Tests**
```typescript
describe('Agent Payment Flow', () => {
  it('should complete end-to-end payment and action', async () => {
    const client = new X402Client({ network: 'solana-devnet' })
    const budget = new BudgetManager(1000000)
    const executor = new DefaultAgentExecutor(budget, 'agent-test', emitTelemetry)
    
    const result = await executor.execute(action, adapter)
    
    expect(result.success).toBe(true)
    expect(result.receipt).toBeDefined()
    expect(result.cost).toBeGreaterThan(0)
  })
})
```

**3. Test Coverage**
```bash
# Run tests with coverage
pnpm test --coverage

# Coverage thresholds (in package.json):
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test budget-manager.test.ts

# Run in watch mode
pnpm test --watch

# Run with coverage
pnpm test --coverage
```

---

## Documentation

### Documentation Requirements

All contributions should include appropriate documentation:

1. **Code Comments**
   - JSDoc for public APIs
   - Inline comments for complex logic

2. **README Updates**
   - Update README.md if adding features
   - Include usage examples

3. **API Reference**
   - Update API_REFERENCE.md for new APIs
   - Include TypeScript types

4. **Changelog**
   - Add entry to CHANGELOG.md (if exists)
   - Follow [Keep a Changelog](https://keepachangelog.com/) format

### Documentation Style

**Markdown Guidelines:**
- Use ATX-style headers (`#`)
- Include table of contents for long docs
- Use code blocks with language hints
- Add examples for complex concepts

**Example:**
````markdown
## Feature Name

Brief description of the feature.

### Usage

```typescript
import { Feature } from '@x402-qagent/package'

const feature = new Feature()
await feature.doSomething()
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Feature name |
| `config` | `Config` | Configuration object |

### Returns

Returns a `Promise<Result>` with the operation result.
````

---

## Pull Request Process

### Before Submitting

**Checklist:**
- [ ] Code follows project style guidelines
- [ ] All tests pass (`pnpm test`)
- [ ] Linter passes (`pnpm lint`)
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] Branch is up to date with `main`

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting)
- `refactor` - Code refactoring
- `test` - Test additions/fixes
- `chore` - Maintenance tasks

**Examples:**
```
feat(middleware): add retry logic to X402Client

Add exponential backoff retry mechanism for failed payments.
Retry up to 3 times with configurable backoff delays.

Closes #123
```

```
fix(budget): prevent race condition in reservation

Use mutex lock to prevent concurrent reservations from
exceeding budget cap.

Fixes #456
```

### Creating a Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub**
   - Go to repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out PR template

3. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   How were these changes tested?
   
   ## Checklist
   - [ ] Tests pass
   - [ ] Linter passes
   - [ ] Documentation updated
   - [ ] No breaking changes (or documented)
   ```

### Review Process

1. **Automated Checks**
   - CI runs tests and linting
   - Coverage report generated
   - Build succeeds

2. **Code Review**
   - At least 1 approval required
   - Address reviewer feedback
   - Make requested changes

3. **Merge**
   - Squash and merge (default)
   - Maintainers merge after approval

---

## Release Process

(For maintainers)

### Versioning

We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Update version**
   ```bash
   pnpm version <major|minor|patch>
   ```

2. **Update CHANGELOG.md**
   ```markdown
   ## [1.2.0] - 2025-11-15
   
   ### Added
   - New feature X
   
   ### Changed
   - Updated feature Y
   
   ### Fixed
   - Bug fix Z
   ```

3. **Commit and tag**
   ```bash
   git commit -am "chore: release v1.2.0"
   git tag v1.2.0
   ```

4. **Push**
   ```bash
   git push origin main --tags
   ```

5. **Create GitHub Release**
   - Go to Releases on GitHub
   - Click "Create a new release"
   - Select tag, add release notes
   - Publish release

---

## Getting Help

### Resources

- **Documentation:** [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md)
- **API Reference:** [API_REFERENCE.md](API_REFERENCE.md)
- **Examples:** `examples/` directory
- **Issues:** [GitHub Issues](https://github.com/gsknnft/x402-qagent-gateway/issues)

### Communication Channels

- **GitHub Issues:** Bug reports, feature requests
- **GitHub Discussions:** Questions, ideas, general discussion
- **Discord:** (Link if available)
- **Email:** (Maintainer email if public)

### Asking Questions

**Good question:**
```markdown
## Issue: Budget reservation not releasing on error

**Environment:**
- Node.js: 20.10.0
- pnpm: 10.18.0
- Package version: 1.0.0

**Steps to Reproduce:**
1. Create BudgetManager with 100k budget
2. Reserve 50k for action
3. Action throws error
4. Check budget - still shows 50k reserved

**Expected:** Reservation should be released
**Actual:** Reservation persists

**Code:**
\`\`\`typescript
const budget = new BudgetManager(100000)
await budget.reserve(50000, 'action-1')
throw new Error('Action failed')
// Reservation not released
\`\`\`
```

---

## Recognition

Contributors will be recognized in:
- GitHub contributors list
- CONTRIBUTORS.md file
- Release notes (for significant contributions)

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](LICENSE)).

---

**Thank you for contributing to X402 Quantum Agent Gateway!** 🚀

Your contributions help build the future of autonomous agent economies.
