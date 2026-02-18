/**
 * Zen Swarm Agent Factory
 * 使用 LangGraph standard-agent 创建 agents
 */

import { createAgent } from 'langchain';
import { AgentPackage } from '@langgraph-js/standard-agent';
import { SwarmState } from '../state.js';
import { initChatModel } from '../utils/initChatModel.js';

/**
 * 创建 Swarm Agent
 */
export async function createSwarmAgent(agentId: string, pkg: AgentPackage, state: typeof SwarmState.State) {
    // 加载 agent 配置
    const agentConfig = await pkg.getAgent(agentId);
    if (!agentConfig) {
        throw new Error(`Agent not found: ${agentId}`);
    }

    // 加载提示词
    const promptConfig = await pkg.getPrompt(agentConfig.systemPromptId);
    if (!promptConfig) {
        throw new Error(`Prompt not found: ${agentConfig.name}`);
    }

    const modelConfig = await pkg.getModel(agentConfig.modelId);
    if (!modelConfig) {
        throw new Error('');
    }
    // 初始化模型
    const model = await initChatModel(modelConfig.model_name, {
        modelProvider: modelConfig.model_provider,
        temperature: modelConfig.temperature,
        streamUsage: true,
        enableThinking: modelConfig.enable_thinking,
    });

    // 构建工具列表
    const tools = [];
    for (const [toolId, params] of Object.entries(agentConfig.tools)) {
        if (!params) continue;

        const toolImpl = pkg.tools.getImplementation(toolId);
        if (!toolImpl) continue;

        // 将 ToolImplementation 包装为 LangChain tool
        const { tool } = await import('langchain');

        const langChainTool = tool(
            async (input) => {
                const result = await toolImpl.execute(input);
                if (result && typeof result === 'object' && 'content' in result) {
                    return result.content;
                }
                return result;
            },
            {
                name: toolImpl.name,
                description: toolImpl.description,
                schema: toolImpl.paramsSchema,
            },
        );

        tools.push(langChainTool);
    }

    // 构建中间件列表
    const middleware = [];
    for (const [middlewareId, params] of Object.entries(agentConfig.middleware)) {
        if (!params) continue;

        const impl = pkg.middlewares.getImplementation(middlewareId);
        if (!impl) continue;

        const context = typeof params === 'boolean' ? {} : params.customParams || {};
        middleware.push(await impl.execute(context));
    }

    // 创建 agent
    return createAgent({
        name: agentConfig.name,
        model,
        systemPrompt: promptConfig.content,
        tools,
        stateSchema: SwarmState,
        middleware,
    });
}

/**
 * 获取可用的 agent IDs
 */
export async function getAvailableAgentIds(pkg: AgentPackage): Promise<string[]> {
    const agents = await pkg.listAgents();
    return agents.map((a) => a.id);
}
