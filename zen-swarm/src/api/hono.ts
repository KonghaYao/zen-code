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
) {
    const app = new Hono();

    // 创建包含 SM Router 的合并路由
    const router = createMergedRouter(stateMachineManager, smDatabase);

    // 处理所有 tRPC 请求（POST/GET）
    app.all('/*', async (c) => {
        const endpoint = '/api/trpc';

        return fetchRequestHandler({
            req: c.req.raw,
            router,
            createContext: () => createContext(agentPackage, cronStorage, cronScheduler),
            endpoint,
        });
    });

    return app;
}
