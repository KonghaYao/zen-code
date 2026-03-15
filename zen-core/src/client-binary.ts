/**
 * zen-core 连接客户端
 * 提供 health check、auto-spawn、等待就绪功能
 */

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './router.js';

export interface ZenCoreConnection {
    trpc: ReturnType<typeof createTRPCClient<AppRouter>>;
    apiUrl: string; // 供 ChatProvider apiUrl 使用
    baseUrl: string; // http://127.0.0.1:{port}
}

export interface ConnectOptions {
    port?: number;
    spawnIfNotRunning?: boolean; // zen-code 传 true，zen-swarm 传 false
    timeout?: number; // ms，默认 10000
}

// ─── 健康检查 ───────────────────────────────────────
async function healthCheck(baseUrl: string): Promise<boolean> {
    try {
        const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
        return res.ok;
    } catch {
        return false;
    }
}

// ─── 版本检查 ───────────────────────────────────────
export async function checkZenCoreVersion(baseUrl: string): Promise<string | null> {
    try {
        const res = await fetch(`${baseUrl}/health`);
        const data = await res.json();
        return data.version || null;
    } catch {
        return null;
    }
}

// ─── 二进制 环境下, 启动 zen-core ──────────────────────────────────
async function spawnZenCore(port: number): Promise<void> {
    await import('./server.js');
}

// ─── 等待就绪 ────────────────────────────────────────
async function waitForReady(baseUrl: string, timeout: number): Promise<void> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (await healthCheck(baseUrl)) return;
        await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`zen-core did not start within ${timeout}ms`);
}

// ─── 停止 zen-core ──────────────────────────────────
export async function stopZenCore(port?: number): Promise<{ stopped: boolean; message: string }> {
    return { stopped: false, message: 'zen-core is running but PID file not found — kill manually' };
}

// ─── 主连接函数 ──────────────────────────────────────
export async function connectToZenCore(options: ConnectOptions = {}): Promise<ZenCoreConnection> {
    const { port = Number(process.env.ZEN_CORE_PORT || 8125), spawnIfNotRunning = false, timeout = 10_000 } = options;

    const baseUrl = `http://127.0.0.1:${port}`;

    const running = await healthCheck(baseUrl);

    if (!running) {
        if (!spawnIfNotRunning) {
            throw new Error(`zen-core is not running on port ${port}`);
        }
        await spawnZenCore(port);
        await waitForReady(baseUrl, timeout);
    }

    const trpc = createTRPCClient<AppRouter>({
        links: [httpBatchLink({ url: `${baseUrl}/api/trpc` })],
    });

    return {
        trpc,
        apiUrl: `${baseUrl}/api/langgraph`, // 供 ChatProvider apiUrl 使用（LangGraph SDK 的 base）
        baseUrl,
    };
}
