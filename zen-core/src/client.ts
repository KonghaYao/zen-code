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

// ─── Node 环境下, 启动 zen-core ──────────────────────────────────
async function spawnZenCore(port: number): Promise<void> {
    const { spawn } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    // ts 源文件优先（开发模式），否则回退到编译产物
    const tsPath = new URL('../bin/zen-core.ts', import.meta.url).pathname;
    const jsPath = new URL('./zen-core.js', import.meta.url).pathname;

    let entryPath: string;
    if (existsSync(tsPath)) {
        entryPath = tsPath;
    } else {
        entryPath = jsPath;
    }

    const child = spawn(process.argv[0], [entryPath], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, ZEN_CORE_PORT: String(port) },
    });
    child.unref();
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
    const { existsSync, readFileSync, unlinkSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { homedir } = await import('node:os');

    const PID_FILE = join(homedir(), '.zen-code', 'zen-core.pid');

    // 先尝试通过 PID 文件关闭
    if (existsSync(PID_FILE)) {
        const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim());
        if (!isNaN(pid)) {
            try {
                process.kill(pid, 'SIGTERM');
                try {
                    unlinkSync(PID_FILE);
                } catch {}
                return { stopped: true, message: `zen-core (PID ${pid}) stopped` };
            } catch (e: any) {
                if (e.code === 'ESRCH') {
                    try {
                        unlinkSync(PID_FILE);
                    } catch {}
                    return { stopped: false, message: 'zen-core was not running (stale PID file cleaned)' };
                }
            }
        }
    }

    // PID 文件不存在，尝试通过 health check 确认
    const targetPort = port ?? Number(process.env.ZEN_CORE_PORT || 8125);
    const baseUrl = `http://127.0.0.1:${targetPort}`;
    if (!(await healthCheck(baseUrl))) {
        return { stopped: false, message: 'zen-core is not running' };
    }

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
