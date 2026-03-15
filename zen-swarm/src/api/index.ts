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
import { createProviderRouter } from './providers.js';
import { createStoreRouter } from './store.js';
import { createPostmanRouter } from './postman.js';
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
};

// ========================================
// 基础 Router
// ========================================

export const appRouter = router(baseRoutes);

// ========================================
// 合并 Router 工厂（包含 Provider）
// ========================================

export function createMergedRouter(
    providerStorage?: ProviderStorage,
    remoteStoreStorage?: RemoteStoreStorage,
    postmanStorage?: PostmanStorage,
) {
    const providerRouter = providerStorage ? createProviderRouter(providerStorage) : undefined;
    const storeRouter = remoteStoreStorage ? createStoreRouter(remoteStoreStorage) : undefined;
    const postmanRouter = postmanStorage ? createPostmanRouter(postmanStorage) : undefined;

    return router({
        ...baseRoutes,
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

// 导出基础类型
export type AppRouter = typeof appRouter;

// 导出完整类型（包含 Provider Router）
export type FullAppRouter = ReturnType<typeof createMergedRouter>;
