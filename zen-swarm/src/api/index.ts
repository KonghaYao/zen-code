/**
 * tRPC Router 主入口
 */

import { router } from './trpc.js';
import { modelsRouter } from './models.js';
import { promptsRouter } from './prompts.js';
import { toolsRouter } from './tools.js';
import { middlewaresRouter } from './middlewares.js';
import { agentsRouter } from './agents.js';
import { mcpRouter } from './mcp.js';
import { skillsRouter } from './skills.js';

// ========================================
// 主 Router
// ========================================

export const appRouter = router({
    models: modelsRouter,
    prompts: promptsRouter,
    tools: toolsRouter,
    middlewares: middlewaresRouter,
    agents: agentsRouter,
    mcp: mcpRouter,
    skills: skillsRouter,
});

// 导出 API 路由映射供 Hono 使用
export const apiRoutes = {
    models: modelsRouter,
    prompts: promptsRouter,
    tools: toolsRouter,
    middlewares: middlewaresRouter,
    agents: agentsRouter,
    mcp: mcpRouter,
    skills: skillsRouter,
};

// 导出类型供客户端使用
export type AppRouter = typeof appRouter;
