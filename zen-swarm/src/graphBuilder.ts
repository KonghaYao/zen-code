/**
 * Zen Swarm Graph Builder
 * 使用统一的 unified-factory 创建 agents
 */

import { Runtime } from 'langchain';
import { SwarmState, SwarmStateType } from './state.js';
import { START, StateGraph } from '@langchain/langgraph';
import { agentPackage, providerStorage } from './config/loader.js';
import { createUnifiedAgent, type IProviderResolver, type ResolvedProvider } from '@codegraph/agent/src';
import { initChatModel } from './utils/initChatModel.js';

/**
 * DB-based Provider Resolver for zen-swarm
 */
class DbProviderResolver implements IProviderResolver {
    async resolve(providerId: string): Promise<ResolvedProvider | null> {
        const provider = await providerStorage.getById(providerId);
        if (!provider) return null;

        const apiKey = await providerStorage.getDecryptedApiKey(providerId);
        if (!apiKey) return null;

        return {
            id: provider.id,
            type: provider.type,
            name: provider.name,
            baseUrl: provider.baseUrl,
            apiKey,
        };
    }

    async resolveByModel(modelId: string): Promise<ResolvedProvider | null> {
        const modelConfig = await agentPackage.getModel(modelId);
        if (!modelConfig?.provider_id) return null;
        return this.resolve(modelConfig.provider_id);
    }
}

const providerResolver = new DbProviderResolver();

/**
 * Swarm 节点 - 执行 agent
 */
async function swarmNode(state: SwarmStateType, runtime: Runtime) {
    const { agent_id = 'agents/default' } = state;

    // 使用统一的 factory 创建 agent
    const agent = await createUnifiedAgent(agent_id, state, {
        pkg: agentPackage,
        providerResolver,
        initModel: initChatModel,
        stateSchema: SwarmState,
        yoloMode: process.env.YOLO_MODE === 'true',
    });

    // 执行 agent
    const response = await agent.invoke(state, {
        recursionLimit: 500,
        configurable: runtime.configurable,
    });

    return response;
}

/**
 * 创建 Zen Swarm Graph
 */
export function createSwarmGraph() {
    return new StateGraph(SwarmState).addNode('swarm', swarmNode).addEdge(START, 'swarm').compile();
}

// 导出单例
export const swarmGraph = createSwarmGraph();
