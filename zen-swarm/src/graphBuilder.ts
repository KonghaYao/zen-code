/**
 * Zen Swarm Graph Builder
 * 使用 LangGraph StateGraph 构建协作图
 */

import { Runtime } from 'langchain';
import { SwarmState, SwarmStateType } from './state.js';
import { START, StateGraph } from '@langchain/langgraph';
import { agentPackage } from './config/loader.js';
import { createSwarmAgent, getAvailableAgentIds } from './agents/factory.js';

/**
 * Swarm 节点 - 执行 agent
 */
async function swarmNode(state: SwarmStateType, runtime: Runtime) {
    const { agent_id = 'agents/default' } = state;

    // 获取可用的 agents
    const availableAgents = await getAvailableAgentIds(agentPackage);

    if (!availableAgents.includes(agent_id)) {
        throw new Error(`Unknown agent: ${agent_id}. Available: ${availableAgents.join(', ')}`);
    }

    // 创建 agent
    const agent = await createSwarmAgent(agent_id, agentPackage, state);

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
