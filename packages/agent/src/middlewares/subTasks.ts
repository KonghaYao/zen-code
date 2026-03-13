/**
 * SubAgents Middleware (Application Layer)
 *
 * This file now re-exports SubAgentsMiddleware from standard-agent
 * and provides application-specific configuration.
 */

import { SubAgentsMiddleware, getAgentListFromPackage, type SubAgentInfo } from '@langgraph-js/standard-agent';
import type { AgentPackage } from '@langgraph-js/standard-agent';
import { createUnifiedAgent } from '../subagents/unified-factory';
import { CodeState } from '../state';
import { initChatModel } from '../utils/initChatModel.js';
import { getEnvInfo } from '../prompts/coding.js';

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
            return await createUnifiedAgent(
                args.subagent_id,
                state,
                {
                    pkg,
                    stateSchema: CodeState,
                    initModel: initChatModel,
                    enhanceSystemPrompt: async (basePrompt, state) => basePrompt + `\n\n${await getEnvInfo(state)}`,
                    yoloMode: process.env.YOLO_MODE !== 'true',
                },
                { parent_id: taskId },
            );
        },
    });
}
