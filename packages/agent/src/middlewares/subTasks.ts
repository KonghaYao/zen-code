/**
 * SubAgents Middleware (Application Layer)
 *
 * This file now re-exports SubAgentsMiddleware from standard-agent
 * and provides application-specific configuration.
 */

import { SubAgentsMiddleware, getAgentListFromPackage, type SubAgentInfo } from '@langgraph-js/standard-agent';
import type { AgentPackage } from '@langgraph-js/standard-agent';
import { createStandardAgentV2 } from '../subagents/factory-v2';
import { CodeState } from '../state';

export { SubAgentsMiddleware, getAgentListFromPackage } from '@langgraph-js/standard-agent';
export type { SubAgentInfo } from '@langgraph-js/standard-agent';

/**
 * Create SubAgentsMiddleware configured for this application
 */
export async function createSubAgentsMiddleware(pkg: AgentPackage) {
    const agents = await getAgentListFromPackage(pkg);

    return new SubAgentsMiddleware({
        agents,
        stateSchema: CodeState,
        async createAgent(taskId, args, state) {
            return await createStandardAgentV2(args.subagent_id, pkg, state, {}, { parent_id: taskId });
        },
    });
}
