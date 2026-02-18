/**
 * SubAgents Middleware (Application Layer)
 *
 * This file now re-exports SubAgentsMiddleware from standard-agent
 * and provides application-specific configuration.
 */

import { SubAgentsMiddleware } from '@langgraph-js/standard-agent';
import type { AgentPackage } from '@langgraph-js/standard-agent';
import { createStandardAgentV2 } from '../subagents/factory-v2';
import { CodeAnnotation, CodeState } from '../state';

export { SubAgentsMiddleware } from '@langgraph-js/standard-agent';

/**
 * Create SubAgentsMiddleware configured for this application
 */
export function createSubAgentsMiddleware(pkg: AgentPackage) {
    return new SubAgentsMiddleware({
        package: pkg,
        stateSchema: CodeState,
        async createAgent(taskId, args, state) {
            return await createStandardAgentV2(args.subagent_id, pkg, state, {}, { parent_id: taskId });
        },
    });
}
