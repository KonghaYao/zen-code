# zen-core 详细设计文档

> 基于 `specs/zen-core-server-layer.md` 规划文档  
> 日期: 2026-03-13  
> 状态: 设计阶段

---

## 一、现状分析

### 当前调用链

```
zen-code/src/cli.ts
  └─ createFSManager()           → packages/config (直接)
  └─ import('./app')             → Chat.tsx
       └─ SettingsContext.tsx
            └─ createFSManager() → packages/config (直接)
       └─ Chat.tsx → ChatProvider apiUrl="http://127.0.0.1:8123"  ← 旧 LangGraph server

zen-code/src/nonInteractive.ts
  └─ createFSManager()           → packages/config (直接)
  └─ graph.invoke()              → @codegraph/agent/src/index (直接)

zen-swarm/src/server.ts
  └─ config/loader.ts            → AgentPackage + BunSqliteStorage (直接)
  └─ createTRPCHonoRoute()       → 本地 tRPC router (直接)
  └─ registerGraph('swarm', ...) → @langgraph-js/pure-graph (直接)
```

### 重复资源

| 资源                | zen-code                                                      | zen-swarm                                                           | 说明                |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------- |
| AgentPackage 初始化 | `packages/agent/src/config/index.ts` → `loadDefaultConfigs()` | `zen-swarm/src/config/loader.ts` → `new AgentPackage(agentStorage)` | 各自独立实例        |
| ConfigManager       | `createFSManager()` 在多处调用                                | N/A（使用 ProviderStorage）                                         | zen-code 多次初始化 |
| SQLite DB           | `~/.zen-code/data/sessions.db`                                | `~/.zen-swarm/data.db`                                              | 完全隔离            |
| MCP 连接            | MCPManager 单例（进程内）                                     | MCPManager 单例（进程内）                                           | 两个进程各持一份    |

---

