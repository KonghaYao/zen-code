/**
 * Zen Swarm Server（代理模式）
 * 纯前端服务 + API 代理到 zen-core
 *
 * 所有 /api/* 请求转发到 zen-core (默认 8125 端口)
 * 例外（本地处理，不转发）：
 *   - /api/auth/*
 *   - /api/trpc/postman.*
 *   - /api/trpc/providers.*
 *   - /api/trpc/store.*
 *   - /api/trpc/files.*
 *   - /api/trpc/agents.*
 *   - /api/trpc/prompts.*
 *   - /api/trpc/middlewares.*
 *   - /api/trpc/mcp.*
 *   - /api/trpc/workspaces.*
 *   - /api/trpc/cron.*
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serve } from 'bun';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { SERVER_PORT } from './config/constants.js';
import dashboard from './index.html';
import { handleTerminalMessage, handleTerminalClose, handleTerminalOpen } from './api/terminalWebSocket.js';
import { createPostmanRouter } from './api/postman.js';
import { FileSystemPostmanStorage } from './postman/fileSystemStorage.js';
import { router, createContext } from './api/trpc.js';
import { filesRouter } from './api/files.js';
import { connectToZenCore } from 'zen-core/client-binary';
import { authRouter } from './api/auth.js';
import { authMiddleware } from './auth/tokenAuth.js';
import { createProviderRouter } from './api/providers.js';
import { createStoreRouter } from './api/store.js';
import { agentsRouter } from './api/agents.js';
import { promptsRouter } from './api/prompts.js';
import { middlewaresRouter } from './api/middlewares.js';
import { mcpRouter } from './api/mcp.js';
import { workspacesRouter } from './api/workspaces.js';
import { cronRouter } from './api/cron.js';
import { bootstrapLocal } from './bootstrap.js';

export async function startServer() {
    // ── 确保 zen-core 运行 ───────────────────────────────────────────────────────

    console.log('Checking zen-core...');
    await connectToZenCore({ spawnIfNotRunning: true, timeout: 15_000 });
    console.log('zen-core is ready.');

    // ── 初始化本地 SQLite 服务 ───────────────────────────────────────────────────

    const localServices = await bootstrapLocal();

    // ── Postman 本地 tRPC ────────────────────────────────────────────────────────

    const postmanStorage = new FileSystemPostmanStorage();
    await postmanStorage.initialize();

    const ZEN_CORE_URL = process.env.ZEN_CORE_URL || 'http://127.0.0.1:8125';

    /** 通过 zen-core tRPC 获取所有 models（用于 provider delete 检查） */
    async function getAllModelsFromZenCore() {
        try {
            const res = await fetch(`${ZEN_CORE_URL}/api/trpc/models.list`);
            if (!res.ok) return [];
            const json = (await res.json()) as { result?: { data?: { json?: unknown[] } } };
            return (json?.result?.data?.json ?? []) as Array<{
                provider_id?: string;
                name?: string;
                model_name?: string;
            }>;
        } catch {
            return [];
        }
    }

    // ── 统一本地 tRPC 路由（包含所有本地持有的存储路由）────────────────────────

    const localTrpcRouter = router({
        agents: agentsRouter,
        prompts: promptsRouter,
        middlewares: middlewaresRouter,
        mcp: mcpRouter,
        workspaces: workspacesRouter,
        cron: cronRouter,
        providers: createProviderRouter(localServices.providerStorage, { getAllModels: getAllModelsFromZenCore }),
        store: createStoreRouter(localServices.remoteStoreStorage),
        postman: createPostmanRouter(postmanStorage),
        files: filesRouter,
    });

    /** 构建本地 tRPC context（传入所有本地服务） */
    function makeLocalContext(req: Request) {
        return createContext(
            req,
            localServices.agentPackage,
            localServices.mergedStorage,
            localServices.mcpStorage,
            localServices.workspaceStorage,
            localServices.cronStorage,
            localServices.cronScheduler,
            localServices.providerStorage,
            localServices.remoteStoreStorage,
            postmanStorage,
        );
    }

    const app = new Hono();
    app.use(logger());

    // 本地处理 auth（不转发给 zen-core）
    app.route('/api/auth', authRouter);

    // 保护所有其他 /api/* 路由
    app.use('/api/*', async (c, next) => {
        if (c.req.path.startsWith('/api/auth/')) return next();
        return authMiddleware(c, next);
    });

    // 本地处理 tRPC（agents/prompts/middlewares/mcp/workspaces/cron/providers/store/postman/files 均本地）
    app.all('/api/trpc/agents.*', (c) => {
        return fetchRequestHandler({
            endpoint: '/api/trpc',
            req: c.req.raw,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router: localTrpcRouter as any,
            createContext: ({ req }) => makeLocalContext(req),
        });
    });

    app.all('/api/trpc/prompts.*', (c) => {
        return fetchRequestHandler({
            endpoint: '/api/trpc',
            req: c.req.raw,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router: localTrpcRouter as any,
            createContext: ({ req }) => makeLocalContext(req),
        });
    });

    app.all('/api/trpc/middlewares.*', (c) => {
        return fetchRequestHandler({
            endpoint: '/api/trpc',
            req: c.req.raw,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router: localTrpcRouter as any,
            createContext: ({ req }) => makeLocalContext(req),
        });
    });

    app.all('/api/trpc/mcp.*', (c) => {
        return fetchRequestHandler({
            endpoint: '/api/trpc',
            req: c.req.raw,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router: localTrpcRouter as any,
            createContext: ({ req }) => makeLocalContext(req),
        });
    });

    app.all('/api/trpc/workspaces.*', (c) => {
        return fetchRequestHandler({
            endpoint: '/api/trpc',
            req: c.req.raw,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router: localTrpcRouter as any,
            createContext: ({ req }) => makeLocalContext(req),
        });
    });

    app.all('/api/trpc/cron.*', (c) => {
        return fetchRequestHandler({
            endpoint: '/api/trpc',
            req: c.req.raw,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router: localTrpcRouter as any,
            createContext: ({ req }) => makeLocalContext(req),
        });
    });

    // 本地处理 postman tRPC（不走代理）
    app.all('/api/trpc/postman.*', (c) => {
        return fetchRequestHandler({
            endpoint: '/api/trpc',
            req: c.req.raw,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router: localTrpcRouter as any,
            createContext: ({ req }) => makeLocalContext(req),
        });
    });

    // 本地处理 providers tRPC（不走代理）
    app.all('/api/trpc/providers.*', (c) => {
        return fetchRequestHandler({
            endpoint: '/api/trpc',
            req: c.req.raw,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router: localTrpcRouter as any,
            createContext: ({ req }) => makeLocalContext(req),
        });
    });

    // 本地处理 store tRPC（远程仓库管理，不走代理）
    app.all('/api/trpc/store.*', (c) => {
        return fetchRequestHandler({
            endpoint: '/api/trpc',
            req: c.req.raw,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router: localTrpcRouter as any,
            createContext: ({ req }) => makeLocalContext(req),
        });
    });

    // 本地处理 files tRPC（文件系统操作，不走代理）
    app.all('/api/trpc/files.*', (c) => {
        return fetchRequestHandler({
            endpoint: '/api/trpc',
            req: c.req.raw,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router: localTrpcRouter as any,
            createContext: ({ req }) => makeLocalContext(req),
        });
    });

    // 代理所有 /api/* 请求到 zen-core
    app.all('/api/*', async (c) => {
        const url = new URL(c.req.url);
        const targetUrl = `${ZEN_CORE_URL}${url.pathname}${url.search}`;

        const reqHeaders = new Headers(c.req.raw.headers);
        // 移除 host header 避免代理冲突
        reqHeaders.delete('host');

        try {
            const response = await fetch(targetUrl, {
                method: c.req.method,
                headers: reqHeaders,
                body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
                // @ts-ignore - Bun 支持
                duplex: 'half',
            });

            // 透传响应头
            const resHeaders = new Headers(response.headers);

            return new Response(response.body, {
                status: response.status,
                headers: resHeaders,
            });
        } catch (error) {
            console.error('[proxy] zen-core unreachable:', error);
            return c.json({ error: 'zen-core unavailable', message: String(error) }, 503);
        }
    });

    // /health
    app.get('/health', (c) =>
        c.json({
            status: 'ok',
            service: 'zen-swarm',
            mode: 'proxy',
            zenCoreUrl: ZEN_CORE_URL,
        }),
    );

    const port = SERVER_PORT;
    console.log(`\n🐝 Zen Swarm (proxy mode) started`);
    console.log(`🌐 Access URL: http://127.0.0.1:${port}/ui`);
    console.log(`   Proxying API to: ${ZEN_CORE_URL}`);

    serve({
        routes: {
            '/ui': dashboard,
        },
        fetch(req, server) {
            const url = new URL(req.url);

            // 本地处理 Terminal WebSocket
            if (url.pathname === '/ws/terminal') {
                const upgraded = server.upgrade(req, { data: { sessionIds: new Set<string>() } });
                if (upgraded) return undefined;
                return new Response('WebSocket upgrade failed', { status: 426 });
            }

            return app.fetch(req, server);
        },
        websocket: {
            open: handleTerminalOpen,
            message: handleTerminalMessage,
            close: handleTerminalClose,
        },
        port,
    });
}

if (import.meta.main) {
    startServer();
}
