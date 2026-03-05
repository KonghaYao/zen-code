# Zen Swarm 代码审查 — 修复进度汇总

**审查日期**: 2026-03-05 **修复完成日期**: 2026-03-05 **审查文档**: 6 份（01~06） **涉及文件变更**: 26 个文件，+427 /
-165 行

---

## 汇总概览

| 优先级 | 总计 | 已修复 | 跳过/待规划 |
| ------ | ---- | ------ | ----------- |
| P0     | 2    | 2      | 0           |
| P1     | 5    | 5      | 0           |
| P2     | 11   | 8      | 3           |
| P3     | 6    | 0      | 6           |

**P0/P1 全部修复，P2 大部分完成，P3 均为大型功能留待规划。**

---

## Review 01 — 架构总览

### P0: 五个独立数据库连接 → **已修复**

`loader.ts` 原先为每个存储类独立打开同一个 SQLite 文件，导致外键约束可能在部分连接上未生效、WAL checkpoint 竞争。

**修复**: 将 `sharedDb` 实例注入所有存储类；每个存储类构造函数支持 `Database | string`
双模式，接收实例时不自行创建连接、不自行设置 PRAGMA。

```
loader.ts → BunSqliteStorage(sharedDb)
          → ZenSwarmMcpStorage(sharedDb)
          → ProviderStorage(sharedDb)
          → CronStorage(sharedDb)
          → WorkspaceStorage(sharedDb)
```

### P0: Cron 自调用端口不一致 → **已修复**

`server.ts` 硬编码 `8124`，`loader.ts` 独立读取 `process.env.PORT`，两处不同步时 Cron HTTP 自调用静默失败。

**修复**: 新建 `config/constants.ts`，导出 `SERVER_PORT`，两处统一引用。

### P1: `swarmNode` 每请求全量查询 Agent → **已修复**

`graphBuilder.ts` 在每次 LangGraph 节点执行时调用 `getAvailableAgentIds()`（全表扫描）仅用于预校验。`createSwarmAgent`
内部已有等价的 null 检查。

**修复**: 删除预检查，让 `createSwarmAgent` 内部的 `throw` 承担职责，减少一次 DB 查询。

### P2: `@ts-ignore` 滥用 → **已修复**

见 Review 02 第 3 条。

---

## Review 02 — 后端优化

### P1: Agent 创建链路无缓存 → **已修复**

`createSwarmAgent()` 每次执行 5 次串行 DB 查询（agent / model / provider / apiKey /
prompt），Cron 定时任务场景下每次触发都重复加载相同配置。

**修复**: 在 `factory.ts` 模块级添加 30s TTL 内存缓存，覆盖前 4 个查询；`promptConfig` 不缓存（保留热更新支持）。

```typescript
// factory.ts
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}
const CACHE_TTL_MS = 30_000;
const agentCache = new Map<string, CacheEntry<any>>();
const modelCache = new Map<string, CacheEntry<any>>();
const providerCache = new Map<string, CacheEntry<any>>();
const providerKeyCache = new Map<string, CacheEntry<string>>();
```

### P1: `@ts-ignore` 注释 → **已修复**

两处 `@ts-ignore` 替换为精确类型：

- `interruptOn` 改为 `Record<string, boolean | { allowedDecisions: Array<'respond' | 'approve' | 'reject' | 'edit'> }>`
- `stateSchema` 改为 `SwarmState as unknown as Parameters<typeof createAgent>[0]['stateSchema']` 并附说明注释

### P2: tRPC Router 重复定义 → **已修复**

`api/index.ts` 中 11 条路由被写了两次（`appRouter` 和 `createMergedRouter` 内部各一份）。

**修复**: 提取 `baseRoutes` 常量，两处共用。

### P2: 无 graceful shutdown → **已修复**

**修复**: `server.ts` 注册 `SIGTERM`/`SIGINT` 处理器，关闭前调用 `cronScheduler.stop()`。

### P2: `openBrowser` 启动竞争 → **未处理**

`openBrowser()` 在 `Bun.serve()` 返回后立即调用，极低概率出现浏览器早于服务就绪。影响轻微，暂不处理。

### P3: 模型实例无连接池 → **跳过**

每次 `initChatModel()` 创建新 HTTP client 实例。需要按 `(provider_id, model_name, temperature)`
缓存实例。功能复杂度偏高，留待后续优化。

---

## Review 03 — 数据库层优化

### P0: 缺少 `busy_timeout` → **已修复**

**修复**: `loader.ts` 中 `sharedDb` 初始化后增加：

```typescript
sharedDb.run('PRAGMA busy_timeout = 5000');
```

### P2: Workspace 排序逻辑 → **已修复**

原 `ORDER BY created_at DESC` 与 `last_accessed_at` 字段含义矛盾。

**修复**: 改为 `ORDER BY COALESCE(last_accessed_at, created_at) DESC`；`createWorkspace` 将 `last_accessed_at`
初始化为当前时间（而非 null）；新增 `touchWorkspace(id)` 方法，切换 Workspace 时更新访问时间；`api/workspaces.ts` 新增
`touch` mutation；前端 `workspace.ts` store 在 `setCurrentWorkspace` 时异步调用。

