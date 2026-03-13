/**
 * Unified Agent Factory
 *
 * Creates agents using AgentPackage configuration system.
 * Supports both zen-code (TUI) and zen-swarm (Web) scenarios.
 *
 * Key differences from old implementations:
 * 1. Parameterized agentPackage (dependency injection)
 * 2. Provider resolution via IProviderResolver interface
 * 3. Unified caching strategy
 */

import { createAgent, AgentMiddleware } from 'langchain';
import { AgentPackage } from '@langgraph-js/standard-agent';
import { humanInTheLoopMiddleware, anthropicPromptCachingMiddleware } from '@langgraph-js/standard-agent';
import type { StateSchema } from '@langchain/langgraph';
import { CodeState } from '../state.js';
import { initChatModel } from '../utils/initChatModel.js';
import { getEnvInfo } from '../prompts/coding.js';
import type { ReactAgent } from 'langchain';

// ========================================
// Provider Resolver Interface
// ========================================

/**
 * Resolved Provider configuration
 */
export interface ResolvedProvider {
    id: string;
    type: string;
    name?: string;
    baseUrl?: string;
    apiKey: string;
}

/**
 * Provider resolver interface
 * Implementations:
 * - zen-code: EnvProviderResolver (from process.env)
 * - zen-swarm: DbProviderResolver (from ProviderStorage)
 */
export interface IProviderResolver {
    resolve(providerId: string): Promise<ResolvedProvider | null>;
    resolveByModel(modelId: string): Promise<ResolvedProvider | null>;
}

// ========================================
// Model Configuration
// ========================================

export interface ModelConfig {
    id: string;
    model_name: string;
    provider_id?: string;
    temperature?: number;
    enable_thinking?: boolean;
    stream_usage?: boolean;
    max_tokens?: number;
}

export interface IModelResolver {
    resolve(modelId: string): Promise<ModelConfig | null>;
}

// ========================================
// Cache Layer
// ========================================

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

const CACHE_TTL_MS = 30_000; // 30 seconds

class UnifiedCache {
    private agentCache = new Map<string, CacheEntry<any>>();
    private modelCache = new Map<string, CacheEntry<any>>();
    private providerCache = new Map<string, CacheEntry<any>>();
    private providerKeyCache = new Map<string, CacheEntry<string>>();

    get<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
        const entry = cache.get(key);
        if (entry && Date.now() < entry.expiresAt) return entry.data;
        cache.delete(key);
        return null;
    }

    set<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
        cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    // Agent cache
    getAgent = (key: string) => this.get(this.agentCache, key);
    setAgent = (key: string, data: any) => this.set(this.agentCache, key, data);

    // Model cache
    getModel = (key: string) => this.get(this.modelCache, key);
    setModel = (key: string, data: any) => this.set(this.modelCache, key, data);

    // Provider cache
    getProvider = (key: string) => this.get(this.providerCache, key);
    setProvider = (key: string, data: any) => this.set(this.providerCache, key, data);

    // Provider key cache
    getProviderKey = (key: string) => this.get(this.providerKeyCache, key);
    setProviderKey = (key: string, data: string) => this.set(this.providerKeyCache, key, data);

    /**
     * Clear all caches (useful for testing)
     */
    clear() {
        this.agentCache.clear();
        this.modelCache.clear();
        this.providerCache.clear();
        this.providerKeyCache.clear();
    }
}

const cache = new UnifiedCache();

// ========================================
// Unified Factory Options
// ========================================

export interface CreateUnifiedAgentOptions {
    /** AgentPackage instance (required) */
    pkg: AgentPackage;

    /** Provider resolver (required for zen-swarm, optional for zen-code) */
    providerResolver?: IProviderResolver;

    /** Model resolver (optional, uses pkg.getModel by default) */
    modelResolver?: IModelResolver;

    /** Model initializer function */
    initModel: (modelName: string, config: any) => Promise<any>;

