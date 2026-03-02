/**
 * Zen Swarm Agent Factory
 * 使用 LangGraph standard-agent 创建 agents
 */

import { createAgent } from 'langchain';
import { AgentPackage } from '@langgraph-js/standard-agent';
import { SwarmState } from '../state.js';
import { initChatModel } from '../utils/initChatModel.js';
import { humanInTheLoopMiddleware, anthropicPromptCachingMiddleware } from '@langgraph-js/standard-agent';
import { providerStorage } from '../config/loader.js';
import type { ProviderType } from '../services/provider/storage.js';

/**
 * 创建 Swarm Agent
 */
export async function createSwarmAgent(
    agentId: string,
    pkg: AgentPackage,
    state: typeof SwarmState.State,
    options?: { parent_id?: string },
): Promise<any> {
    const isSubAgent = !!options?.parent_id;

    // 1. 加载 Agent 配置
    const agentConfig = await pkg.getAgent(agentId);
    if (!agentConfig) {
        throw new Error(`Agent not found: ${agentId}`);
    }

    // 2. 加载 Model 配置
    // state.model_id 优先级高于 agentConfig 中配置的 modelId，允许调用方动态指定模型
    const effectiveModelId = state.model_id || agentConfig.modelId;
    if (!effectiveModelId) {
        throw new Error(
            `Agent "${agentId}" has no model configured and no model_id was provided in state. ` +
                `Please assign a default model to this agent in the settings.`,
        );
    }
    const modelConfig = await pkg.getModel(effectiveModelId);
    if (!modelConfig) {
        throw new Error(`Model not found: ${effectiveModelId}`);
    }

    // 3. 加载 Provider 配置（通过 provider_id 外键）
    const providerId = modelConfig.provider_id;
    if (!providerId) {
        throw new Error(
            `Model "${modelConfig.name || modelConfig.id}" has no provider assigned. ` +
                `Please assign a provider in the Model settings.`,
        );
    }

    const provider = await providerStorage.getById(providerId);
    if (!provider) {
        throw new Error(
            `Provider not found for model "${modelConfig.name || modelConfig.id}". ` +
                `Please configure the provider first.`,
        );
    }

    // 4. 获取解密后的 API Key
    const decryptedApiKey = await providerStorage.getDecryptedApiKey(providerId);
    if (!decryptedApiKey) {
        throw new Error(
            `Provider "${provider.name}" has no API Key configured. ` +
                `Please add your API Key in the Provider settings.`,
        );
    }

    // 5. 加载提示词（包含当前版本内容）
    const promptConfig = await pkg.getPromptWithContent(agentConfig.systemPromptId);
    if (!promptConfig) {
        throw new Error(`Prompt not found: ${agentConfig.name}`);
    }

    // 6. 初始化模型（使用关联的 Provider 配置）
    const model = await initChatModel(modelConfig.model_name, {
        modelProvider: provider.type as ProviderType,
        temperature: modelConfig.temperature,
        streamUsage: true,
        enableThinking: modelConfig.enable_thinking,
        apiKey: decryptedApiKey,
        baseURL: provider.baseUrl,
        metadata: {
            agent_id: agentId,
            model_id: modelConfig.id,
            provider_id: provider.id,
            parent_id: options?.parent_id,
        },
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
            async (input, runtime) => {
                // Pass state to tool execution
                const result = await toolImpl.execute(input, runtime);
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
    const middleware: any[] = [];

    // 1. 配置的中间件
    for (const [middlewareId, params] of Object.entries(agentConfig.middleware)) {
        if (middlewareId === 'subagents' && isSubAgent) continue;
        if (!params) continue;

        const impl = pkg.middlewares.getImplementation(middlewareId);
        if (!impl) continue;

        const context = typeof params === 'boolean' ? {} : params.customParams || {};
        middleware.push(await impl.execute(context));
    }

    // 2. Human-in-the-loop 中间件
    const interruptOn: any = {
        ask_user_questions: {
            allowedDecisions: ['respond', 'approve', 'reject', 'edit'],
        },
    };

    // 先不限制命令行使用
    // if (process.env.YOLO_MODE !== 'true') {
    //     Object.assign(interruptOn, {
    //         terminal: { allowedDecisions: ['approve', 'reject', 'edit'] },
    //     });
    // }

    middleware.push(
        humanInTheLoopMiddleware({
            /** @ts-ignore */
            interruptOn,
        }),
    );

    // 3. Anthropic prompt caching（仅 Anthropic）
    if (provider.type === 'anthropic') {
        middleware.push(anthropicPromptCachingMiddleware());
    }

    // 创建 agent
    return createAgent({
        name: isSubAgent ? `subagent_${options.parent_id}` : agentConfig.name,
        model,
        systemPrompt: promptConfig.content,
        tools,
        /** @ts-ignore */
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
