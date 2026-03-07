/**
 * @codegraph/agent
 * Agent 核心包 - 提供 Agent 能力的统一封装
 */

// 核心

// Graph
export { createCodeGraph, graph } from './graphBuilder.js';

// Utils
export { initChatModel } from './utils/initChatModel.js';
export { getBufferMessage } from './utils/getBufferMessage.js';

// Middlewares - 导出迁移的中间件
export * from './middlewares/index.js';

// Unified Factory (for zen-code and zen-swarm)
export {
    createUnifiedAgent,
    getAvailableAgentIds as getUnifiedAgentIds,
    clearCache,
    type IProviderResolver,
    type ResolvedProvider,
    type ModelConfig,
    type IModelResolver,
    type CreateUnifiedAgentOptions,
} from './subagents/unified-factory.js';

// Subagents - V1 API (legacy, kept for compatibility)
export * from './subagents/config.js';

// Standard Agent System - re-export from @langgraph-js/standard-agent
export { AgentPackage, MiddlewareRegistry } from '@langgraph-js/standard-agent';
