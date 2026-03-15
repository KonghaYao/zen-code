# SQLite 存储迁移：zen-core → zen-swarm

> 状态: 规划中  
> 日期: 2026-03-15  
> 参考: `zen-core/STORAGE_DEPS.md`, `specs/zen-core-detailed-design.md`

---

## 背景与动机

### 当前问题

zen-core 在设计上定位为**轻量、稳定的 Agent 执行引擎**，应仅依赖文件系统存储（FS）。但现实中 zen-core 的 `bootstrap.ts`
初始化了大量 SQLite 存储：

```
~/.zen-core/data.db
  ├── models / prompts / prompt_versions / middlewares / agents / agent_middlewares
  ├── mcp_config
  ├── workspaces
  ├── cron_tasks / cron_logs
  ├── providers
  └── remote_stores
```

这带来以下风险：

1. **稳定性风险**：SQLite 写入可能因并发/崩溃导致 WAL 损坏，直接影响 Agent 执行
2. **职责混乱**：zen-core 既管 Agent 运行时，又管用户配置数据（provider、workspace、cron 等）
3. **共享数据库污染**：zen-swarm 的 `server.ts` 已在直接打开同一个 `data.db` 操作 `providers` 和
   `remote_stores`，出现跨进程写同一 SQLite 的情况
4. **冷启动复杂**：zen-core 启动时需初始化 6 个 SQLite 存储类，增加启动时间与失败面

### 目标状态

```
zen-core  → 只依赖 FS 存储（AgentPackage MemoryStorage + ConfigManager + TaskStore）
zen-swarm → 持有全部 SQLite 存储，通过本地 tRPC 路由暴露 CRUD API
```

zen-swarm 本身就是"用户交互层"，天然适合持有用户配置数据（provider、workspace、mcp、cron 等）。

---

## 迁移范围

### 需要迁出 zen-core 的 SQLite 存储

| 存储类                                    | SQLite 表                                                                            | 当前位置                                   | 迁移目标                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `BunSqliteStorage`（via `MergedStorage`） | `models`, `prompts`, `prompt_versions`, `middlewares`, `agents`, `agent_middlewares` | `zen-core/src/storage/merged.ts`           | 迁至 zen-swarm，暴露为 `/api/trpc/agents.*` `/api/trpc/prompts.*` `/api/trpc/middlewares.*` 本地路由 |
| `ZenSwarmMcpStorage`                      | `mcp_config`                                                                         | `zen-core/src/config/storage.ts`           | 还原到 zen-swarm，已有旧实现 `zen-swarm/src/api/mcp.ts`                                              |
| `WorkspaceStorage`                        | `workspaces`                                                                         | `zen-core/src/config/workspace-storage.ts` | 还原到 zen-swarm，已有旧实现 `zen-swarm/src/api/workspaces.ts`                                       |
| `CronStorage` + `CronScheduler`           | `cron_tasks`, `cron_logs`                                                            | `zen-core/src/cron/`                       | 还原到 zen-swarm，已有旧实现 `zen-swarm/src/cron/` + `zen-swarm/src/api/cron.ts`                     |
| `ProviderStorage`                         | `providers`                                                                          | `zen-core/src/services/provider/`          | zen-swarm 已有完整实现 `zen-swarm/src/services/provider/`                                            |
| `RemoteStoreStorage`                      | `remote_stores`                                                                      | `zen-core/src/services/remote-store/`      | zen-swarm 已有完整实现，`zen-swarm/src/api/store.ts`                                                 |

### 保留在 zen-core 的 FS 存储（不动）

| 存储类                                    | 类型 | 说明                                   |
| ----------------------------------------- | ---- | -------------------------------------- |
| `ConfigManager`（`@codegraph/config`）    | FS   | `~/.zen-code/settings.json`，保留      |
| `TaskStoreManager`（`@codegraph/config`） | FS   | 项目 `.tasks/`，保留                   |
| `AgentPackage` with `MemoryStorage`       | 内存 | 内置默认 Agent/Prompt/Middleware，保留 |

