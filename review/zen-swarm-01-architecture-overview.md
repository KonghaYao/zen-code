# Zen Swarm 架构总览评审

**日期**: 2026-03-05 **版本**: 基于当前 main 分支 **范围**: `zen-swarm/` 全目录 (~113 TS 文件, ~17,000 行)

---

## 1. 整体架构评价

### 优点

- **关注点分离清晰**: 后端 (Bun+Hono+tRPC)、图执行 (LangGraph)、前端 (React+Zustand) 职责明确
- **依赖注入一致**: `createMergedRouter(sm, smDb, providerStorage)` 模式贯穿 tRPC 层
- **单一启动入口**: `loader.ts` 集中初始化所有单例，避免模块间循环依赖
- **WAL 模式已启用**: `PRAGMA journal_mode = WAL` 提升 SQLite 并发读性能

### 主要问题

#### P0 — 数据库连接重复开启

```typescript
// loader.ts:20
const sharedDb = new Database('./data/index.db', { create: true });

// loader.ts:25
const agentStorage = new BunSqliteStorage('./data/index.db'); // 第二个连接

// loader.ts:29
const mcpStorage = new ZenSwarmMcpStorage('./data/index.db'); // 第三个连接

// loader.ts:45
const providerStorage = new ProviderStorage('./data/index.db'); // 第四个连接

// loader.ts:62
export const cronStorage = new CronStorage('./data/index.db'); // 第五个连接
```

五个独立连接指向同一个 SQLite 文件。WAL 模式允许并发读，但写操作仍会串行等锁。更大的风险是各存储类各自维护 PRAGMA 设置，可能导致外键约束在某些连接上未生效。

**建议**: 将 `sharedDb` 注入所有存储类，改为单连接架构。

#### P1 — 端口硬编码散落

```
server.ts:72   → const port = 8124
loader.ts:59   → const port = process.env.PORT ? parseInt(process.env.PORT) : 8124
```

两处独立读取端口，`loader.ts` 中的 `CronExecutor` 使用 `http://127.0.0.1:${port}` 自调用，如果 `server.ts` 端口与
`loader.ts` 端口不一致（比如只在一处设置环境变量），Cron 执行会静默失败。

**建议**: 统一从单一配置源读取端口。

#### P2 — `swarmNode` 每次调用都查询所有 Agent

```typescript
// graphBuilder.ts:19
const availableAgents = await getAvailableAgentIds(agentPackage);
```

每个请求进入 `swarmNode` 时都做一次全量 `listAgents()` 数据库查询，仅用于验证 `agent_id`
是否合法。高并发下这是不必要的 I/O。

**建议**: 在 `agentPackage` 层增加内存缓存，或直接在 `getAgent()` 返回 null 时给出明确错误，省去预检查。

---

## 2. 分层架构合规性

| 层级       | 目录                                    | 职责遵守情况                   |
| ---------- | --------------------------------------- | ------------------------------ |
| 框架层     | `packages/standard-agent/`              | 合规                           |
| 具体实现层 | `packages/agent-middlewares/`           | 合规                           |
| 应用层     | `zen-swarm/src/agents/`, `middlewares/` | 基本合规，有少量框架层代码渗漏 |
| 客户端层   | `zen-swarm/src/frontend/`               | 合规                           |

**渗漏示例**: `factory.ts:6` 直接从 `langchain` 包顶层导入 `createAgent` 和 `tool`，绕过了 `standard-agent`
的抽象。若 langchain 升级 API，需修改应用层代码。

---

## 3. 可观测性

当前日志全部使用 `console.log/error`，无结构化日志、无请求 ID 传播、无追踪。

建议最低改进：给每个 LangGraph 调用附加一个 `trace_id`，并在 Cron 执行日志中记录该 ID，便于排查定时任务执行异常。

---

## 4. 模块依赖图（简化）

```
server.ts
├── graphBuilder.ts → agents/factory.ts → providerStorage, agentPackage
├── api/index.ts → api/*.ts → agentPackage, cronStorage, cronScheduler...
└── config/loader.ts (所有单例的来源)
    ├── BunSqliteStorage (agentPackage)
    ├── ZenSwarmMcpStorage
    ├── ProviderStorage
    ├── CronStorage → CronScheduler → CronExecutor
    └── SMDatabase → StateMachineManager
```

`loader.ts` 是整个系统的单点故障：任何单例初始化失败都会导致服务器无法启动，且当前无错误隔离。

---

## 5. 优先级汇总

| 优先级 | 问题                             | 文档                              |
| ------ | -------------------------------- | --------------------------------- |
| P0     | 多数据库连接竞争                 | `03-database-optimizations.md`    |
| P0     | Cron 执行器自调用端口不一致      | `04-cron-system-optimizations.md` |
| P1     | `swarmNode` 每请求全量查询 Agent | `02-backend-optimizations.md`     |
| P1     | Agent 创建链路无缓存             | `02-backend-optimizations.md`     |
| P1     | Finder Store 单文件 990 行       | `05-frontend-optimizations.md`    |
| P2     | 无结构化日志/追踪                | `02-backend-optimizations.md`     |
| P2     | `@ts-ignore` 滥用                | `02-backend-optimizations.md`     |
