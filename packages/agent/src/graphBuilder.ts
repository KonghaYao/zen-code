/**
 * Graph Builder V2
 * 使用 standard-agent 的 AgentPackage 系统构建动态代理图
 */

import { Runtime } from 'langchain';
import { CodeAnnotation as CodeState, CodeStateType } from './state.js';
import { getBufferMessage } from './utils/getBufferMessage.js';
import { REMOVE_ALL_MESSAGES, START, StateGraph } from '@langchain/langgraph';
import { AIMessage, RemoveMessage } from '@langchain/core/messages';
import { initChatModel } from './utils/initChatModel.js';
import { analyzeAndSaveMemories } from './memories/analyze.js';
import { loadDefaultConfigs } from './subagents/loader.js';
import { createStandardAgentV2, getAvailableAgentIds } from './subagents/factory-v2.js';
import { AgentPackage } from '@langgraph-js/standard-agent';
import { getThreadId } from '@langgraph-js/pro';

const switchBranch = {
    smart_memory: async (state: CodeStateType) => {
        const model = await initChatModel(state.model_id, {
            modelProvider: state.provider_type,
            streamUsage: true,
            enableThinking: state.enable_thinking ?? true,
        });
        const summaryContent = await analyzeAndSaveMemories(model, getBufferMessage(state.messages));
        return {
            switch_command: '',
            messages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES }), new AIMessage(summaryContent)],
        };
    },
} as const;

async function invokeAgent(agentId: string, pkg: AgentPackage, state: CodeStateType, runtime: Runtime) {
    const agent = await createStandardAgentV2(agentId, pkg, state, runtime);

    state.thread_id = getThreadId(runtime);
    /** @ts-ignore 这个类型是 langchain 的问题 */
    const response = await agent.invoke(state, {
        recursionLimit: 500,
        configurable: runtime.configurable,
        context: runtime.context,
    });
    return {
        switch_command: '',
        task_store: response.task_store,
        messages: response.messages,
    };
}

/**
 * 创建 Code Graph V2
 * 使用 AgentPackage 系统动态加载和路由代理
 */
export function createCodeGraph() {
    return new StateGraph(CodeState)
        .addNode('graph', async (state: CodeStateType, runtime: Runtime) => {
            const { switch_command: cmd } = state;

            if (cmd === 'smart_memory') return switchBranch.smart_memory(state);

            // Load agent package (cached after first load)
            const pkg = await loadDefaultConfigs();

            // Determine agent ID (from command or default)
            const availableAgents = await getAvailableAgentIds(pkg);
            const agentId = cmd ? `agents/${cmd}` : 'agents/default';

            if (!availableAgents.includes(agentId)) {
                throw new Error(
                    `Unknown agent: ${cmd || 'default'}. Available: ${availableAgents
                        .map((id) => id.split('/').pop())
                        .join(', ')}`,
                );
            }
            const result = await invokeAgent(agentId, pkg, state, runtime);
            return result;
        })
        .addEdge(START, 'graph')
        .compile();
}

// 导出单例实例
export const graph = createCodeGraph();
