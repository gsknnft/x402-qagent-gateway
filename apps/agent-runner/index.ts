/**
 * Agent Runner - Autonomous buyer agent
 * 
 * This agent autonomously purchases services from sellers,
 * manages its budget, and emits telemetry.
 */

import { Address } from 'viem'
import { X402Client } from '../../packages/x402-middleware/src/client'
import { DefaultPolicyEngine } from '../../packages/x402-middleware/src/policy-engine'
import { PaymentPolicy } from '../../packages/x402-middleware/src/types'
import { DefaultBudgetManager } from '../../packages/agent-sdk/src/budget-manager'
import { DefaultAgentExecutor } from '../../packages/agent-sdk/src/executor'
import { TextTransformAdapter } from '../../packages/agent-sdk/src/adapters'
import { AgentAction, AgentState } from '../../packages/agent-sdk/src/types'
import { ConsoleSink } from '../../packages/telemetry-core/src/console-sink'
import { JSONLSink } from '../../packages/telemetry-core/src/jsonl-sink'
import { TelemetryEvent } from '../../packages/telemetry-core/src/types'

async function main() {
  console.log('🤖 Starting Autonomous Buyer Agent...\n')

  // Configuration
  const agentId = 'buyer-agent-001'
  const sellerAddress = (process.env.SELLER_ADDRESS || 'SellerWallet123abc') as Address
  const sellerEndpoint = process.env.SELLER_ENDPOINT || 'http://localhost:3001/api/transform'

  // Payment policy
  const policy: PaymentPolicy = {
    allowedVendors: [sellerAddress],
    budgetCap: 1000000, // 1M lamports (~$0.67 at $150/SOL)
    budgetWindow: 3600, // 1 hour
    rateLimits: {
      [sellerAddress.toLowerCase()]: 10, // Max 10 requests per window
    },
    provenance: {
      agentId,
      taskId: 'demo-task-001',
      commitHash: 'hackathon-v1',
    },
    haltConditions: {
      maxConsecutiveFailures: 3,
      settlementTimeoutMs: 30000,
    },
  }

  // Set up telemetry
  const consoleSink = new ConsoleSink(true)
  const jsonlSink = new JSONLSink('./logs/agent-telemetry.jsonl')
  
  const emitEvent = async (event: TelemetryEvent) => {
    await Promise.all([
      consoleSink.emit(event),
      jsonlSink.emit(event),
    ])
  }

  // Initialize components
  const client = new X402Client('solana-devnet', 'https://x402.org/facilitator')
  const policyEngine = new DefaultPolicyEngine(policy)
  const budgetManager = new DefaultBudgetManager(policy)
  const executor = new DefaultAgentExecutor(budgetManager, agentId, emitEvent)

  // Create service adapter
  const textTransform = new TextTransformAdapter(
    client,
    sellerAddress,
    sellerEndpoint,
    '$0.01'
  )

  console.log('✅ Agent initialized')
  console.log(`💰 Budget: ${policy.budgetCap} lamports`)
  console.log(`🎯 Allowed vendors: ${policy.allowedVendors.join(', ')}`)
  console.log(`📊 Telemetry: Console + JSONL (./logs/agent-telemetry.jsonl)\n`)

  // Define tasks
  const tasks: AgentAction<{ text: string; operation: string }, { result: string }>[] = [
    {
      type: 'text-transform',
      input: { text: 'Hello, X402 World!', operation: 'uppercase' },
      priority: 1,
      taskId: 'task-001',
    },
    {
      type: 'text-transform',
      input: { text: 'Autonomous Agents', operation: 'reverse' },
      priority: 2,
      taskId: 'task-002',
    },
    {
      type: 'text-transform',
      input: { text: 'SOLANA HACKATHON', operation: 'lowercase' },
      priority: 1,
      taskId: 'task-003',
    },
  ]

  console.log(`📋 Tasks queued: ${tasks.length}\n`)

  // Execute tasks
  let consecutiveFailures = 0
  
  for (const task of tasks) {
    try {
      console.log(`\n▶️  Executing task ${task.taskId}...`)
      
      const budgetState = await budgetManager.getState()
      console.log(`💵 Available budget: ${budgetState.available} lamports\n`)

      const result = await executor.execute(task, textTransform)

      console.log(`\n✅ Task ${task.taskId} completed!`)
      console.log(`   Result: "${result.data.result}"`)
      console.log(`   Cost: ${result.cost} lamports`)
      console.log(`   Duration: ${result.duration}ms`)
      
      consecutiveFailures = 0

      // Brief pause between tasks
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`\n❌ Task ${task.taskId} failed:`, error instanceof Error ? error.message : error)
      consecutiveFailures++

      if (consecutiveFailures >= policy.haltConditions.maxConsecutiveFailures) {
        console.error(`\n🛑 Agent halted: too many consecutive failures`)
        await emitEvent({
          type: 'agent.halted',
          timestamp: new Date().toISOString(),
          correlationId: 'halt-001',
          agentId,
          provenance: Object.fromEntries(
            Object.entries(policy.provenance).map(([k, v]) => [k, v ?? ''])
          ),
          payload: {
            reason: 'consecutive_failures',
            details: `${consecutiveFailures} consecutive failures`,
          },
        })
        break
      }
    }
  }

  // Final budget status
  const finalBudget = await budgetManager.getState()
  console.log(`\n📊 Final Budget Status:`)
  console.log(`   Total: ${finalBudget.total} lamports`)
  console.log(`   Spent: ${finalBudget.spent} lamports`)
  console.log(`   Remaining: ${finalBudget.available} lamports`)

  // Flush telemetry
  await jsonlSink.flush()
  await jsonlSink.close()

  console.log(`\n✨ Agent completed successfully!`)
}

main().catch(console.error)
