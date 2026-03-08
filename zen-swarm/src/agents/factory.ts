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

// ========================================
// 配置 TTL 缓存（减少每次请求的重复 DB 查询）
// agentConfig / modelConfig / providerConfig 缓存 30s
// promptConfig 不缓存（支持热更新 system prompt）
// ========================================

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

const CACHE_TTL_MS = 30_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agentCache = new Map<string, CacheEntry<any>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const modelCache = new Map<string, CacheEntry<any>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providerCache = new Map<string, CacheEntry<any>>();
const providerKeyCache = new Map<string, CacheEntry<string>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    if (entry && Date.now() < entry.expiresAt) return entry.data;
    cache.delete(key);
    return null;
}

function setCached<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

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

    // 1. 加载 Agent 配置（带缓存）
    let agentConfig = getCached(agentCache, agentId);
    if (!agentConfig) {
        agentConfig = await pkg.getAgent(agentId);
        if (!agentConfig) {
            throw new Error(`Agent not found: ${agentId}`);
        }
        setCached(agentCache, agentId, agentConfig);
    }

    // 2. 加载 Model 配置（带缓存）
    // state.model_id 优先级高于 agentConfig 中配置的 modelId，允许调用方动态指定模型
    const effectiveModelId = state.model_id || agentConfig.modelId;
    if (!effectiveModelId) {
        throw new Error(
            `Agent "${agentId}" has no model configured and no model_id was provided in state. ` +
                `Please assign a default model to this agent in the settings.`,
        );
    }
    let modelConfig = getCached(modelCache, effectiveModelId);
    if (!modelConfig) {
        modelConfig = await pkg.getModel(effectiveModelId);
        if (!modelConfig) {
            throw new Error(`Model not found: ${effectiveModelId}`);
        }
        setCached(modelCache, effectiveModelId, modelConfig);
    }

    // 3. 加载 Provider 配置（带缓存）
    const providerId = modelConfig.provider_id;
    if (!providerId) {
        throw new Error(
            `Model "${modelConfig.name || modelConfig.id}" has no provider assigned. ` +
                `Please assign a provider in the Model settings.`,
        );
    }

    let provider = getCached(providerCache, providerId);
    if (!provider) {
        provider = await providerStorage.getById(providerId);
        if (!provider) {
            throw new Error(
                `Provider not found for model "${modelConfig.name || modelConfig.id}". ` +
                    `Please configure the provider first.`,
            );
        }
        setCached(providerCache, providerId, provider);
    }

    // 4. 获取解密后的 API Key（带缓存）
    let decryptedApiKey = getCached(providerKeyCache, providerId);
    if (!decryptedApiKey) {
        decryptedApiKey = await providerStorage.getDecryptedApiKey(providerId);
        if (!decryptedApiKey) {
            throw new Error(
                `Provider "${provider.name}" has no API Key configured. ` +
                    `Please add your API Key in the Provider settings.`,
            );
        }
        setCached(providerKeyCache, providerId, decryptedApiKey);
    }

    // 5. 加载提示词（不缓存，支持热更新 system prompt）
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

    // 构建中间件列表 — tools 现在由各 middleware 自己注入
    const middleware: any[] = [];

    // 1. 配置的中间件
    for (const [middlewareId, params] of Object.entries(agentConfig.middlewares)) {
        if (middlewareId === 'subagents' && isSubAgent) continue;
        if (!params) continue;

        const impl = pkg.middlewares.getImplementation(middlewareId);
        if (!impl) continue;

        const context = typeof params === 'boolean' ? {} : (params as any).customParams || {};
        middleware.push(await impl.execute(context));
    }

    // 2. Human-in-the-loop 中间件
    // interruptOn 显式声明为 Record<string, boolean | { allowedDecisions: ... }>
    // 避免 TypeScript 将数组字面量推断为 string[]
    const interruptOn: Record<
        string,
        boolean | { allowedDecisions: Array<'respond' | 'approve' | 'reject' | 'edit'> }
    > = {
        ask_user_questions: {
            allowedDecisions: ['respond', 'approve', 'reject', 'edit'],
        },
    };

    middleware.push(
        humanInTheLoopMiddleware({
            interruptOn,
        }),
    );

    // 3. Anthropic prompt caching（仅 Anthropic）
    if (provider.type === 'anthropic') {
        middleware.push(anthropicPromptCachingMiddleware());
    }

    // 创建 agent
    // stateSchema 使用类型断言：SwarmState 是 @langchain/langgraph Annotation.Root，
    // 与 langchain createAgent 期望的 StateDefinitionInit 来自不同的类型命名空间
    return createAgent({
        name: isSubAgent ? `subagent_${options.parent_id}` : agentConfig.name,
        model,
        systemPrompt: promptConfig.content,
        stateSchema: SwarmState as unknown as Parameters<typeof createAgent>[0]['stateSchema'],
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