## 二、目标架构

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                  │
│                                                                       │
│   zen-code (TUI)                      zen-swarm (Web UI)             │
│   ├─ React/Ink UI                     ├─ React/Vite 前端             │
│   ├─ TanStack Query hooks             ├─ TanStack Query hooks         │
│   └─ connectToZenCore()               └─ connectToZenCore()          │
│        ↓ GET /health                       ↓ GET /health             │
│        ↓ Bun.spawn(detached)               ↓ connect only            │
│        ↓ poll until ready                                             │
├──────────────────────────────────────────────────────────────────────┤
│                   zen-core (独立守护进程, 端口 8125)                  │
│                                                                       │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │  Hono HTTP Server                                            │   │
│   │  ├─ GET  /health                   → HealthHandler           │   │
│   │  ├─ ALL  /api/trpc/*               → tRPC Router             │   │
│   │  └─ ALL  /api/langgraph/*          → LangGraph Handler       │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│   │ AgentPackage │  │ ConfigManager│  │ CronScheduler            │  │
│   │ (MemStorage) │  │ + FSConfig   │  │ + CronStorage            │  │
│   └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                       │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│   │ MCPManager   │  │ SQLite DB    │  │ ProcessManager           │  │
│   │ 单例 (懒连接)│  │ tasks+history│  │ background_processes     │  │
│   └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 三、zen-core 目录结构（完整）

```
zen-core/
├── package.json
├── tsconfig.json
├── bin/
│   └── zen-core.ts              # CLI 入口：bun zen-core/bin/zen-core.ts [--port 8125]
└── src/
    ├── server.ts                # 主入口：Hono + Bun.serve
    ├── bootstrap.ts             # 服务初始化（单例容器）
    ├── health.ts                # /health 端点处理
    ├── router.ts                # tRPC AppRouter 聚合
    ├── context.ts               # tRPC Context 定义
    ├── langgraph/
    │   └── handler.ts           # /api/langgraph 路由挂载（registerGraph）
    └── routes/
        ├── config.ts            # config.get / config.update
        ├── models.ts            # models.list（带超时重试）
        ├── skills.ts            # skills.list / skills.save / skills.delete
        ├── tasks.ts             # tasks.list / tasks.update / tasks.delete
        ├── history.ts           # history.list
        ├── agents.ts            # agents.list / agents.get
        ├── providers.ts         # providers.list（从 ConfigManager 读取）
        ├── knowledge.ts         # knowledge.list（memories + skills 聚合）
        └── processes.ts         # processes.list / processes.kill（ProcessManager）
```

---

## 四、bootstrap.ts — 单例容器

所有服务在进程启动时**一次性初始化**，通过依赖注入传入 tRPC Context。

```typescript
// zen-core/src/bootstrap.ts

import { AgentPackage } from '@langgraph-js/standard-agent';
import { MemoryStorage } from '@langgraph-js/standard-agent/storage/memory';
import { createFSManager } from '@codegraph/config';
import { loadDefaultConfigs } from '@codegraph/agent/src/subagents/loader';

export interface ZenCoreServices {
    agentPackage: AgentPackage;
    configManager: Awaited<ReturnType<typeof createFSManager>>;
    // 可扩展: cronScheduler, processManager, etc.
}

let _services: ZenCoreServices | null = null;

export async function bootstrap(): Promise<ZenCoreServices> {
    if (_services) return _services;

    // 1. AgentPackage（使用 MemoryStorage，与 zen-code 当前行为一致）
    const agentPackage = await loadDefaultConfigs();

    // 2. ConfigManager（读取 ~/.zen-code/settings.json）
    const configManager = await createFSManager();
    await configManager.initialize();

    _services = { agentPackage, configManager };
    return _services;
}
```

**注意**：zen-core 不使用 zen-swarm 的 `BunSqliteStorage` 或
`ProviderStorage`，优先保持与 zen-code 当前行为一致（MemoryStorage + FSConfig）。后续 Phase 3 再统一。

---

## 五、server.ts — 主入口

```typescript
// zen-core/src/server.ts

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serve } from 'bun';
import { bootstrap } from './bootstrap.js';
import { createTRPCHonoRoute } from './router.js';
import { registerLangGraphRoutes } from './langgraph/handler.js';
import { healthHandler } from './health.js';

const PORT = Number(process.env.ZEN_CORE_PORT || 8125);

// 1. 初始化服务
const services = await bootstrap();

// 2. 注册 LangGraph graph（来自 @codegraph/agent）
await registerLangGraphRoutes();

// 3. 创建 Hono 应用
const app = new Hono();
app.use(logger());

// 4. 路由
app.get('/health', healthHandler(services));
app.route('/api/trpc', createTRPCHonoRoute(services));
// LangGraph 使用 @langgraph-js/pure-graph 的 Hono adapter
import LGApp from '@langgraph-js/pure-graph/dist/adapter/hono';
app.route('/api/langgraph', LGApp);

// 5. 启动
serve({ fetch: app.fetch, port: PORT });
console.log(`zen-core running on http://127.0.0.1:${PORT}`);

// 6. 优雅关闭
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
```

---

## 六、tRPC Router 设计

### context.ts

```typescript
// zen-core/src/context.ts

import type { ZenCoreServices } from './bootstrap.js';

export interface ZenCoreContext extends ZenCoreServices {
    // 未来可加 userId、workspaceId 等
}

export function createContext(services: ZenCoreServices): ZenCoreContext {
    return { ...services };
}
```

### router.ts

```typescript
// zen-core/src/router.ts

import { initTRPC } from '@trpc/server';
import type { ZenCoreContext } from './context.js';
import { configRouter } from './routes/config.js';
import { modelsRouter } from './routes/models.js';
import { skillsRouter } from './routes/skills.js';
import { tasksRouter } from './routes/tasks.js';
import { historyRouter } from './routes/history.js';
import { agentsRouter } from './routes/agents.js';
import { providersRouter } from './routes/providers.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { processesRouter } from './routes/processes.js';

const t = initTRPC.context<ZenCoreContext>().create();
export const router = t.router;
export const procedure = t.procedure;

export const appRouter = router({
    config: configRouter,
    models: modelsRouter,
    skills: skillsRouter,
    tasks: tasksRouter,
    history: historyRouter,
    agents: agentsRouter,
    providers: providersRouter,
    knowledge: knowledgeRouter,
    processes: processesRouter,
});

export type AppRouter = typeof appRouter;
```

### 各路由说明

#### config.ts — 对应 useConfig / useUpdateConfig

```typescript
// 直接调用 ConfigManager
config.get:    () => configManager.getConfig()
config.update: (partial: Partial<AppConfig>) => configManager.updateConfig(partial)
```

**现状迁移**：`SettingsContext.tsx` 中 `createFSManager()` → 改为调用 `trpc.config.get.query()`

#### models.ts — 对应 useModels

```typescript
// 现有逻辑在 zen-code/src/chat/hooks/useModels.ts 中实现（直接 fetch provider API）
// 迁移后：zen-core 作为代理，客户端通过 tRPC 获取（避免 CORS / apiKey 泄露）
models.list: (input: { providerId: string }) => fetchModelsFromProvider(provider)
```

**现状迁移**：`useModels.ts` 中 `getOpenAIModels` 等函数 → 移入 zen-core `routes/models.ts`

#### skills.ts — 对应 useSkills

```typescript
// 读取 .claude/skills/ 和 ~/.claude/skills/
skills.list:   () => FileSystemSkillStore.listSkills()
skills.save:   (skill: Skill) => FileSystemSkillStore.saveSkill(skill)
skills.delete: (name: string) => FileSystemSkillStore.deleteSkill(name)
```

#### tasks.ts — 对应 useTasks

```typescript
// 当前 useTasks 直接读 SQLite（@codegraph/config 的 task store）
tasks.list:         () => taskStore.listTasks()
tasks.updateStatus: (id, status) => taskStore.updateStatus(id, status)
tasks.delete:       (id) => taskStore.deleteTask(id)
```

#### agents.ts — 对应 useAgents

```typescript
// 当前 useAgents 返回硬编码的 DEFAULT_AGENTS
// 迁移后：从 AgentPackage 动态查询
agents.list: () => agentPackage.listAgents()
agents.get:  (id: string) => agentPackage.getAgent(id)
```

#### providers.ts — 对应 useProviders

```typescript
// 当前从 ConfigManager 读取 providers[]
providers.list: () => configManager.getConfig().then(c => c.providers || [])
```

#### knowledge.ts — 对应 useKnowledge

```typescript
// memories + skills 聚合
knowledge.list: () => {
    const memories = await MemoriesStore.list();
    const skills   = await SkillStore.list();
    return { memories, skills };
}
```

#### processes.ts — 对应 ProcessManagerService

```typescript
// 当前 ProcessManagerService 使用进程内共享 Map（background_processes）
// 迁移后：ProcessManager 移入 zen-core，通过 tRPC 查询
processes.list: () => processManager.listProcesses()
processes.kill: (id: string) => processManager.killProcess(id)
```

---

## 七、LangGraph Handler

```typescript
// zen-core/src/langgraph/handler.ts

import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from '@codegraph/agent/src/graphBuilder';

export async function registerLangGraphRoutes() {
    // 使用 @codegraph/agent 的 graph（与 zen-code 当前 nonInteractive 直接调用的同一个 graph）
    registerGraph('code', graph);
    console.log('LangGraph graph "code" registered at /api/langgraph');
}
```

**关键**：`ChatProvider apiUrl` 从 `8123` → `8125`，`defaultAgent` 从 `"code"` 保持不变。

---

## 八、/health 端点

```typescript
// zen-core/src/health.ts

import { VERSION } from './version.js'; // 从 package.json 读取

export function healthHandler(services: ZenCoreServices) {
    return (c: Context) =>
        c.json({
            status: 'ok',
            version: VERSION,
            service: 'zen-core',
            port: Number(process.env.ZEN_CORE_PORT || 8125),
            graphs: ['code'], // 已注册的 LangGraph graph 名称
            timestamp: Date.now(),
        });
}
```

客户端通过检查 `version` 字段来验证版本兼容性。

---

## 九、packages/union-client — 连接客户端

### 新增文件：`packages/union-client/src/zen-core-client.ts`

```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from 'zen-core/src/router';

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
async function checkVersion(baseUrl: string, expectedVersion: string): Promise<boolean> {
    try {
        const res = await fetch(`${baseUrl}/health`);
        const data = await res.json();
        return data.version === expectedVersion;
    } catch {
        return false;
    }
}

// ─── 启动 zen-core ──────────────────────────────────
async function spawnZenCore(port: number): Promise<void> {
    // 查找 zen-core 入口（相对于当前可执行文件）
    const zenCorePath = new URL('../../../zen-core/bin/zen-core.ts', import.meta.url).pathname;

    Bun.spawn(['bun', zenCorePath, '--port', String(port)], {
        detached: true, // 守护进程
        stdio: ['ignore', 'ignore', 'ignore'],
        env: { ...process.env, ZEN_CORE_PORT: String(port) },
    });
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

    return { trpc, apiUrl: baseUrl, baseUrl };
}
```

**导出**：在 `packages/union-client/src/index.ts` 中 `export * from './zen-core-client.js'`

---

## 十、zen-code 适配修改

### 10.1 cli.ts

```typescript
// 修改前
import { createFSManager } from '@codegraph/config';
const manager = await createFSManager();
await manager.initialize();

// 修改后（cli.ts 顶部，render 之前）
import { connectToZenCore } from '@codegraph/union-client';

const connection = await connectToZenCore({
    spawnIfNotRunning: true,   // zen-code 负责 spawn
    timeout: 10_000,
});

// 传入 app（或通过 Context）
render(<App connection={connection} />);
```

### 10.2 Chat.tsx — ChatProvider

```typescript
// 修改前
<ChatProvider apiUrl="http://127.0.0.1:8123" defaultAgent="code" ...>

// 修改后（apiUrl 来自 connection）
<ChatProvider apiUrl={connection.apiUrl} defaultAgent="code" ...>
```

### 10.3 SettingsContext.tsx — 去除 createFSManager()

```typescript
// 修改前
import { createFSManager } from '@codegraph/config';
// useEffect: createFSManager() → setManager(m)

// 修改后
// 不再直接初始化 ConfigManager
// useConfig hook 改为调用 trpc.config.get.query()
// useUpdateConfig 改为调用 trpc.config.update.mutate()

// SettingsProvider 接收 trpc 作为 prop（或通过 ZenCoreContext）
```

### 10.4 useConfig.ts

```typescript
// 修改前：需要 manager: ConfigManager 参数
import type { ConfigManager } from '@codegraph/config';
interface UseConfigOptions {
    manager: ConfigManager;
    enabled?: boolean;
}

// 修改后：使用 trpc
import type { AppRouter } from 'zen-core/src/router';
import { useTrpc } from '../context/ZenCoreContext'; // 新增 Context

export function useConfig({ enabled = true } = {}) {
    const trpc = useTrpc();
    return useQuery({
        queryKey: queryKeys.config.detail(),
        queryFn: () => trpc.config.get.query(),
        enabled,
        staleTime: 5 * 60 * 1000,
    });
}

export function useUpdateConfig() {
    const trpc = useTrpc();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (partial) => trpc.config.update.mutate(partial),
        onSuccess: (updated) => {
            queryClient.setQueryData(queryKeys.config.detail(), updated);
        },
    });
}
```

### 10.5 nonInteractive.ts

```typescript
// 修改前：graph.invoke() 直接调用

// 修改后：通过 LangGraph SDK 发送请求到 zen-core
import { Client } from '@langgraph-js/sdk';

export async function runNonInteractive(prompt?: string, useStdin = false) {
    const connection = await connectToZenCore({ spawnIfNotRunning: true });

    const config = await connection.trpc.config.get.query();

    const client = new Client({ apiUrl: connection.apiUrl });
    // 使用 threads + runs API
    const thread = await client.threads.create();
    const run = await client.runs.stream(thread.thread_id, 'code', {
        input: {
            messages: [{ type: 'human', content: finalPrompt }],
            provider_id: config.provider_id,
            model_id: config.model_id,
            cwd: process.cwd(),
        },
        streamMode: 'values',
    });
    // 处理流式响应...
}
```

### 10.6 新增 ZenCoreContext

```typescript
// zen-code/src/chat/context/ZenCoreContext.tsx
import { createContext, useContext } from 'react';
import type { ZenCoreConnection } from '@codegraph/union-client';

const ZenCoreContext = createContext<ZenCoreConnection | null>(null);

export const ZenCoreProvider = ZenCoreContext.Provider;

export function useTrpc() {
    const ctx = useContext(ZenCoreContext);
    if (!ctx) throw new Error('useTrpc must be used within ZenCoreProvider');
    return ctx.trpc;
}

export function useZenCore() {
    const ctx = useContext(ZenCoreContext);
    if (!ctx) throw new Error('useZenCore must be used within ZenCoreProvider');
    return ctx;
}
```

---

## 十一、zen-swarm Phase 3 适配（后续）

Phase 3 中 zen-swarm 改为**前端服务 + API 代理**模式：

```typescript
// zen-swarm/src/server.ts (Phase 3 简化版)

// 删除：createTRPCHonoRoute, registerGraph, agentPackage 初始化...
// 保留：Web UI 静态文件服务 + API 代理

app.all('/api/*', async (c) => {
    // 代理转发到 zen-core:8125
    const zenCoreUrl = `http://127.0.0.1:8125${c.req.path}`;
    return fetch(zenCoreUrl, {
        method: c.req.method,
        headers: c.req.raw.headers,
        body: c.req.raw.body,
    });
});
```

**删除文件**：

- `zen-swarm/src/graphBuilder.ts`
- `zen-swarm/src/api/trpc.ts`（迁入 zen-core）
- `zen-swarm/src/api/index.ts` 中所有路由（迁入 zen-core）
- `zen-swarm/src/config/loader.ts` 中的 AgentPackage 初始化

---

## 十二、进程生命周期管理

### 孤儿进程清理

zen-core 以 `detached: true` 启动后，需要防止孤儿进程积累：

```typescript
// zen-core/src/server.ts — PID 文件机制

import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const PID_FILE = join(homedir(), '.zen-code', 'zen-core.pid');

// 启动时：检查并杀死旧进程
if (existsSync(PID_FILE)) {
    const oldPid = parseInt(readFileSync(PID_FILE, 'utf8'));
    try {
        process.kill(oldPid, 'SIGTERM');
    } catch {
        /* 已退出 */
    }
}
writeFileSync(PID_FILE, String(process.pid));

