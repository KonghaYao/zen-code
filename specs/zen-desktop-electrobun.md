# zen-desktop：Electrobun 桌面版设计规范

## 目标

以**最小改动**将 zen-swarm 包装为跨平台桌面应用，保持 zen-swarm 的全部功能和 Web 版完全一致。

## 核心原则

1. **零前端改动**：zen-swarm 的 React 前端不做任何修改
2. **零后端改动**：zen-swarm 的 server.ts 不做任何修改
3. **新建独立包**：`zen-desktop/` 作为 Electrobun 宿主，完全隔离
4. **复用现有服务**：zen-desktop 内嵌启动 zen-core + zen-swarm，通过 BrowserWindow 加载

---

## 架构

```
zen-desktop（Electrobun 主进程）
  │
  ├── [子进程] zen-core  (:8125)          ← connectToZenCore() 启动
  ├── [内嵌]   zen-swarm server (:8124)   ← import + startServer() 启动
  │
  └── BrowserWindow
        url: "http://localhost:8124/ui"
        frame: hiddenInset (macOS 原生标题栏)
```

### 进程生命周期

```
用户启动 zen-desktop
  → Electrobun 启动 Bun 主进程 (main.ts)
  → connectToZenCore() 启动或复用 zen-core:8125
  → startServer() 启动 zen-swarm:8124（内嵌，同进程）
  → 等待 zen-swarm /health 就绪（最多 5 秒）
  → BrowserWindow 打开 http://localhost:8124/ui
  → 用户看到 App 界面

用户关闭窗口
  → before-quit 事件触发
  → 清理 zen-core 子进程（如果由本进程启动）
  → 退出
```

---

## 目录结构

```
zen-desktop/
├── package.json
├── electrobun.config.ts
└── src/
    └── main.ts
```

仅需 **3 个文件**。

---

## 文件详细设计

### `zen-desktop/package.json`

```json
{
    "name": "zen-desktop",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
        "dev": "electrobun dev",
        "dev:watch": "electrobun dev --watch",
        "build": "electrobun build",
        "build:canary": "electrobun build --env=canary",
        "build:stable": "electrobun build --env=stable"
    },
    "dependencies": {
        "electrobun": "latest",
        "zen-swarm": "workspace:^",
        "@codegraph/union-client": "workspace:^"
    }
}
```

### `zen-desktop/electrobun.config.ts`

```typescript
import { defineConfig } from 'electrobun/bun';

export default defineConfig({
    app: {
        name: 'Zen Swarm',
        identifier: 'com.zenswarm.desktop',
        version: '1.0.0',
        iconPath: '../zen-swarm/src/frontend/assets/icon.png', // 复用 zen-swarm 图标
    },
    build: {
        entrypoint: './src/main.ts',
    },
    // 桌面应用关闭最后一个窗口后不退出（托盘后台运行）
    runtime: {
        exitOnLastWindowClosed: false,
    },
});
```

### `zen-desktop/src/main.ts`

```typescript
import { BrowserWindow, Tray, Utils } from 'electrobun/bun';
import Electrobun from 'electrobun/bun';
import { connectToZenCore } from '@codegraph/union-client';

const ZEN_SWARM_PORT = 8124;
const ZEN_SWARM_URL = `http://127.0.0.1:${ZEN_SWARM_PORT}/ui`;

// ── 1. 启动 zen-core ────────────────────────────────────────────────────────
console.log('[zen-desktop] Starting zen-core...');
await connectToZenCore({ spawnIfNotRunning: true, timeout: 15_000 });
console.log('[zen-desktop] zen-core ready.');

// ── 2. 启动 zen-swarm server（内嵌，同进程）──────────────────────────────────
// zen-swarm/src/server.ts 导出 startServer()，在同一 Bun 进程内运行
// 注：目前 server.ts 直接调用 serve()，需对 zen-swarm 做唯一一处改动（见下方）
const { startServer } = await import('zen-swarm/src/server.js');
await startServer();
console.log(`[zen-desktop] zen-swarm server started on :${ZEN_SWARM_PORT}`);

// ── 3. 等待 zen-swarm 就绪 ───────────────────────────────────────────────────
await waitForServer(ZEN_SWARM_URL.replace('/ui', '/health'));

// ── 4. 创建主窗口 ─────────────────────────────────────────────────────────────
const win = new BrowserWindow({
    title: 'Zen Swarm',
    url: ZEN_SWARM_URL,
    frame: {
        type: 'hiddenInset', // macOS 原生标题栏，内嵌交通灯
    },
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
});

