/**
 * SubAgents Package Utilities
 *
 * Utility functions for extracting agent information from AgentPackage.
 */

import { AgentPackage } from '../../package.js';
import type { SubAgentInfo } from './types.js';

/**
 * Extract agent list from AgentPackage for SubAgentsMiddleware
 *
 * @param pkg - AgentPackage instance
 * @returns Array of SubAgentInfo for use with SubAgentsMiddleware
 *
 * @example
 * ```typescript
 * import { getAgentListFromPackage, SubAgentsMiddleware } from '@langgraph-js/standard-agent';
 *
 * const agents = await getAgentListFromPackage(pkg);
 * const middleware = new SubAgentsMiddleware({
 *   agents,
 *   createAgent: async (taskId, args, state) => { ... }
 * });
 * ```
 */
export async function getAgentListFromPackage(pkg: AgentPackage): Promise<SubAgentInfo[]> {
    const agents = await pkg.listAgents();
    return agents.map((agent) => ({
        id: agent.id,
        name: agent.name || agent.id,
        description: agent.description || '',
    }));
}
