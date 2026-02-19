/**
 * Hono tRPC 适配器
 * 将 tRPC router 集成到 Hono 应用中
 */

import { Hono } from 'hono';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { AppRouter } from './index.js';
import { createContext } from './trpc.js';
import { AgentPackage } from '@langgraph-js/standard-agent';
import { appRouter } from './index.js';
// ========================================
// 创建 Hono tRPC 路由
// ========================================

export function createTRPCHonoRoute(agentPackage: AgentPackage) {
    const app = new Hono();

    // 处理所有 tRPC 请求（POST/GET）
    app.all('/*', async (c) => {
        const endpoint = '/api/trpc';

        return fetchRequestHandler({
            req: c.req.raw,
            router: appRouter,
            createContext: () => createContext(agentPackage),
            endpoint,
        });
    });

    return app;
}
