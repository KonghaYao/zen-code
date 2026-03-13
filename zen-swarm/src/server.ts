/**
 * Zen Swarm Server（代理模式）
 * 纯前端服务 + API 代理到 zen-core
 *
 * 所有 /api/* 请求转发到 zen-core (默认 8125 端口)
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serve } from 'bun';
import { SERVER_PORT } from './config/constants.js';
import dashboard from './index.html';
import { handleTerminalMessage, handleTerminalClose, handleTerminalOpen } from './api/terminalWebSocket.js';

const ZEN_CORE_URL = process.env.ZEN_CORE_URL || 'http://127.0.0.1:8125';

const app = new Hono();
app.use(logger());

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
