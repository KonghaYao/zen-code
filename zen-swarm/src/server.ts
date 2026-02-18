/**
 * Zen Swarm Server
 * 基于 LangGraph 的多 Agent 协作服务器
 */

import { registerGraph } from '@langgraph-js/pure-graph';
import LGApp from '@langgraph-js/pure-graph/dist/adapter/hono';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/serve-static';
import { serve } from 'bun';
import { swarmGraph } from './graphBuilder.js';
import { createTRPCHonoRoute } from './api/hono.js';
import { agentPackage } from './config/loader.js';
import { resolve } from 'path';
import { readFile } from 'fs/promises';

// 1. 注册 graph（自动提供 HTTP API 和流式支持）
registerGraph('swarm', swarmGraph);

// 2. 创建 Hono 应用
const app = new Hono();

// 日志中间件
app.use(logger());

// 3. API 路由（优先处理）
app.route('/api/langgraph', LGApp);

const trpcRoute = createTRPCHonoRoute(agentPackage);
app.route('/api/trpc', trpcRoute);

app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        service: 'zen-swarm',
        graph: 'swarm',
    });
});

// 4. 静态文件服务
const publicPath = resolve(process.cwd(), 'public');

// SPA fallback: 其他所有路径返回 index.html
app.get(
    '/ui/*',
    serveStatic({
        root: publicPath,

        getContent(path) {
            return readFile(path.replace('/ui', ''), 'utf-8');
        },
    }),
);

// 5. 启动服务器
const port = 8124;
console.log(`🐝 Zen Swarm Server running on http://127.0.0.1:${port}`);
console.log(`   Health: http://127.0.0.1:${port}/health`);
console.log(`   LangGraph API: http://127.0.0.1:${port}/api/langgraph`);
console.log(`   tRPC API: http://127.0.0.1:${port}/api/trpc`);

serve({
    fetch: app.fetch,
    port,
});