---

## 目标架构

### 迁移后 zen-core bootstrap

```typescript
// zen-core/src/bootstrap.ts（迁移后）
export interface ZenCoreServices {
    agentPackage: AgentPackage; // MemoryStorage（内置默认值）
    configManager: ConfigManager; // FS: ~/.zen-code/settings.json
    taskStore: TaskStoreManager; // FS: .tasks/
    // ✅ 不再有 sharedDb、各类 SQLite 存储类
}
```

### 迁移后 zen-swarm bootstrap

zen-swarm 拥有独立的 `~/.zen-swarm/data.db`（不再复用 `~/.zen-core/data.db`）：

```typescript
// zen-swarm/src/bootstrap.ts（新增）
export interface ZenSwarmLocalServices {
    db: Database; // ~/.zen-swarm/data.db
    mergedStorage: MergedStorage; // agents/prompts/middlewares（SQLite + MemoryStorage）
    mcpStorage: ZenSwarmMcpStorage; // mcp_config
    workspaceStorage: WorkspaceStorage; // workspaces
    cronStorage: CronStorage; // cron_tasks / cron_logs
    cronScheduler: CronScheduler; // 调度器（进程内）
    providerStorage: ProviderStorage; // providers
    remoteStoreStorage: RemoteStoreStorage; // remote_stores
}
```

### 路由归属变化

| tRPC 路由       | 迁移前归属               | 迁移后归属                              |
| --------------- | ------------------------ | --------------------------------------- |
| `agents.*`      | zen-core（代理无需绕过） | **zen-swarm 本地**（不转发到 zen-core） |
| `prompts.*`     | zen-core（代理无需绕过） | **zen-swarm 本地**                      |
| `middlewares.*` | zen-core（代理无需绕过） | **zen-swarm 本地**                      |
| `mcp.*`         | zen-core（代理无需绕过） | **zen-swarm 本地**                      |
| `workspaces.*`  | zen-core（代理无需绕过） | **zen-swarm 本地**                      |
| `cron.*`        | zen-core（代理无需绕过） | **zen-swarm 本地**                      |
| `providers.*`   | zen-swarm 本地（已是）   | 保持不变                                |
| `store.*`       | zen-swarm 本地（已是）   | 保持不变                                |
| `config.*`      | zen-core → 代理          | 保持不变（zen-core FS）                 |
| `skills.*`      | zen-core → 代理          | 保持不变（zen-core FS）                 |
| `tasks.*`       | zen-core → 代理          | 保持不变（zen-core FS）                 |
| `models.*`      | zen-core → 代理          | 保持不变（zen-core FS + 网络）          |
| `knowledge.*`   | zen-core → 代理          | 保持不变（zen-core FS）                 |

---

## 详细迁移步骤

### Step 1：在 zen-swarm 中创建 `bootstrap.ts`

新建 `zen-swarm/src/bootstrap.ts`，集中初始化所有本地 SQLite 存储：

