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
} from './config/loader.js';
import { initDefaultData, checkProviderModelStatus } from './scripts/init-default-data.js';
import { SERVER_PORT } from './config/constants.js';
import dashboard from './index.html';
import { handleTerminalMessage, handleTerminalClose, handleTerminalOpen } from './api/terminalWebSocket.js';
import { generateToken, validateToken, authMiddleware } from './auth/tokenAuth.js';

// 1. 生成服务 token（内存存储，服务重启后失效）
const token = generateToken();

// 2. 初始化默认数据（如果需要）
await initDefaultData();

// 3. 检查 Provider 和 Model 状态
await checkProviderModelStatus();

// 4. 注册 graph（自动提供 HTTP API 和流式支持）
console.log('Registering swarm graph...');
registerGraph('swarm', swarmGraph);
console.log('Swarm graph registered successfully');

// 5. 创建 Hono 应用
const app = new Hono();

// 日志中间件
app.use(logger());

// 认证中间件：保护所有 /api/* 路由
app.use('/api/*', authMiddleware);

// 6. API 路由（优先处理）
console.log('Mounting LangGraph routes at /api/langgraph');
app.route('/api/langgraph', LGApp);

const trpcRoute = createTRPCHonoRoute(
    agentPackage,
    cronStorage,
    cronScheduler,
    stateMachineManager,
    smDatabase,
    providerStorage,
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

// 6. WebSocket 路由 - 终端服务（在 Hono 处理之前）
// 注意：不要在 Hono 中注册 /ws/terminal 路由

// 7. 启动服务器
const port = SERVER_PORT;
console.log(`\n🐝 Zen Swarm Server started`);
console.log(`🔑 Access URL: http://127.0.0.1:${port}/ui?token=${token}`);
console.log(`   Health:      http://127.0.0.1:${port}/health`);
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
            // WebSocket 无法设置自定义 Header，通过 query 参数传递 token
            const wsToken = url.searchParams.get('token');
            if (!wsToken || !validateToken(wsToken)) {
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

openBrowser(`http://127.0.0.1:${port}/ui?token=${token}`);

// 优雅关闭
async function gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);
    await cronScheduler.stop();
    console.log('[Server] Shutdown complete');
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
