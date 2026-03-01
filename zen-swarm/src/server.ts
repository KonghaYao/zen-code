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
import dashboard from './index.html';
import { handleTerminalMessage, handleTerminalClose, handleTerminalOpen } from './api/terminalWebSocket.js';

// 1. 初始化默认数据（如果需要）
await initDefaultData();

// 2. 检查 Provider 和 Model 状态
await checkProviderModelStatus();

// 3. 注册 graph（自动提供 HTTP API 和流式支持）
console.log('Registering swarm graph...');
registerGraph('swarm', swarmGraph);
console.log('Swarm graph registered successfully');

// 4. 创建 Hono 应用
const app = new Hono();

// 日志中间件
app.use(logger());

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
const port = 8124;
console.log(`🐝 Zen Swarm Server running on http://127.0.0.1:${port}/ui`);
console.log(`   Health: http://127.0.0.1:${port}/health`);
console.log(`   LangGraph API: http://127.0.0.1:${port}/api/langgraph`);
console.log(`   tRPC API: http://127.0.0.1:${port}/api/trpc`);
console.log(`   Terminal WebSocket: ws://127.0.0.1:${port}/ws/terminal`);

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

openBrowser(`http://127.0.0.1:${port}/ui`);
