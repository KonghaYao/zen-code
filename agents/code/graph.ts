import { Runtime, HumanMessage, SystemMessage } from 'langchain';
import { CodeAnnotation as CodeState, CodeStateType } from './state.js';
import { getBufferMessage } from './utils/get_buffer_message.js';
import { REMOVE_ALL_MESSAGES, START, StateGraph } from '@langchain/langgraph';
import { AIMessage, RemoveMessage } from '@langchain/core/messages';
import { initChatModel } from './initChatModel.js';
import { analyzeAndSaveMemories } from './memories/analyze.js';
import { loadAgentsList, getDefaultAgentId, type AgentConfig } from './subagents/config.js';
import { createStandardAgent } from './subagents/factory.js';

let agentConfigs: Record<string, AgentConfig> | null = null;

const switchBranch = {
    smart_memory: async (state: CodeStateType) => {
        const model = await initChatModel(state.main_model, {
            modelProvider: process.env.MODEL_PROVIDER || 'openai',
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

async function invokeAgent(config: AgentConfig, state: CodeStateType, runtime: Runtime) {
    const agent = await createStandardAgent(config, state, runtime);
    /** @ts-ignore 这个类型是 langchain 的问题 */
    const response = await agent.invoke(state, { recursionLimit: 200 });
    return {
        switch_command: '',
        task_store: response.task_store,
        messages: response.messages,
    };
}

export const graph = new StateGraph(CodeState)
    .addNode('graph', async (state: CodeStateType, runtime: Runtime) => {
        const { switch_command: cmd } = state;

        if (cmd === 'smart_memory') return switchBranch.smart_memory(state);

        const configs = agentConfigs || (await loadAgentsList());
        agentConfigs ??= configs;

        const agentId = cmd || getDefaultAgentId();
        const config = configs[agentId];

        if (!config) {
            throw new Error(`Unknown agent: ${agentId}. Available: ${Object.keys(configs).join(', ')}`);
        }

        return invokeAgent(config, state, runtime);
    })
    .addEdge(START, 'graph')
    .compile();