// ── 5. 系统托盘（关闭窗口后可从托盘重新打开）─────────────────────────────────
const tray = new Tray({
    icon: 'assets/tray-icon.png',
    title: 'Zen Swarm',
});

tray.on('click', () => {
    win.show();
});

tray.setContextMenu([
    { label: '打开 Zen Swarm', click: () => win.show() },
    { label: '退出', click: () => Utils.quit() },
]);

// ── 6. 退出清理 ───────────────────────────────────────────────────────────────
Electrobun.events.on('before-quit', async () => {
    console.log('[zen-desktop] Shutting down...');
    // zen-core 由 connectToZenCore 管理，会通过 PID 文件处理
});

// ── 工具函数 ──────────────────────────────────────────────────────────────────
async function waitForServer(healthUrl: string, timeout = 5000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const res = await fetch(healthUrl);
            if (res.ok) return;
        } catch {
            // 还未就绪，继续等待
        }
        await Bun.sleep(200);
    }
    throw new Error(`zen-swarm server not ready after ${timeout}ms`);
}
```

---

## zen-swarm 唯一需要的改动

**文件**: `zen-swarm/src/server.ts`

**改动内容**：将顶层的直接执行代码包装成可导出的 `startServer()` 函数，同时保持直接运行时的行为不变。

```typescript
// 改动前（当前）：
serve({ ... });

// 改动后：
export async function startServer() {
  await connectToZenCore({ spawnIfNotRunning: true, timeout: 15_000 });
  // ... 初始化 postman 等
  serve({ ... });
}

// 保持直接运行时的行为（bun run src/server.ts）
if (import.meta.main) {
  startServer();
}
```

**改动规模**：约 5 行，不影响任何现有功能。

---

## monorepo 根目录改动

**文件**: 根 `package.json`，新增脚本：

```json
{
    "scripts": {
        "dev:desktop": "bun run --cwd zen-desktop dev",
        "build:desktop": "bun run --cwd zen-desktop build"
    }
}
```

---

## 实施阶段

### Phase 1：最小可运行版本（MVP）

- [ ] 创建 `zen-desktop/package.json`
- [ ] 创建 `zen-desktop/electrobun.config.ts`
- [ ] 创建 `zen-desktop/src/main.ts`（基础版，无托盘）
- [ ] 修改 `zen-swarm/src/server.ts`：提取 `startServer()` + `import.meta.main` 守卫
- [ ] 验证：`bun run dev:desktop` 能打开桌面窗口并加载 zen-swarm UI

### Phase 2：系统集成

- [ ] 添加系统托盘（Tray）
- [ ] 配置 macOS 原生窗口样式（hiddenInset）
- [ ] 添加应用图标
- [ ] `before-quit` 清理逻辑

### Phase 3：构建与发布

- [ ] 配置 `electrobun.config.ts` 构建选项
- [ ] 测试 `bun run build:desktop` 生成 `.app`
- [ ] 配置自动更新（updater，可选）

---

## 注意事项

### 端口冲突处理

zen-swarm 默认监听 `:8124`，zen-core 默认
`:8125`。桌面版启动前需检测端口是否已被占用（可能用户同时运行了 Web 版 zen-swarm）。

方案：`waitForServer` 如果端口已有服务在监听，则直接复用，不重复启动。

### Auth 层在桌面版的处理

zen-swarm 有 token 认证（Bearer token）。桌面版本地访问时，可考虑：

**方案 A（推荐）**：桌面版跳过 auth，在 zen-swarm 启动时设置 `SKIP_AUTH=true` 环境变量
**方案 B**：桌面版自动读取 token 并注入到 BrowserWindow 的 Cookie 或 localStorage

Phase 1 先用方案 A 快速跑通，Phase 2 再根据需要决定。

### Windows 支持

Electrobun 跨平台仍在完善中，当前优先支持 macOS。Windows 的 `hiddenInset` 需改为标准 frame。

---

## 文件变更总览

| 文件                               | 操作 | 改动量 |
| ---------------------------------- | ---- | ------ |
| `zen-desktop/package.json`         | 新建 | ~20 行 |
| `zen-desktop/electrobun.config.ts` | 新建 | ~20 行 |
| `zen-desktop/src/main.ts`          | 新建 | ~60 行 |
| `zen-swarm/src/server.ts`          | 修改 | ~5 行  |
| 根 `package.json`                  | 修改 | ~2 行  |

**总计**：新增 ~100 行代码，修改 ~7 行现有代码。