    /** State schema for the agent */
    stateSchema: StateSchema<any>;

    /** System prompt enhancer (optional) */
    enhanceSystemPrompt?: (basePrompt: string, state: any) => Promise<string>;

    /** Additional middleware to add (optional) */
    additionalMiddleware?: AgentMiddleware[];

    /** Middleware IDs to exclude (optional) */
    excludeMiddleware?: string[];

    /** Whether to enable HITL for terminal */
    yoloMode?: boolean;
}

// ========================================
// Unified Agent Factory
// ========================================

/**
 * Create a unified agent
 *
 * @param agentId - Agent ID from package
 * @param state - Agent state (contains model_id, provider_id, etc.)
 * @param options - Configuration options
 * @param parentOptions - Parent agent options (for sub-agents)
 */
export async function createUnifiedAgent(
    agentId: string,
    state: any,
    options: CreateUnifiedAgentOptions,
    parentOptions?: { parent_id?: string },
): Promise<ReactAgent> {
    const {
        pkg,
        providerResolver,
        modelResolver,
        initModel,
        stateSchema,
        enhanceSystemPrompt,
        excludeMiddleware = [],
        yoloMode,
    } = options;

    const isSubAgent = !!parentOptions?.parent_id;

    // ========================================
    // 1. Load Agent Configuration (with cache)
    // ========================================
    let agentConfig = cache.getAgent(agentId);
    if (!agentConfig) {
        agentConfig = await pkg.getAgent(agentId);
        if (!agentConfig) {
            throw new Error(`Agent not found: ${agentId}`);
        }
        cache.setAgent(agentId, agentConfig);
    }

    // Validate agent configuration
    const validation = await pkg.validateAgent(agentId);
    if (!validation.valid) {
        throw new Error(`Agent validation failed: ${JSON.stringify(validation.errors)}`);
    }

    // ========================================
    // 2. Resolve Model Configuration
    // ========================================
    const effectiveModelId = state.model_id || agentConfig.modelId;
    if (!effectiveModelId) {
        throw new Error(
            `Agent "${agentId}" has no model configured and no model_id was provided in state. ` +
                `Please assign a default model to this agent in the settings.`,
        );
    }

    let modelConfig: ModelConfig | null = null;
    if (modelResolver) {
        modelConfig = await modelResolver.resolve(effectiveModelId);
    } else {
        // Use pkg.getModel by default
        const config = await pkg.getModel(effectiveModelId);
        if (config) {
            modelConfig = {
                id: config.id,
                model_name: config.model_name,
                provider_id: config.provider_id,
                temperature: config.temperature,
                enable_thinking: config.enable_thinking,
                stream_usage: config.stream_usage,
                max_tokens: config.max_tokens,
            };
        }
    }

    if (!modelConfig) {
        // Fallback: use model_id as model_name
        modelConfig = {
            id: effectiveModelId,
            model_name: effectiveModelId,
        };
    }

    // ========================================
    // 3. Resolve Provider Configuration
    // ========================================
    let resolvedProvider: ResolvedProvider | null = null;

    // Priority: state.provider_id > modelConfig.provider_id > providerResolver.resolveByModel
    if (state.provider_id && providerResolver) {
        resolvedProvider = await providerResolver.resolve(state.provider_id);
    } else if (modelConfig.provider_id && providerResolver) {
        resolvedProvider = await providerResolver.resolve(modelConfig.provider_id);
    } else if (providerResolver) {
        resolvedProvider = await providerResolver.resolveByModel(effectiveModelId);
    }

    // ========================================
    // 4. Initialize Model
    // ========================================
    const modelConfigArgs: any = {
        streamUsage: modelConfig.stream_usage ?? true,
        enableThinking: modelConfig.enable_thinking ?? state.enable_thinking ?? true,
        streaming: state.streaming ?? false,
        metadata: {
            agent_id: agentId,
            model_id: modelConfig.id,
            provider_id: resolvedProvider?.id || state.provider_id,
            parent_id: parentOptions?.parent_id,
        },
    };

    // Add provider-specific config if resolved
    if (resolvedProvider) {
        modelConfigArgs.modelProvider = resolvedProvider.type;
        modelConfigArgs.apiKey = resolvedProvider.apiKey;
        modelConfigArgs.baseURL = resolvedProvider.baseUrl;
        modelConfigArgs.temperature = modelConfig.temperature ?? state.temperature ?? 0.7;
    } else {
        // Fallback: use state values (zen-code style)
        modelConfigArgs.modelProvider = state.provider_type || 'openai';
        modelConfigArgs.temperature = state.temperature ?? modelConfig.temperature ?? 0.7;
    }

    const model = await initModel(modelConfig.model_name, modelConfigArgs);

    // ========================================
    // 5. Load System Prompt
    // ========================================
    const promptConfig = await pkg.getPromptWithContent(agentConfig.systemPromptId);
    if (!promptConfig) {
        throw new Error(`Prompt not found: ${agentConfig.systemPromptId}`);
    }

    let systemPrompt = promptConfig.content;
    if (enhanceSystemPrompt) {
        systemPrompt = await enhanceSystemPrompt(systemPrompt, state);
    }

    // ========================================
    // 6. Build Middleware Chain
    // ========================================
    const middleware: AgentMiddleware[] = [];

    // Load configured middlewares from agentConfig
    for (const [middlewareId, params] of Object.entries(agentConfig.middlewares)) {
        // Skip subagents middleware for sub-agents (avoid infinite nesting)
        if (middlewareId === 'subagents' && isSubAgent) continue;

        // Skip excluded middlewares
        if (excludeMiddleware.includes(middlewareId)) continue;

        // Check if enabled
        // params can be: boolean | { enabled: boolean, customParams?: any }
        if (!params) {
            continue;
        }
        if (typeof params === 'object' && 'enabled' in params && !(params as any).enabled) {
            continue;
        }

        const middlewareImpl = pkg.middlewares.getImplementation(middlewareId);
        if (!middlewareImpl) {
            console.warn(`Middleware ${middlewareId} not found in registry`);
            continue;
        }

        // Extract customParams from object, or use empty object for boolean params
        const context = typeof params === 'boolean' ? {} : (params as any).customParams || {};
        middleware.push(await middlewareImpl.execute(context));
    }

    // ========================================
    // 7. Human-in-the-Loop Middleware
    // ========================================
    const interruptOn: Record<string, any> = {
        ask_user_questions: {
            allowedDecisions: ['respond', 'approve', 'reject', 'edit'],
        },
    };

    if (yoloMode) {
        interruptOn.terminal = { allowedDecisions: ['approve', 'reject', 'edit'] };
    }

    middleware.push(
        humanInTheLoopMiddleware({
            interruptOn,
        }),
    );

    // ========================================
    // 8. Anthropic Prompt Caching (if applicable)
    // ========================================
    const providerType = resolvedProvider?.type || state.provider_type;
    if (providerType === 'anthropic' || process.env.MODEL_PROVIDER === 'anthropic') {
        middleware.push(anthropicPromptCachingMiddleware());
    }

    // ========================================
    // 9. Create Agent
    // ========================================
    return createAgent({
        name: isSubAgent ? `subagent_${parentOptions.parent_id}` : agentConfig.name,
        model,
        systemPrompt,
        stateSchema: stateSchema as any,
        middleware,
    });
}

/**
 * Get available agent IDs from package
 */
export async function getAvailableAgentIds(pkg: AgentPackage): Promise<string[]> {
    const agents = await pkg.listAgents();
    return agents.map((agent) => agent.id);
}

/**
 * Clear cache (useful for testing)
 */
export function clearCache() {
    cache.clear();
}