// 退出时：清理 PID 文件
process.on('exit', () => {
    try {
        unlinkSync(PID_FILE);
    } catch {}
});
```

### 客户端 spawn 逻辑

```
zen-code 启动
  ↓
GET /health → 200?
  ├─ Yes → 检查版本兼容 → 连接
  └─ No  → 检查 PID 文件
              ├─ 有旧 PID → SIGTERM → 等待
              └─ spawn zen-core --port 8125
                   → poll /health (300ms 间隔, 10s 超时)
                   → 连接
```

### 多客户端场景

多个 zen-code 实例同时运行时，只有第一个负责 spawn，其他连接已运行的实例：

```
实例A: 启动 → spawn zen-core → 连接
实例B: 启动 → health check 200 → 直接连接（不重复 spawn）
```

**Agent 状态隔离**：通过 LangGraph 的 `thread_id` 隔离，每个会话独立，无冲突。

---

## 十三、package.json 设计

```json
{
    "name": "zen-core",
    "version": "1.0.0",
    "type": "module",
    "bin": {
        "zen-core": "./bin/zen-core.ts"
    },
    "scripts": {
        "start": "bun run src/server.ts",
        "dev": "bun --watch run src/server.ts"
    },
    "dependencies": {
        "@codegraph/agent": "workspace:^",
        "@codegraph/config": "workspace:^",
        "@langgraph-js/standard-agent": "workspace:^",
        "@langgraph-js/pure-graph": "^3.3.0",
        "@trpc/server": "^11",
        "hono": "^4",
        "zod": "^4"
    }
}
```

---

## 十四、根 package.json 新增命令

```json
{
    "scripts": {
        "dev:core": "cd zen-core && bun run dev",
        "dev:tui": "DEV=true bun run zen-code/src/cli.ts",
        "dev:swarm": "cd zen-swarm && bun run src/server.ts",
        "dev:all": "bun run dev:core & bun run dev:tui",
        "build:zen-core": "bun run --filter zen-core build"
    },
    "workspaces": [
        "packages/*",
        "zen-code",
        "zen-swarm",
        "zen-core" // 新增
    ]
}
```

---

## 十五、端口与环境变量

| 变量            | 默认值      | 说明                           |
| --------------- | ----------- | ------------------------------ |
| `ZEN_CORE_PORT` | `8125`      | zen-core 监听端口              |
| `ZEN_CORE_HOST` | `127.0.0.1` | 监听地址（生产可改 `0.0.0.0`） |

CLI 参数优先级高于环境变量：

```
bun zen-core/bin/zen-core.ts --port 9000
```

---

## 十六、实施顺序与依赖关系

```
Phase 1A: zen-core 基础框架（无业务逻辑）
  ├─ 创建目录 + package.json
  ├─ server.ts (Hono + /health)
  ├─ bootstrap.ts (AgentPackage + ConfigManager 初始化)
  └─ langgraph/handler.ts (registerGraph 'code')

