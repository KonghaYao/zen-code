/**
 * zen-core 主入口
 * Hono HTTP Server + LangGraph + tRPC
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serve } from 'bun';
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
            // 等待旧进程退出并释放端口（最多 3 秒）
            const deadline = Date.now() + 3000;
            while (Date.now() < deadline) {
                try {
                    process.kill(oldPid, 0);
                } catch {
                    break;
                } // 进程已消失
                await new Promise((r) => setTimeout(r, 100));
            }
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
await registerLangGraphRoutes(services.agentPackage);

// ─── 创建 Hono 应用 ──────────────────────────────────────────
const app = new Hono();
app.use(logger());

// /health 端点
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

// LangGraph 路由（使用 @langgraph-js/pure-graph 的 Hono adapter）
const { default: LGApp } = await import('@langgraph-js/pure-graph/dist/adapter/hono');
app.route('/api/langgraph', LGApp);

// ─── 启动服务器 ──────────────────────────────────────────────
serve({ fetch: app.fetch, port: PORT });
console.log(`zen-core running on http://127.0.0.1:${PORT}`);

// ─── 优雅关闭 ────────────────────────────────────────────────
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
