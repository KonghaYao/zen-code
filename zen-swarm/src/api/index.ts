/**
 * tRPC Router 主入口
 */

import { router } from './trpc.js';
import { modelsRouter } from './models.js';
import { promptsRouter } from './prompts.js';
import { middlewaresRouter } from './middlewares.js';
import { agentsRouter } from './agents.js';
import { mcpRouter } from './mcp.js';
import { skillsRouter } from './skills.js';
import { cronRouter } from './cron.js';
import { filesRouter } from './files.js';
import { workspacesRouter } from './workspaces.js';
import { createSMRouter, SMRouter } from './sm.js';
import { monitorRouter } from './monitor.js';
import { createProviderRouter } from './providers.js';
import { createStoreRouter } from './store.js';
import { createPostmanRouter } from './postman.js';
import type { StateMachineManager } from '../middlewares/sm/StateMachineManager.js';
import type { SMDatabase } from '../middlewares/sm/database.js';
import type { ProviderStorage } from '../services/provider/index.js';
import type { RemoteStoreStorage } from '../services/remote-store/index.js';
import type { PostmanStorage } from '../postman/storage.js';

// ========================================
// 基础路由定义（单一来源）
// ========================================

const baseRoutes = {
    models: modelsRouter,
    prompts: promptsRouter,
    middlewares: middlewaresRouter,
    agents: agentsRouter,
    mcp: mcpRouter,
    skills: skillsRouter,
    cron: cronRouter,
    files: filesRouter,
    workspaces: workspacesRouter,
    monitor: monitorRouter,
};

// ========================================
// 基础 Router（不含 SM）
// ========================================

export const appRouter = router(baseRoutes);

// ========================================
// 合并 Router 工厂（包含 SM 和 Provider）
// ========================================

export function createMergedRouter(
    stateMachineManager?: StateMachineManager,
    smDatabase?: SMDatabase,
    providerStorage?: ProviderStorage,
    remoteStoreStorage?: RemoteStoreStorage,
    postmanStorage?: PostmanStorage,
) {
    const smRouter = stateMachineManager && smDatabase ? createSMRouter(stateMachineManager, smDatabase) : undefined;
    const providerRouter = providerStorage ? createProviderRouter(providerStorage) : undefined;
    const storeRouter = remoteStoreStorage ? createStoreRouter(remoteStoreStorage) : undefined;
    const postmanRouter = postmanStorage ? createPostmanRouter(postmanStorage) : undefined;

    return router({
        ...baseRoutes,
        ...(smRouter ? { sm: smRouter } : {}),
        ...(providerRouter ? { providers: providerRouter } : {}),
        ...(storeRouter ? { store: storeRouter } : {}),
        ...(postmanRouter ? { postman: postmanRouter } : {}),
    });
}

// 导出 API 路由映射供 Hono 使用
export const apiRoutes = {
    models: modelsRouter,
    prompts: promptsRouter,
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
