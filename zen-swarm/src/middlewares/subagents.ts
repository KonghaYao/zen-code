/**
 * SubAgents Middleware (Zen Swarm)
 *
 * Factory function to create SubAgentsMiddleware configured for zen-swarm.
 * Provides task delegation to specialized subagents.
 *
 * ## Usage
 *
 * ```typescript
 * import { createSubAgentsMiddleware } from './middlewares/subagents.js';
 * import { agentPackage } from '../config/loader.js';
 *
 * const subagents = await createSubAgentsMiddleware(agentPackage);
 *
 * const agent = createAgent({
 *   model,
 *   systemPrompt,
 *   tools,
 *   middleware: [subagents]
 * });
 * ```
 */

import { SubAgentsMiddleware } from '@langgraph-js/standard-agent';
import type { AgentPackage } from '@langgraph-js/standard-agent';
import { SwarmState, SwarmStateSchema } from '../state.js';

// Re-export the base class for type reference
export { SubAgentsMiddleware } from '@langgraph-js/standard-agent';

/**
 * Factory function to create SubAgentsMiddleware configured for zen-swarm
 */
export async function createSubAgentsMiddleware(pkg: AgentPackage) {
    // Get agent list from package
    const agents = await pkg.listAgents();
    const agentList = agents.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
    }));

    return new SubAgentsMiddleware({
        agents: agentList,
        stateSchema: SwarmStateSchema,
        async createAgent(taskId, args, state) {
            // Import dynamically to avoid circular dependency
            const { createSwarmAgent } = await import('../agents/factory.js');
            return createSwarmAgent(args.subagent_id, pkg, state, { parent_id: taskId });
        },
    });
}
