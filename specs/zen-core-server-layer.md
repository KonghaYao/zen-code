# zen-core 统一服务层规划

> 状态: 规划中  
> 日期: 2026-03-13  
> 相关文档: Arch.md, specs/unified-agent-core-spec.md

---

## 背景与动机

当前 zen-code（TUI）和 zen-swarm（Web UI）各自内嵌了重复的后端逻辑：

- **zen-swarm/server.ts**: LangGraph + tRPC + Hono 服务器（端口 8124）
- **packages/agent/**: Agent 执行引擎（两个客户端各自初始化）
- **packages/config/**: ConfigServer（两个客户端各自启动）

这导致：

1. 同一台机器上运行两个客户端时，资源浪费（双份 Agent 实例、双份 MCP 连接）
2. 配置状态不同步（各自持有独立 ConfigManager）
3. 代码重复，维护成本高

**解决方案**：提取统一服务层 **zen-core**，zen-code 和 zen-swarm 均作为纯客户端连接它。

---

## 架构概览

```
┌─────────────────────────────────────────────────┐
│                  CLIENT LAYER                    │
│                                                  │
│  zen-code (TUI)          zen-swarm (Web UI)      │
│  ├─ React/Ink UI         ├─ React/Vite 前端       │
│  ├─ TanStack Query       ├─ TanStack Query        │
│  └─ zen-core client      └─ zen-core client      │
│       ↓ health check          ↓ health check     │
│       ↓ auto-spawn            ↓ connect          │
├─────────────────────────────────────────────────┤
│              zen-core (独立守护进程)               │
│              端口: 8125 (可配置)                  │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  tRPC Router (/api/trpc)                 │   │
│  │  LangGraph API (/api/langgraph)          │   │
│  │  Health Check (/health)                  │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌─────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ Agent 引擎  │  │ ConfigMgr  │  │ Cron调度 │ │
│  │ LangGraph   │  │ settings   │  │ 定时任务 │ │
│  └─────────────┘  └────────────┘  └──────────┘ │
│                                                  │
│  ┌─────────────┐  ┌────────────┐               │
│  │ MCP Manager │  │ SQLite DB  │               │
│  │ 连接 & 缓存 │  │ 历史/任务  │               │
│  └─────────────┘  └────────────┘               │
└─────────────────────────────────────────────────┘
```

---

## zen-core 目录结构

```
zen-core/
├── package.json
├── tsconfig.json
├── src/
│   ├── server.ts          # 主入口，Hono + Bun.serve
│   ├── router.ts          # tRPC 路由聚合
│   ├── health.ts          # /health 端点
│   ├── routes/
│   │   ├── config.ts      # 配置 CRUD
│   │   ├── tasks.ts       # 任务管理
│   │   ├── agents.ts      # Agent 列表/配置
│   │   ├── models.ts      # 模型列表
│   │   ├── history.ts     # 聊天历史
│   │   └── cron.ts        # Cron 任务
│   ├── langgraph/
│   │   └── handler.ts     # /api/langgraph 流式处理
│   └── bootstrap.ts       # 服务初始化（agentPackage、configManager 等）
├── bin/
│   └── zen-core.ts        # CLI 入口（bun run）
└── dist/                  # 构建产物
```

---

## 通信协议

### 1. tRPC over HTTP (`/api/trpc`)

用于配置管理、任务操作、Agent 信息查询等非流式交互：

```typescript
// 客户端示例
import { createTRPCClient } from '@trpc/client';

const client = createTRPCClient<AppRouter>({
    url: 'http://localhost:8125/api/trpc',
});

await client.config.get.query();
await client.tasks.list.query();
```

**路由分组**：

- `config.*` — 读写 settings.json、环境变量同步
- `tasks.*` — 任务 CRUD、状态更新
- `agents.*` — Agent 列表、配置
- `models.*` — 模型列表（带超时重试）
- `history.*` — 聊天历史
- `cron.*` — Cron 任务管理
- `skills.*` — Skills 读写
- `knowledge.*` — Memories + Skills 聚合

### 2. LangGraph 原生协议 (`/api/langgraph`)

用于流式 Agent 对话，保持与现有 LangGraph SDK 的兼容性：

```
POST /api/langgraph/runs/stream
GET  /api/langgraph/threads/:threadId
```

---

## 客户端连接策略

### 两类客户端

zen-core 对外暴露两种独立的客户端，职责不同：

| 客户端            | 类型                           | 用途                                    |
| ----------------- | ------------------------------ | --------------------------------------- |
| `trpcClient`      | tRPC client                    | 配置、任务、模型、Skills 等 CRUD 操作   |
| `langGraphClient` | LangGraph SDK (`ChatProvider`) | 流式 Agent 对话，`apiUrl` 指向 zen-core |

```typescript
// packages/union-client/src/zen-core-client.ts

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from 'zen-core/src/router';

export interface ZenCoreConnection {
    trpc: ReturnType<typeof createTRPCClient<AppRouter>>;
    apiUrl: string; // 供 ChatProvider 使用
}

export async function connectToZenCore(port = 8125): Promise<ZenCoreConnection> {
    const baseUrl = `http://127.0.0.1:${port}`;

    // 1. health check
    const isRunning = await healthCheck(baseUrl);

    if (!isRunning) {
        // 2. auto-spawn
        await spawnZenCore(port);
        await waitForReady(baseUrl, { timeout: 10000 });
    }

    // 3. 返回两类客户端
    return {
        trpc: createTRPCClient<AppRouter>({
            links: [httpBatchLink({ url: `${baseUrl}/api/trpc` })],
        }),
        apiUrl: baseUrl, // ChatProvider apiUrl
    };
}
```

### zen-code 集成点

```typescript
// zen-code/src/cli.ts
const { trpc, apiUrl } = await connectToZenCore();
render(<Chat trpc={trpc} apiUrl={apiUrl} />);

// zen-code/src/chat/Chat.tsx
<ChatProvider apiUrl={apiUrl} defaultAgent="code" ...>

// zen-code hooks 示例
// useConfig.ts
const config = await trpc.config.get.query();
```

---

## 功能迁移计划

> **优先顺序**：先迁移 zen-code，再扩展到 zen-swarm。

---

### Phase 1: zen-core 基础服务（对应 zen-code 需求）

zen-code 当前直接依赖的后端能力：

| zen-code 调用点                                  | 当前实现                    | 迁移目标                    |
| ------------------------------------------------ | --------------------------- | --------------------------- |
| `nonInteractive.ts` → `graph.invoke()`           | 直接导入 `@codegraph/agent` | zen-core `/api/langgraph`   |
| `Chat.tsx` → `ChatProvider apiUrl=8123`          | 依赖旧 LangGraph 服务器     | zen-core `/api/langgraph`   |
| `useConfig` hook                                 | 直接读 `@codegraph/config`  | zen-core tRPC `config.*`    |
| `useModels` hook                                 | 直接读 `@codegraph/agent`   | zen-core tRPC `models.*`    |
| `useSkills` hook                                 | 直接读文件系统              | zen-core tRPC `skills.*`    |
| `useTasks` hook                                  | 直接读 SQLite               | zen-core tRPC `tasks.*`     |
| `useHistory` hook                                | 直接读 SQLite               | zen-core tRPC `history.*`   |
| `useAgents` hook                                 | 直接读 `@codegraph/agent`   | zen-core tRPC `agents.*`    |
| `useProviders` hook                              | 直接读 `@codegraph/config`  | zen-core tRPC `providers.*` |
| `ProcessManagerService` → `background_processes` | 进程内共享内存 Map          | zen-core tRPC `processes.*` |

**任务清单**：

- [ ] 创建 `zen-core/` 顶层目录和 `package.json`
- [ ] 实现 Hono 服务器入口 `zen-core/src/server.ts`（端口 8125）
- [ ] 实现 `/health` 端点（返回版本号）
- [ ] 迁移 ConfigServer → zen-core tRPC `config` 路由
- [ ] 迁移 LangGraph Agent 执行引擎 → `/api/langgraph`（保持 LangGraph SDK 协议兼容）
- [ ] 迁移 MCP 连接管理（MCPManager 单例移入 zen-core）
- [ ] 迁移 SQLite 持久化（任务、历史）→ zen-core 统一管理
- [ ] 实现 tRPC 路由：`models`, `skills`, `tasks`, `history`, `agents`, `providers`, `processes`

### Phase 2: zen-code 客户端适配

- [ ] 在 `packages/union-client/` 新增 `zen-core-client.ts`：
    - health check (`GET /health`)
    - auto-spawn（`Bun.spawn` zen-core，`detached: true`）
    - 等待就绪（轮询 `/health`，超时 10s）
- [ ] `zen-code/src/cli.ts`：启动前调用 `connectToZenCore()`
- [ ] `zen-code/src/chat/Chat.tsx`：`ChatProvider apiUrl` 改为 `http://127.0.0.1:8125`
- [ ] `zen-code/src/nonInteractive.ts`：移除 `graph.invoke()` 直接调用，改为 HTTP 请求 zen-core
- [ ] 更新所有 TanStack Query hooks（`useConfig`, `useModels`, `useSkills` 等）的底层 API 地址指向 zen-core tRPC
- [ ] `ProcessManagerService`：改为通过 zen-core tRPC `processes.*` 路由查询

### Phase 3: zen-swarm 客户端适配（后续）

- [ ] zen-swarm 后端逻辑删除（迁移已在 Phase 1 完成）
- [ ] zen-swarm 前端改为 API 代理模式，转发 `/api/*` 到 zen-core:8125
- [ ] 删除 `zen-swarm/src/router.ts`、`graphBuilder.ts` 等后端代码

### Phase 4: 清理

- [ ] 删除 zen-code 中已迁移的内嵌服务逻辑（`@codegraph/agent` 直接导入）
- [ ] 更新 monorepo 构建脚本（新增 `dev:core`、`build:zen-core`）
- [ ] 更新 `CLAUDE.md` 开发命令说明

---

## 端口配置

| 服务                   | 旧端口 | 新端口   | 备注       |
| ---------------------- | ------ | -------- | ---------- |
| zen-core               | —      | **8125** | 新统一服务 |
| zen-swarm（旧后端）    | 8124   | 废弃     | 迁移后关闭 |
| LangGraph server（旧） | 8123   | 废弃     | 已废弃     |

端口可通过环境变量 `ZEN_CORE_PORT=8125` 或 CLI 参数 `--port` 覆盖。

---

## 影响范围

### 新增

- `zen-core/` — 统一服务进程
- `packages/union-client/src/zen-core-client.ts` — 连接/spawn 客户端逻辑

### 修改

- `zen-code/src/cli.ts` — 使用 zen-core client 替代直接初始化
- `zen-swarm/src/server.ts` — 简化为前端服务 + API 代理
- `packages/union-client/` — 新增 zen-core 连接工具

### 废弃

- `zen-swarm/src/router.ts`（tRPC 路由迁移到 zen-core）
- `zen-swarm/src/graphBuilder.ts`（LangGraph 逻辑迁移到 zen-core）

---

## 风险与注意事项

1. **进程生命周期**：zen-core 以 `detached` 模式 spawn，需考虑孤儿进程清理机制
2. **多客户端并发**：多个 zen-code 实例连接同一 zen-core，需确保 Agent 状态隔离（按 threadId）
3. **冷启动延迟**：首次 spawn zen-core 约需 2-5s，客户端需显示加载状态
4. **版本兼容**：zen-core 与客户端版本需保持兼容，建议通过 `/health` 返回版本号验证
5. **权限隔离**：zen-core 的工作目录（`cwd`）应由连接的客户端传入，不能固定
