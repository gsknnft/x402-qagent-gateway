/**
 * Simple agent planner implementation
 */

import { AgentPlanner, AgentState, AgentAction } from './types'

/**
 * Greedy planner - selects highest priority action that fits budget
 */
export class GreedyPlanner implements AgentPlanner {
  async plan(state: AgentState): Promise<AgentAction[]> {
    // Simple planner - in production would use more sophisticated logic
    // For now, just returns empty array (actions provided externally)
    return []
  }

  async selectAction(candidates: AgentAction[], budget: number): Promise<AgentAction | null> {
    if (candidates.length === 0) {
      return null
    }

    // Filter to affordable actions
    const affordable = candidates.filter(a => (a.estimatedCost || 0) <= budget)
    
    if (affordable.length === 0) {
      return null
    }

    // Sort by priority (descending) then by cost (ascending for ties)
    const sorted = affordable.sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0)
      if (priorityDiff !== 0) return priorityDiff
      return (a.estimatedCost || 0) - (b.estimatedCost || 0)
    })

    return sorted[0]
  }
}

/**
 * Cost-optimizing planner - selects cheapest action first
 */
export class CostOptimizerPlanner implements AgentPlanner {
  async plan(state: AgentState): Promise<AgentAction[]> {
    return []
  }

  async selectAction(candidates: AgentAction[], budget: number): Promise<AgentAction | null> {
    if (candidates.length === 0) {
      return null
    }

    // Filter to affordable actions
    const affordable = candidates.filter(a => (a.estimatedCost || 0) <= budget)
    
    if (affordable.length === 0) {
      return null
    }

    // Sort by cost (ascending)
    const sorted = affordable.sort((a, b) => 
      (a.estimatedCost || 0) - (b.estimatedCost || 0)
    )

    return sorted[0]
  }
}
