import { BrowserWindow, Tray, Utils } from 'electrobun/bun';
import Electrobun from 'electrobun/bun';
import { connectToZenCore } from '@codegraph/union-client';

const ZEN_SWARM_PORT = 8124;
const ZEN_SWARM_URL = `http://127.0.0.1:${ZEN_SWARM_PORT}/ui`;
const ZEN_SWARM_HEALTH = `http://127.0.0.1:${ZEN_SWARM_PORT}/health`;

// ── 1. 启动 zen-core ──────────────────────────────────────────────────────────
console.log('[zen-desktop] Starting zen-core...');
await connectToZenCore({ spawnIfNotRunning: true, timeout: 15_000 });
console.log('[zen-desktop] zen-core ready.');

// ── 2. 启动 zen-swarm server（内嵌，同进程）──────────────────────────────────
const { startServer } = await import('zen-swarm/src/server.js');
await startServer();

// ── 3. 等待 zen-swarm 就绪 ────────────────────────────────────────────────────
await waitForServer(ZEN_SWARM_HEALTH);

// ── 4. 创建主窗口 ─────────────────────────────────────────────────────────────
const win = new BrowserWindow({
    title: 'Zen Swarm',
    url: ZEN_SWARM_URL,
});

// ── 5. 系统托盘 ───────────────────────────────────────────────────────────────
const tray = new Tray({
    title: 'Zen Swarm',
});

tray.on('tray-clicked', () => {
    win.show();
});

// tray.setContextMenu([
//     { label: '打开 Zen Swarm', click: () => win.show() },
//     { label: '退出', click: () => Utils.quit() },
// ]);

// ── 6. 退出清理 ───────────────────────────────────────────────────────────────
Electrobun.events.on('before-quit', async () => {
    console.log('[zen-desktop] Shutting down...');
    // zen-core 由 connectToZenCore 管理，通过 PID 文件处理
});

// ── 工具函数 ──────────────────────────────────────────────────────────────────
async function isServerReady(healthUrl: string, timeout = 500): Promise<boolean> {
    try {
        const res = await fetch(healthUrl, { signal: AbortSignal.timeout(timeout) });
        return res.ok;
    } catch {
        return false;
    }
}

async function waitForServer(healthUrl: string, timeout = 5000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (await isServerReady(healthUrl)) return;
        await Bun.sleep(200);
    }
    throw new Error(`zen-swarm server not ready after ${timeout}ms`);
}
