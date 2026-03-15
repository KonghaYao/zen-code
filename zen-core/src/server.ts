/**
 * zen-core 主入口
 * Hono HTTP Server + LangGraph + tRPC（无鉴权，本地服务）
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { writeFileSync, unlinkSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { bootstrap } from './bootstrap.js';
import { appRouter } from './router.js';
import { createContext } from './context.js';
import { registerLangGraphRoutes } from './langgraph/handler.js';
import { healthHandler } from './health.js';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
const PORT = Number(process.env.ZEN_CORE_PORT || 8125);
const PID_FILE = join(homedir(), '.zen-code', 'zen-core.pid');

// ─── PID 文件机制（孤儿进程清理）────────────────────────────
const pidDir = join(homedir(), '.zen-code');
if (!existsSync(pidDir)) {
    mkdirSync(pidDir, { recursive: true });
}

if (existsSync(PID_FILE)) {
    const oldPid = parseInt(readFileSync(PID_FILE, 'utf8').trim());
    if (!isNaN(oldPid)) {
        try {
            process.kill(oldPid, 'SIGTERM');
            console.log(`Terminated old zen-core process (PID: ${oldPid})`);
            await new Promise((r) => setTimeout(r, 500));
        } catch {
            // 进程已退出，忽略
        }
    }
}
writeFileSync(PID_FILE, String(process.pid));

process.on('exit', () => {
    try {
        unlinkSync(PID_FILE);
    } catch {}
});

// ─── 初始化服务 ──────────────────────────────────────────────
console.log('Bootstrapping zen-core services...');
const services = await bootstrap();

// ─── 注册 LangGraph graph ────────────────────────────────────
await registerLangGraphRoutes(services);

// ─── 创建 Hono 应用 ──────────────────────────────────────────
const app = new Hono();
app.use(logger());

// /health 端点（公开）
app.get('/health', healthHandler(services));

// tRPC 路由
app.all('/api/trpc/*', async (c) => {
    return fetchRequestHandler({
        req: c.req.raw,
        router: appRouter,
        createContext: () => createContext(services),
        endpoint: '/api/trpc',
    });
});

// LangGraph 路由
const { default: LGApp } = await import('@langgraph-js/pure-graph/dist/adapter/hono');
app.route('/api/langgraph', LGApp);

// ─── 启动服务器 ──────────────────────────────────────────────
serve({
    fetch(req, server) {
        return app.fetch(req, server);
    },
    port: PORT,
});

console.log(`zen-core running on http://127.0.0.1:${PORT}`);
console.log(`   Health:    http://127.0.0.1:${PORT}/health`);
console.log(`   LangGraph: http://127.0.0.1:${PORT}/api/langgraph`);
console.log(`   tRPC:      http://127.0.0.1:${PORT}/api/trpc`);
console.log(`   Terminal:  ws://127.0.0.1:${PORT}/ws/terminal`);

// ─── 优雅关闭 ────────────────────────────────────────────────
async function gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n[zen-core] Received ${signal}, shutting down...`);
    await services.cronScheduler.stop();
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
