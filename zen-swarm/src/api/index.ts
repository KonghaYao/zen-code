/**
 * tRPC Router 主入口
 */

import { router } from './trpc.js';
import { modelsRouter } from './models.js';
import { promptsRouter } from './prompts.js';
import { toolsRouter } from './tools.js';
import { middlewaresRouter } from './middlewares.js';
import { agentsRouter } from './agents.js';

// ========================================
// 主 Router
// ========================================

export const appRouter = router({
    models: modelsRouter,
    prompts: promptsRouter,
    tools: toolsRouter,
    middlewares: middlewaresRouter,
    agents: agentsRouter,
});

// 导出类型供客户端使用
export type AppRouter = typeof appRouter;
