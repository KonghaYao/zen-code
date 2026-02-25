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
import { cronRouter } from './cron.js';
import { filesRouter } from './files.js';
import { workspacesRouter } from './workspaces.js';
import { createSMRouter, SMRouter } from './sm.js';
import { monitorRouter } from './monitor.js';
import type { StateMachineManager } from '../middlewares/sm/StateMachineManager.js';
import type { SMDatabase } from '../middlewares/sm/database.js';

// ========================================
// 基础 Router（不含 SM）
// ========================================

export const appRouter = router({
    models: modelsRouter,
    prompts: promptsRouter,
    tools: toolsRouter,
    middlewares: middlewaresRouter,
    agents: agentsRouter,
    mcp: mcpRouter,
    skills: skillsRouter,
    cron: cronRouter,
    files: filesRouter,
    workspaces: workspacesRouter,
    monitor: monitorRouter,
});

// ========================================
// 合并 Router 工厂（包含 SM）
// ========================================

export function createMergedRouter(stateMachineManager?: StateMachineManager, smDatabase?: SMDatabase) {
    if (stateMachineManager && smDatabase) {
        const smRouter = createSMRouter(stateMachineManager, smDatabase);
        return router({
            models: modelsRouter,
            prompts: promptsRouter,
            tools: toolsRouter,
            middlewares: middlewaresRouter,
            agents: agentsRouter,
            mcp: mcpRouter,
            skills: skillsRouter,
            cron: cronRouter,
            files: filesRouter,
            workspaces: workspacesRouter,
            sm: smRouter,
            monitor: monitorRouter,
        });
    }
    return appRouter;
}

// 导出 API 路由映射供 Hono 使用
export const apiRoutes = {
    models: modelsRouter,
    prompts: promptsRouter,
    tools: toolsRouter,
    middlewares: middlewaresRouter,
    agents: agentsRouter,
    mcp: mcpRouter,
    skills: skillsRouter,
    cron: cronRouter,
    files: filesRouter,
    workspaces: workspacesRouter,
};

// 导出 SM Router 工厂（需要依赖注入）
export { createSMRouter };

// 导出基础类型
export type AppRouter = typeof appRouter;

// 导出完整类型（包含 SM Router）
export type FullAppRouter = ReturnType<typeof createMergedRouter>;