Phase 1B: tRPC 路由实现
  ├─ router.ts + context.ts
  ├─ routes/config.ts    ← 直接复用 ConfigManager API
  ├─ routes/models.ts    ← 迁移 useModels.ts 中的 provider fetch 逻辑
  ├─ routes/skills.ts    ← 直接复用 FileSystemSkillStore
  ├─ routes/tasks.ts     ← 直接复用 task store
  ├─ routes/history.ts   ← 直接复用 history store
  ├─ routes/agents.ts    ← 直接复用 agentPackage.listAgents()
  ├─ routes/providers.ts ← 直接复用 configManager.getConfig().providers
  ├─ routes/knowledge.ts ← 聚合 memories + skills
  └─ routes/processes.ts ← ProcessManager 迁移

Phase 2A: union-client 连接工具
  └─ packages/union-client/src/zen-core-client.ts

Phase 2B: zen-code 适配
  ├─ cli.ts (connectToZenCore)
  ├─ ZenCoreContext.tsx (新增)
  ├─ Chat.tsx (apiUrl 改为动态)
  ├─ SettingsContext.tsx (去除 createFSManager)
  ├─ hooks/useConfig.ts (改用 trpc)
  ├─ hooks/useModels.ts (改用 trpc)
  ├─ hooks/useSkills.ts (改用 trpc)
  ├─ hooks/useTasks.ts (改用 trpc)
  ├─ hooks/useHistory.ts (改用 trpc)
  ├─ hooks/useAgents.ts (改用 trpc)
  ├─ hooks/useProviders.ts (改用 trpc)
  └─ nonInteractive.ts (改用 LangGraph SDK)

