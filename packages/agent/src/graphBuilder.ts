/**
 * Graph Builder V2
 * 使用 unified-agent factory 构建动态代理图
 */

import { Runtime } from 'langchain';
import { CodeAnnotation as CodeState, CodeStateType } from './state.js';
import { START, StateGraph } from '@langchain/langgraph';
import { createUnifiedAgent, getAvailableAgentIds, type IProviderResolver } from './subagents/unified-factory.js';
import { AgentPackage } from '@langgraph-js/standard-agent';
import { getThreadId } from '@langgraph-js/pro';
import { agentPackage } from './config/index.js';
import { initChatModel } from './utils/initChatModel.js';
import { getEnvInfo } from './prompts/coding.js';
import { downloadRipGrep } from './utils/ripgrep.js';

/**
 * Options for createCodeGraph
 */
export interface CodeGraphOptions {
    /** Provider resolver for DB-based provider resolution (zen-core) */
    providerResolver?: IProviderResolver;
}

async function invokeAgent(
    agentId: string,
    pkg: AgentPackage,
    state: CodeStateType,
    runtime: Runtime,
    options?: CodeGraphOptions,
) {
    const agent = await createUnifiedAgent(agentId, state, {
        pkg,
        providerResolver: options?.providerResolver,
        initModel: initChatModel,
        stateSchema: CodeState,
        enhanceSystemPrompt: async (basePrompt, state) => {
            return basePrompt + '\n\n' + (await getEnvInfo(state));
        },
    });

    state.thread_id = getThreadId(runtime);
    // This is a known type mismatch in the library, the runtime works correctly at runtime
    const response = await agent.invoke(state, {
        recursionLimit: 500,
        configurable: runtime.configurable,
        context: runtime.context as any,
    });
    return {
        switch_command: '',
        // @ts-ignore
        task_store: response.task_store,
        messages: response.messages,
    };
}
await downloadRipGrep();

/**
 * 创建 Code Graph V2
 * 使用 AgentPackage 系统动态加载和路由代理
 */
export function createCodeGraph(externalPkg?: AgentPackage, options?: CodeGraphOptions) {
    return new StateGraph(CodeState)
        .addNode('graph', async (state: CodeStateType, runtime: Runtime) => {
            const { switch_command: cmd } = state;

            // Load agent package (external injection takes priority over internal singleton)
            const pkg = externalPkg ?? agentPackage;

            // Determine agent ID: switch_command (runtime override) > agent_id (initial config) > default
            const availableAgents = await getAvailableAgentIds(pkg);

            const agentId = (cmd && cmd !== 'default' ? cmd : null) ?? state.agent_id ?? 'agents/default';

            if (!availableAgents.includes(agentId)) {
                throw new Error(`Unknown agent: ${agentId}. Available: ${availableAgents.join(', ')}`);
            }
            const result = await invokeAgent(agentId, pkg, state, runtime, options);
            return result;
        })
        .addEdge(START, 'graph')
        .compile();
}
