/**
 * Zen Swarm Server
 * 基于 LangGraph 的多 Agent 协作服务器
 */

import { registerGraph } from '@langgraph-js/pure-graph';
import LGApp from '@langgraph-js/pure-graph/dist/adapter/hono';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serve } from 'bun';
import { swarmGraph } from './graphBuilder.js';
import { createTRPCHonoRoute } from './api/hono.js';
import {
    agentPackage,
    cronStorage,
    cronScheduler,
    stateMachineManager,
    smDatabase,
    providerStorage,
    remoteStoreStorage,
} from './config/loader.js';
import {
    initDefaultData,
    checkProviderModelStatus,
    checkAndInitDefaultWorkspace,
} from './scripts/init-default-data.js';
import { SERVER_PORT } from './config/constants.js';
import dashboard from './index.html';
import { handleTerminalMessage, handleTerminalClose, handleTerminalOpen } from './api/terminalWebSocket.js';
import { validateToken, authMiddleware, extractTokenFromCookie } from './auth/tokenAuth.js';
import { authRouter } from './api/auth.js';

// 1. 初始化默认数据（如果需要）
await initDefaultData();

// 2. 检查 Workspace，如果不存在则以启动目录创建默认 Workspace
await checkAndInitDefaultWorkspace();

// 3. 检查 Provider 和 Model 状态
await checkProviderModelStatus();

// 3. 注册 graph（自动提供 HTTP API 和流式支持）
console.log('Registering swarm graph...');
registerGraph('swarm', swarmGraph);
console.log('Swarm graph registered successfully');

// 4. 创建 Hono 应用
const app = new Hono();

// 日志中间件
app.use(logger());

// 认证公开路由：/api/auth/* 不需要鉴权（注册/登录接口）
app.route('/api/auth', authRouter);

// 认证中间件：保护所有其他 /api/* 路由（排除 /api/auth/* 公开接口）
// 注意：Hono 的 use() 中间件在 route() 之前执行，必须在此处手动排除公开路径
app.use('/api/*', async (c, next) => {
    if (c.req.path.startsWith('/api/auth/')) {
        return next();
    }
    return authMiddleware(c, next);
});

// 5. API 路由（优先处理）
console.log('Mounting LangGraph routes at /api/langgraph');
app.route('/api/langgraph', LGApp);

const trpcRoute = createTRPCHonoRoute(
    agentPackage,
    cronStorage,
    cronScheduler,
    stateMachineManager,
    smDatabase,
    providerStorage,
    remoteStoreStorage,
);
app.route('/api/trpc', trpcRoute);

app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        service: 'zen-swarm',
        graph: 'swarm',
        cron: {
            isRunning: cronScheduler.isActive(),
            scheduledCount: cronScheduler.getScheduledCount(),
        },
    });
});

// 6. 启动服务器
const port = SERVER_PORT;
console.log(`\n🐝 Zen Swarm Server started`);
console.log(`🌐 Access URL: http://127.0.0.1:${port}/ui`);
console.log(`   Health:      http://127.0.0.1:${port}/health`);
console.log(`   Auth:        http://127.0.0.1:${port}/api/auth/status`);
console.log(`   LangGraph:   http://127.0.0.1:${port}/api/langgraph`);
console.log(`   tRPC:        http://127.0.0.1:${port}/api/trpc`);
console.log(`   Terminal WS: ws://127.0.0.1:${port}/ws/terminal\n`);

async function openBrowser(url: string): Promise<void> {
    const platform = process.platform;
    const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
    try {
        const proc = Bun.spawn([cmd, url], { stdout: 'ignore', stderr: 'ignore' });
        await proc.exited;
    } catch {
        // 无浏览器环境（服务器场景），静默忽略
    }
}

serve({
    routes: {
        '/ui': dashboard,
    },
    fetch(req, server) {
        // 处理 WebSocket 升级请求
        const url = new URL(req.url);
        if (url.pathname === '/ws/terminal') {
            // WebSocket 升级时浏览器自动携带同源 Cookie，从 Cookie 中读取 token
            // 不再使用 URL query 参数传递 token（防止 token 出现在日志中）
            const cookieHeader = req.headers.get('Cookie');
            const wsToken = extractTokenFromCookie(cookieHeader);
            if (!wsToken) {
                return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Missing token' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            return validateToken(wsToken).then((valid) => {
                if (!valid) {
                    return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Invalid token' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                const upgraded = server.upgrade(req, {
                    data: { sessionIds: new Set<string>() },
                });
                if (upgraded) {
                    return undefined; // Bun 会接管 WebSocket
                }
                return new Response('WebSocket upgrade failed', { status: 400 });
            });
        }
        // 其他请求交给 Hono 处理
        return app.fetch(req, server);
    },
    idleTimeout: 120,
    port,
    websocket: {
        open: handleTerminalOpen,
        message: handleTerminalMessage,
        close: handleTerminalClose,
    },
});

openBrowser(`http://127.0.0.1:${port}/ui`);

// 优雅关闭
async function gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);
    await cronScheduler.stop();
    console.log('[Server] Shutdown complete');
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