Phase 3: zen-swarm 适配（后续）
  ├─ server.ts 简化为代理模式
  └─ 删除冗余后端代码
```

---

## 十七、风险点与缓解策略

| 风险                    | 影响                                 | 缓解                                                    |
| ----------------------- | ------------------------------------ | ------------------------------------------------------- |
| 冷启动延迟 (2-5s)       | 首次启动体验差                       | cli.ts 显示 "Starting zen-core..." spinner              |
| 版本不匹配              | API 调用失败                         | /health 返回 version，客户端校验后提示重启              |
| 孤儿进程                | 端口占用、内存泄露                   | PID 文件 + 启动时检测并 SIGTERM 旧进程                  |
| cwd 隔离                | 多 workspace 串话                    | tRPC 请求中携带 `cwd` 参数，Agent state 注入            |
| zen-code tRPC 类型引用  | 编译依赖 zen-core                    | 在 monorepo tsconfig 中将 zen-core 加入 references      |
| ProcessManager 状态丢失 | 进程重启后 background_processes 清空 | Phase 1 可接受（与现状一致），Phase 2 再持久化到 SQLite |

---

## 十八、与现有 specs 的关系

| 文档                               | 关联点                                                        |
| ---------------------------------- | ------------------------------------------------------------- |
| `specs/unified-agent-core-spec.md` | AgentPackage 配置系统，zen-core bootstrap 直接复用            |
| `specs/process-manager-gc.md`      | ProcessManager GC 机制，迁移到 zen-core `routes/processes.ts` |
| `specs/zen-tunnel.md`              | 未来 zen-core 可作为 tunnel 的本地端点                        |
| `Arch.md`                          | createUnifiedAgent 调用链保持不变，zen-core 只是 HTTP 包装层  |