```typescript
// zen-swarm/src/bootstrap.ts
import Database from 'bun:sqlite';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync } from 'fs';
import { AgentPackage, MemoryStorage } from '@langgraph-js/standard-agent';
import { BunSqliteStorage } from '@langgraph-js/standard-agent/storage/sqlite';
import { loadDefaultConfigs } from '@codegraph/agent/src/';
import { MergedStorage } from 'zen-core/src/storage/merged.js'; // 或复制到 zen-swarm/src/storage/
import { ZenSwarmMcpStorage } from './config/storage.js';
import { WorkspaceStorage } from './config/workspace-storage.js';
import { CronStorage } from './cron/storage.js';
import { CronScheduler } from './cron/scheduler.js';
import { CronExecutor } from './cron/executor.js';
import { ProviderStorage } from './services/provider/storage.js';
import { RemoteStoreStorage } from './services/remote-store/index.js';

export interface ZenSwarmLocalServices {
    db: Database;
    mergedStorage: MergedStorage;
    mcpStorage: ZenSwarmMcpStorage;
    workspaceStorage: WorkspaceStorage;
    cronStorage: CronStorage;
    cronScheduler: CronScheduler;
    providerStorage: ProviderStorage;
    remoteStoreStorage: RemoteStoreStorage;
}

let _services: ZenSwarmLocalServices | null = null;

export async function bootstrapLocal(): Promise<ZenSwarmLocalServices> {
    if (_services) return _services;

    const dbDir = join(homedir(), '.zen-swarm');
    mkdirSync(dbDir, { recursive: true });

    const db = new Database(join(dbDir, 'data.db'), { create: true });
    db.run('PRAGMA foreign_keys = ON');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA busy_timeout = 5000');

    // AgentPackage（内置默认值，仅用于 MergedStorage base）
    const basePkg = await loadDefaultConfigs();
    const dbStorage = new BunSqliteStorage(db);
    await dbStorage.initialize();
    const mergedStorage = new MergedStorage(basePkg.storage as MemoryStorage, dbStorage);

    const mcpStorage = new ZenSwarmMcpStorage(db);
    await mcpStorage.initialize();

    const workspaceStorage = new WorkspaceStorage(db);
    await workspaceStorage.initialize();

    const providerStorage = new ProviderStorage(db);
    await providerStorage.initialize();

    const remoteStoreStorage = new RemoteStoreStorage(db);
    await remoteStoreStorage.initialize();

    const cronStorage = new CronStorage(db);
    await cronStorage.initialize();

    const PORT = Number(process.env.ZEN_CORE_PORT || 8125);
    const cronExecutor = new CronExecutor(cronStorage, {
        apiBaseUrl: `http://127.0.0.1:${PORT}`,
        maxExecutionTime: 10 * 60 * 1000,
    });
    const cronScheduler = new CronScheduler(cronStorage, cronExecutor);
    await cronScheduler.start();

    _services = {
        db,
        mergedStorage,
        mcpStorage,
        workspaceStorage,
        cronStorage,
        cronScheduler,
        providerStorage,
        remoteStoreStorage,
    };
    return _services;
}
```

**数据库路径**：`~/.zen-swarm/data.db`（不再共享 `~/.zen-core/data.db`）

### Step 2：`MergedStorage` 迁移

`MergedStorage` 当前位于 `zen-core/src/storage/merged.ts`。  
由于它不依赖 zen-core 特有模块，直接**复制**到 `zen-swarm/src/storage/merged.ts`，或提取到 `packages/standard-agent/`
中供两者共用（推荐）。

**推荐方案**：移动到 `packages/standard-agent/src/storage/merged.ts`，从 zen-swarm 导入。

### Step 3：zen-swarm `server.ts` 接入本地路由

在 `zen-swarm/src/server.ts` 的 `startServer()` 中：

1. 调用 `bootstrapLocal()` 获取本地服务实例
2. 将 `agents`、`prompts`、`middlewares`、`mcp`、`workspaces`、`cron` 路由注册为本地 tRPC，不转发到 zen-core
3. 更新代理规则：上述路由前缀**排除**在 `/api/*` 代理之外

```typescript
// zen-swarm/src/server.ts（关键修改）

const localServices = await bootstrapLocal();

// 本地 tRPC 路由（不走代理）
const localTrpcRouter = router({
    agents: createAgentsRouter(localServices.mergedStorage, localServices.agentPackage),
    prompts: createPromptsRouter(localServices.mergedStorage),
    middlewares: createMiddlewaresRouter(localServices.mergedStorage),
    mcp: createMcpRouter(localServices.mcpStorage),
    workspaces: createWorkspacesRouter(localServices.workspaceStorage),
    cron: createCronRouter(localServices.cronStorage, localServices.cronScheduler, localServices.mergedStorage),
    providers: createProviderRouter(localServices.providerStorage, { getAllModels }),
    store: createStoreRouter(localServices.remoteStoreStorage),
    postman: createPostmanRouter(postmanStorage),
    files: filesRouter,
});

// 统一本地 tRPC 入口（替换现有分散的 /api/trpc/xxx.* 匹配）
app.all('/api/trpc/*', (c) => {
    // 先尝试本地路由，找不到路由时才代理到 zen-core
    return fetchRequestHandler({
        endpoint: '/api/trpc',
        req: c.req.raw,
        router: localTrpcRouter,
        createContext: () => ({ ...localServices }),
        onError: ({ error }) => {
            // NOT_FOUND 时透传到 zen-core
        },
    });
});
```

> **注意**：由于 tRPC 在路由 key 不存在时会返回 `NOT_FOUND` 而不是
> `undefined`，可以通过"先本地匹配，再代理"的两段逻辑实现，或直接在一个 unified router 中聚合所有路由。

**推荐方案**：构建一个 `FullLocalRouter` 把本地路由和 zen-core 代理路由分开匹配，保持现有 zen-core 代理作为 fallback。

### Step 4：zen-core `bootstrap.ts` 瘦身

删除以下依赖，仅保留 FS 存储：

```typescript
// zen-core/src/bootstrap.ts（迁移后删除项）
- import Database from 'bun:sqlite';
- import { BunSqliteStorage } from '@langgraph-js/standard-agent/storage/sqlite';
- import { MergedStorage } from './storage/merged.js';
- import { ZenSwarmMcpStorage } from './config/storage.js';
- import { setMcpConfigStorage } from './config/mcpProvider.js';
- import { WorkspaceStorage } from './config/workspace-storage.js';
- import { CronStorage } from './cron/storage.js';
- import { CronScheduler } from './cron/scheduler.js';
- import { CronExecutor } from './cron/executor.js';
- import { ProviderStorage } from './services/provider/index.js';
- import { RemoteStoreStorage } from './services/remote-store/index.js';
```

`ZenCoreServices` 接口精简为：

```typescript
export interface ZenCoreServices {
    agentPackage: AgentPackage; // MemoryStorage（内置默认值，只读）
    configManager: ConfigManager; // FS
    taskStore: TaskStoreManager; // FS
}
```

### Step 5：zen-core 路由清理

删除以下路由文件（对应功能迁到 zen-swarm 本地）：

| 删除文件                             | 对应 zen-swarm 本地路由                               |
| ------------------------------------ | ----------------------------------------------------- |
| `zen-core/src/routes/agents.ts`      | `zen-swarm/src/api/agents.ts`（已有旧实现，更新即可） |
| `zen-core/src/routes/prompts.ts`     | `zen-swarm/src/api/prompts.ts`（已有旧实现）          |
| `zen-core/src/routes/middlewares.ts` | `zen-swarm/src/api/middlewares.ts`（已有旧实现）      |
| `zen-core/src/routes/mcp.ts`         | `zen-swarm/src/api/mcp.ts`（已有旧实现）              |
| `zen-core/src/routes/workspaces.ts`  | `zen-swarm/src/api/workspaces.ts`（已有旧实现）       |
| `zen-core/src/routes/cron.ts`        | `zen-swarm/src/api/cron.ts`（已有旧实现）             |

保留路由（zen-core FS 依赖）：

- `zen-core/src/routes/config.ts`
- `zen-core/src/routes/skills.ts`
- `zen-core/src/routes/tasks.ts`
- `zen-core/src/routes/models.ts`
- `zen-core/src/routes/knowledge.ts`
- `zen-core/src/routes/processes.ts`

同步更新 `zen-core/src/router.ts`，移除已删除路由的导入和注册。

### Step 6：zen-core 目录清理

删除以下目录和文件（SQLite 相关）：

```
zen-core/src/
  ├── storage/merged.ts         ← 删除（迁到 packages/standard-agent 或 zen-swarm）
  ├── config/storage.ts         ← 删除（ZenSwarmMcpStorage）
  ├── config/mcpProvider.ts     ← 删除（setMcpConfigStorage）
  ├── config/workspace-storage.ts ← 删除
  ├── cron/                     ← 整个目录删除（迁到 zen-swarm）
  └── services/                 ← 整个目录删除（provider + remote-store）
```

### Step 7：MCP 运行时解耦

当前 zen-core 通过 `setMcpConfigStorage` + `mcpProvider.ts`
让 Agent 运行时读取 MCP 配置。迁移后，MCP 配置由 zen-swarm 持有，需要一个新的**读取接口**：

**方案**：zen-core Agent 在执行时通过调用 zen-swarm 的 `/api/trpc/mcp.getEnabled`
动态获取 MCP 配置，或在 zen-swarm 启动 zen-core 之前通过**环境变量/启动参数**将 MCP 配置注入。

**推荐方案**：zen-core 提供一个 `GET /api/mcp-config` 端点，zen-swarm 在启动后将 MCP 配置通过 HTTP
POST 推送给 zen-core，zen-core 存入**进程内内存**（不写 SQLite）：

```
zen-swarm 启动
  ↓
bootstrapLocal() → 初始化 mcpStorage
  ↓
connectToZenCore() → zen-core 就绪
  ↓
POST /api/mcp-sync → 将已启用 MCP 配置推送到 zen-core 内存
  ↓
用户修改 MCP 配置 → zen-swarm mcpStorage 写入 + POST /api/mcp-sync 再次推送
```

zen-core 侧新增轻量端点：

```typescript
// zen-core/src/routes/mcp-sync.ts
let _mcpConfigInMemory: Record<string, any> = {};

app.post('/api/mcp-sync', async (c) => {
    _mcpConfigInMemory = await c.req.json();
    // 触发 MCPManager 重新连接
    await mcpManager.reloadConfig(_mcpConfigInMemory);
    return c.json({ ok: true });
});

export function getMcpConfig() {
    return _mcpConfigInMemory;
}
```

### Step 8：CronScheduler 对 zen-core 的依赖处理

`CronExecutor` 当前通过 HTTP 调用 `http://127.0.0.1:8125/api/langgraph`
触发 Agent 执行，这个依赖**保持不变**（zen-core 依然提供 LangGraph 执行端点）。

无需修改，只需确保 zen-swarm 在 zen-core 就绪后再启动 `cronScheduler`（当前已是如此）。

---

## 影响范围

### 新增

- `zen-swarm/src/bootstrap.ts` — 本地 SQLite 服务初始化
- `zen-swarm/src/storage/merged.ts`（或从 `packages/standard-agent` 导入）
- `zen-core/src/routes/mcp-sync.ts` — MCP 配置内存推送端点

### 修改

- `zen-swarm/src/server.ts` — 接入 `bootstrapLocal()`，注册更多本地路由，去掉直接 open `~/.zen-core/data.db`
- `zen-swarm/src/api/agents.ts` — 改为使用 `MergedStorage` 而非旧实现
- `zen-swarm/src/api/prompts.ts` — 同上
- `zen-swarm/src/api/middlewares.ts` — 同上
- `zen-swarm/src/api/mcp.ts` — 接入 `/api/mcp-sync` 推送逻辑
- `zen-core/src/bootstrap.ts` — 删除所有 SQLite 相关初始化
- `zen-core/src/router.ts` — 移除 agents/prompts/middlewares/mcp/workspaces/cron 路由
- `zen-core/src/context.ts` — 精简 `ZenCoreContext`

### 删除

- `zen-core/src/storage/merged.ts`
- `zen-core/src/config/storage.ts`
- `zen-core/src/config/mcpProvider.ts`
- `zen-core/src/config/workspace-storage.ts`
- `zen-core/src/cron/` — 整个目录
- `zen-core/src/services/` — 整个目录
- `zen-core/src/routes/agents.ts`
- `zen-core/src/routes/prompts.ts`
- `zen-core/src/routes/middlewares.ts`
- `zen-core/src/routes/mcp.ts`
- `zen-core/src/routes/workspaces.ts`
- `zen-core/src/routes/cron.ts`

---

## 风险与缓解

| 风险                                                | 影响                      | 缓解                                                                                                           |
| --------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| zen-code（TUI）也调用了 agents/prompts 等路由       | TUI 用户看不到 agent 列表 | zen-code 的这些路由通过 zen-swarm 代理即可（zen-code → zen-swarm → 本地），或 zen-code 直接访问 zen-swarm 端口 |
| CronExecutor 依赖 zen-core LangGraph 端点           | 无影响                    | CronExecutor 仍向 zen-core 8125 发请求，zen-core 仍提供 `/api/langgraph`                                       |
| MCP 配置改变后 zen-core 不感知                      | MCP 工具不可用            | Step 7 的 mcp-sync 推送机制保证实时同步                                                                        |
| 旧数据库数据丢失                                    | 用户历史配置无法直接沿用  | 本次不做自动迁移，`~/.zen-swarm/data.db` 全新建表；用户需重新配置 provider/workspace/mcp/cron 等               |
| zen-swarm 未启动时 zen-code 无法操作 agents/prompts | TUI 功能受限              | zen-code 已通过 ZenCoreContext 连接 zen-core；agents/prompts 功能仅在 zen-swarm 打开时完整可用——当前已是此行为 |
| MergedStorage 放置位置决策                          | 编译依赖关系              | 推荐提取到 `packages/standard-agent`，避免 zen-swarm 依赖 zen-core 源码                                        |

---

## 实施顺序

```
Phase A：准备（不破坏现有功能）
  A1. MergedStorage 迁移到 packages/standard-agent/src/storage/merged.ts
  A2. 创建 zen-swarm/src/bootstrap.ts
  A3. 实现 zen-core/src/routes/mcp-sync.ts（内存推送端点）

Phase B：zen-swarm 接管 SQLite（并行可用）
  B1. zen-swarm server.ts 接入 bootstrapLocal()
  B2. 将 agents/prompts/middlewares/mcp/workspaces/cron 注册为 zen-swarm 本地路由
  B3. 验证 zen-swarm 前端功能正常（agents、prompts、mcp、workspace、cron 面板）

Phase C：zen-core 瘦身
  C1. 删除 zen-core/src/routes/agents.ts 等 6 个路由文件
  C2. 精简 zen-core/src/bootstrap.ts（删除 SQLite 相关）
  C3. 删除 zen-core 中的 storage/、cron/、services/ 目录
  C4. 删除 zen-core 对 bun:sqlite、BunSqliteStorage 的依赖

Phase D：验证与清理
  D1. 完整功能回归测试（zen-code TUI + zen-swarm Web UI）
  D2. 更新 CLAUDE.md、zen-core/STORAGE_DEPS.md
```

---

## 最终状态验证

迁移完成后，`zen-core/src/bootstrap.ts` 不应出现以下字符串：

- `bun:sqlite`
- `BunSqliteStorage`
- `MergedStorage`
- `CronStorage`
- `ProviderStorage`
- `WorkspaceStorage`
- `ZenSwarmMcpStorage`
- `RemoteStoreStorage`

可通过以下命令验证：

```bash
grep -r "sqlite\|SqliteStorage\|CronStorage\|ProviderStorage\|WorkspaceStorage\|McpStorage\|RemoteStore" zen-core/src/
# 期望：无输出
```
