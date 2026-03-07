/**
 * Hono tRPC 适配器
 * 将 tRPC router 集成到 Hono 应用中
 */

import { Hono } from 'hono';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { AppRouter } from './index.js';
import { createContext } from './trpc.js';
import { AgentPackage } from '@langgraph-js/standard-agent';
import type { CronStorage } from '../cron/storage.js';
import type { CronScheduler } from '../cron/scheduler.js';
import type { StateMachineManager } from '../middlewares/sm/StateMachineManager.js';
import type { SMDatabase } from '../middlewares/sm/database.js';
import type { ProviderStorage } from '../services/provider/index.js';
import type { RemoteStoreStorage } from '../services/remote-store/index.js';
import { appRouter, createMergedRouter } from './index.js';

// ========================================
// 创建 Hono tRPC 路由
// ========================================

export function createTRPCHonoRoute(
    agentPackage: AgentPackage,
    cronStorage: CronStorage,
    cronScheduler: CronScheduler,
    stateMachineManager?: StateMachineManager,
    smDatabase?: SMDatabase,
    providerStorage?: ProviderStorage,
    remoteStoreStorage?: RemoteStoreStorage,
) {
    const app = new Hono();

    // 创建包含 SM Router 和 Provider Router 的合并路由
    const router = createMergedRouter(stateMachineManager, smDatabase, providerStorage, remoteStoreStorage);

    // 处理所有 tRPC 请求（POST/GET）
    app.all('/*', async (c) => {
        const endpoint = '/api/trpc';

        return fetchRequestHandler({
            req: c.req.raw,
            router,
            createContext: () =>
                createContext(
                    c.req.raw,
                    agentPackage,
                    cronStorage,
                    cronScheduler,
                    providerStorage!,
                    remoteStoreStorage!,
                ),
            endpoint,
        });
    });

    return app;
}