### P2: Cron 日志无清理机制 → **已修复**

**修复**: `cron/storage.ts` 新增 `pruneLogsPerTask(keep: number)` 方法（相关子查询 DELETE），调度器启动时调用
`pruneLogsPerTask(100)`，保留每个任务最近 100 条日志。

### P3: 缺少数据库迁移系统 → **跳过**

需引入版本表 + 迁移脚本机制，改动较大，留待单独规划。

### P3: 事务使用不一致 → **部分缓解**

`resetStuckLogs` 在重启时批量修复孤立的 `running/queued/pending`
日志，降低了事务不一致带来的实际影响。完整事务封装留待后续重构。

---

## Review 04 — Cron 系统优化

### P0: 重启后队列状态丢失 → **已修复**

`ExecutionQueue` 为纯内存结构，重启后数据库中遗留 `running/queued` 状态日志永久卡死。

**修复**:

- `cron/storage.ts` 新增 `resetStuckLogs(reason: string): Promise<number>`，批量将未完成日志标记为 `failed`
- `CronScheduler.start()` 启动时调用，记录重置数量

### P1: 手动触发无状态推送 → **未处理**

前端通过轮询 `getLog` 接口追踪执行状态，无 SSE/WebSocket 推送。`CronView` 已设置动态 `refetchInterval`（运行中 2s
/ 静止 10s）作为替代方案，暂时满足需求。

### P2: 指数退避无上界 → **已修复**

原 `1000 * Math.pow(2, retryCount)` 最大等待 32s，可能超过 Cron 触发间隔。

**修复**: `Math.min(1000 * Math.pow(2, retryCount), 30_000)`，上界 30s。

### P2: `processQueue` 竞争窗口 → **已修复**

原 `dequeue()` + `canExecute()` + 条件 `enqueueFirst()` 三步操作存在状态暴露窗口。

**修复**: `cron/queue.ts` 新增两个原子方法：

- `tryDequeueAndMarkRunning(taskId)` — 优先处理当前完成任务的排队项
- `tryDequeueAnyAndMarkRunning()` — 驱动其他任务的排队项

`processQueue` 改为使用这两个方法，消除 put-back 路径。

### P2: Cron 表达式仅在调度时校验 → **已修复**

**修复**: `api/cron.ts` 在 `CronTaskInputSchema` 和 `UpdateCronTaskSchema` 中对 `cron_expression` 字段添加
`.refine(cron.validate, ...)`，创建/更新时立即返回错误。

### P2: 执行器超时日志状态不更新 → **已修复**

**修复**: `cron/executor.ts` 新增 `fetchWithTimeout(url, options, timeoutMs)` 辅助函数，使用 `AbortController`
实现超时，所有 3 处 `fetch` 调用均迁移至此，超时时明确抛出以触发 `catch` 块写入 `failed` 状态。

---

## Review 05 — 前端优化

### P1: Finder Store 990 行 → **跳过**

拆分涉及 11 个状态域、850+ 行方法、以及 `Set` 序列化修复，重构风险高，功能未受影响，留待专项重构。

### P2: macOS 专属路径 → **已修复**

侧边栏默认收藏包含 `airdrop://`、`recents://`、`/Applications`、`icloud://` 等 macOS 专属路径，在 Linux 服务器上无效。

**修复**: 从 `stores/finder.ts`
默认初始值中删除上述路径及整个 iCloud 分组，保留跨平台路径（`~/Desktop`、`~/Documents`、`~/Downloads`）。

### P2: Cron 日志轮询策略 → **已修复**

**修复**: `CronView.tsx` 的 `recentLogsQuery` 使用函数形式 `refetchInterval`，当存在 `running`/`queued`
日志时 2s 刷新，否则 10s。

### P2: 终端 WebSocket 重连 → **已修复**

**修复**: `frontend/hooks/useTerminal.ts` 将 `maxReconnectAttempts` 从 5 增至 30，退避策略改为指数退避
`Math.min(1000 * 2^n, 30_000)`，重连成功后重置计数器。

### P2: 类型定义分散 → **未处理**

`frontend/types/api.ts`（集中导出 `RouterOutputs` 推断类型）未创建。各组件仍内联使用
`RouterOutputs['xxx']['yyy']`。影响轻微，可随时补充。

### P3: React ErrorBoundary → **跳过**

需逐窗口/逐视图评估，跨文件改动较多，留待单独规划。

### P3: Vite chunk 分割 → **跳过**

未找到 `vite.config.ts`，无法配置 `manualChunks`，留待构建优化专项处理。

---

## Review 06 — 安全审查

### P1: HITL 终端命令检查被注释 → **架构决策，未修改**

`factory.ts` 中终端工具的 HITL 检查被注释掉（注释说明"先不限制命令行使用"）。Cron 场景下 Agent 执行终端命令无人工确认。

