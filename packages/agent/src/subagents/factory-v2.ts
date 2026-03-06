/**
 * Standard Agent Factory V2
 *
 * Creates specialized agents using AgentPackage configuration system.
 * Supports dynamic middleware loading with full type safety.
 * Tools are now managed by individual middlewares.
 */

import { initChatModel } from '../utils/initChatModel.js';
import { AgentMiddleware, createAgent, ReactAgent, Runtime } from 'langchain';
import { CodeAnnotation, CodeStateType } from '../state.js';
import { anthropicPromptCachingMiddleware } from '@langgraph-js/standard-agent';
import { MCPWithConfigMiddleware } from '../middlewares/mcpWithConfig.js';
import { getEnvInfo } from '../prompts/coding.js';
import { AgentPackage } from '@langgraph-js/standard-agent';
import { humanInTheLoopMiddleware } from '@langgraph-js/standard-agent';

// ============================================
// Human-in-the-Loop Configuration
// ============================================

/**
 * Tool interrupt configuration
 * Controls which tools require human approval
 */
const INTERRUPT_ON_CONFIG = {
    ask_user_questions: {
        allowedDecisions: ['respond', 'approve', 'reject', 'edit'],
    },
};

// ============================================
// Agent Factory
// ============================================

/**
 * Create a standard agent from AgentPackage configuration (V2)
 *
 * @param agentId - Agent ID from package
 * @param pkg - AgentPackage containing configuration
 * @param state - Current code state
 * @param runtime - LangGraph runtime
 *
 */
export async function createStandardAgentV2(
    agentId: string,
    pkg: AgentPackage,
    state: CodeStateType,
    runtime: Runtime,
    options?: { parent_id?: string },
): Promise<ReactAgent> {
    const isSubAgent = !!options?.parent_id;
    // Load agent configuration
    const agentConfig = await pkg.getAgent(agentId);
    if (!agentConfig) {
        throw new Error(`Agent not found: ${agentId}`);
    }

    // Validate agent configuration
    const validation = await pkg.validateAgent(agentId);
    if (!validation.valid) {
        throw new Error(`Agent validation failed: ${JSON.stringify(validation.errors)}`);
    }

    // Initialize model
    const model = await initChatModel(state.model_id, {
        modelProvider: state.provider_type,
        streamUsage: true,
        enableThinking: state.enable_thinking,
        streaming: state.streaming ?? false,
        metadata: {
            // message 通过这个 id 判断是否为子调用
            parent_id: options?.parent_id,
        },
    });

    // Build middleware chain
    // Tools are now managed by individual middlewares
    const middleware: AgentMiddleware[] = [];
    for (const [middlewareId, params] of Object.entries(agentConfig.middlewares)) {
        // Skip subagents middleware for sub-agents (avoid infinite nesting)
        if (middlewareId === 'subagents' && isSubAgent) continue;

        if (!params || !params.enabled) {
            continue;
        }

        const middlewareImpl = pkg.middlewares.getImplementation(middlewareId);
        if (!middlewareImpl) {
            console.warn(`Middleware ${middlewareId} not found in registry`);
            continue;
        }

        middleware.push(await middlewareImpl.execute(params.customParams || {}));
    }

    // MCP middleware (always enabled for MCP tool discovery and execution)
    const mcpMiddleware = new MCPWithConfigMiddleware();
    middleware.push(mcpMiddleware);

    // Human-in-the-loop middleware
    const interruptOn = {
        ...INTERRUPT_ON_CONFIG,
    };

    if (process.env.YOLO_MODE !== 'true') {
        Object.assign(interruptOn, {
            terminal: { allowedDecisions: ['approve', 'reject', 'edit'] },
        });
    }

    middleware.push(
        humanInTheLoopMiddleware({
            // @ts-expect-error - interruptOn type is more restrictive than we need
            // This is a known limitation in the type definition
            interruptOn,
        }),
    );

    // Anthropic prompt caching (if using Anthropic)
    if (process.env.MODEL_PROVIDER === 'anthropic') {
        middleware.push(anthropicPromptCachingMiddleware());
    }

    // Load system prompt
    const promptConfig = await pkg.getPromptWithContent(agentConfig.systemPromptId);
    if (!promptConfig) {
        throw new Error(`Prompt not found: ${agentConfig.systemPromptId}`);
    }

    const systemPrompt = promptConfig.content + `\n\n${await getEnvInfo(state)}`;

    // Create agent - tools are now managed by middlewares
    return createAgent({
        name: isSubAgent ? `subagent_${options.parent_id}` : agentConfig.name,
        model,
        systemPrompt,
        stateSchema: CodeAnnotation,
        middleware,
    }) as any as ReactAgent;
}

/**
 * Get agent IDs from package
 */
export async function getAvailableAgentIds(pkg: AgentPackage): Promise<string[]> {
    const agents = await pkg.listAgents();
    return agents.map((agent) => agent.id);
}