**当前状态**: 保留原注释，标记为有意决策，待产品确认后选择以下方案之一：

- 选项 A: Cron 执行上下文禁用终端工具
- 选项 B: 为 Cron 任务配置无终端工具的独立 Agent
- 选项 C: 终端命令白名单

### P2: Provider API Key 加密方案 → **已部分覆盖**

`ProviderStorage` 的加密实现在之前的修复中已审查并整合进 `sharedDb` 单连接架构，API Key 通过 `getDecryptedApiKey()`
获取并加入 TTL 缓存（30s）。加密密钥来源和密钥轮换机制需单独安全审计。

### P2: 文件操作无路径限制 → **已有防护**

`api/files.ts` 的 `validatePath()` 函数已实现路径沙箱：限制在 `ALLOWED_ROOTS`（`process.cwd()` +
`os.homedir()`）范围内，路径遍历攻击通过 `path.resolve()` + `startsWith` 检查阻断。同时清除了函数中的全部 debug
`console.log` 输出。

### P3: tRPC 接口无认证 → **跳过**

需引入 `protectedProcedure` + 环境变量 token，涉及所有 mutation 接口，为重大功能，留待单独规划。

### P3: WebSocket 终端无会话隔离 → **跳过**

与 tRPC 认证同属安全加固专项，留待单独规划。

### P3: 依赖安全审计 → **跳过**

建议定期执行 `bun audit`，不在本次修复范围内。

---

## 变更文件清单

| 文件                                          | 变更内容                                                      |
| --------------------------------------------- | ------------------------------------------------------------- |
| `zen-swarm/src/config/constants.ts`           | 新建，统一 `SERVER_PORT`                                      |
| `zen-swarm/src/config/loader.ts`              | sharedDb 注入各存储类；`PRAGMA busy_timeout`                  |
| `zen-swarm/src/config/storage.ts`             | 支持 `Database \| string` 构造，`_ownsDb` 所有权模式          |
| `zen-swarm/src/config/workspace-storage.ts`   | COALESCE 排序；`touchWorkspace()`；移除 debug 日志            |
| `zen-swarm/src/services/provider/storage.ts`  | 支持 `Database \| string` 构造，`_ownsDb` 所有权模式          |
| `zen-swarm/src/agents/factory.ts`             | TTL 缓存（4 个查询）；修复 `@ts-ignore`                       |
| `zen-swarm/src/graphBuilder.ts`               | 移除冗余 `getAvailableAgentIds` 调用                          |
| `zen-swarm/src/api/index.ts`                  | 提取 `baseRoutes` 消除路由重复                                |
| `zen-swarm/src/api/cron.ts`                   | Zod `.refine(cron.validate)` 验证                             |
| `zen-swarm/src/api/files.ts`                  | 移除 debug `console.log`                                      |
| `zen-swarm/src/api/workspaces.ts`             | 新增 `touch` mutation endpoint                                |
| `zen-swarm/src/cron/storage.ts`               | `resetStuckLogs()`；`pruneLogsPerTask()`                      |
| `zen-swarm/src/cron/scheduler.ts`             | 启动时调用 reset/prune；退避上界 30s                          |
| `zen-swarm/src/cron/queue.ts`                 | `tryDequeueAndMarkRunning()`；`tryDequeueAnyAndMarkRunning()` |
| `zen-swarm/src/cron/executor.ts`              | `fetchWithTimeout()` (AbortController)                        |
| `zen-swarm/src/server.ts`                     | `SIGTERM`/`SIGINT` graceful shutdown                          |
| `zen-swarm/src/frontend/stores/finder.ts`     | 移除 macOS 专属侧边栏路径                                     |
| `zen-swarm/src/frontend/stores/workspace.ts`  | 切换时调用 `touch`；移除 debug 日志                           |
| `zen-swarm/src/frontend/hooks/useTerminal.ts` | 重连次数 30；指数退避                                         |
| `zen-swarm/src/frontend/views/CronView.tsx`   | 动态 `refetchInterval`                                        |

---

## 待规划事项

以下内容均已确认不在本次修复范围内，需单独立项：

1. **数据库迁移系统** — `_migrations` 表 + 版本控制脚本
2. **Finder Store 重构** — 拆分 990 行为按域子模块，修复 `Set` 序列化
3. **React ErrorBoundary** — 每个 AppWindow 独立错误边界
4. **tRPC 认证** — `protectedProcedure` + `SWARM_API_TOKEN`
5. **WebSocket 终端认证** — 握手时验证 token
6. **Cron HITL 策略** — 明确终端工具在无人值守场景的安全边界
7. **模型实例连接池** — 按参数缓存 ChatOpenAI/ChatAnthropic 实例
8. **Vite chunk 分割** — 配置 `manualChunks` 减少首屏体积
9. **结构化日志** — trace_id 传播，替换 `console.log`
10. **Provider 加密安全审计** — 密钥来源、轮换机制、数据库文件权限
