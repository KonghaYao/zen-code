# Zen Swarm Cron 系统优化建议

**涉及文件**: `cron/scheduler.ts`, `cron/executor.ts`, `cron/queue.ts`, `cron/storage.ts`, `api/cron.ts`

---

## 1. 核心问题：服务器重启后队列状态丢失

### 问题描述

`ExecutionQueue` 是纯内存数据结构：

```typescript
// scheduler.ts:16
private scheduledJobs: Map<string, ScheduledTask> = new Map();

// queue.ts（推断）
private running: Map<string, string> = new Map();
private queue: Array<{ taskId: string; logId: string }> = [];
```

当服务器重启时：

1. 数据库中可能存在 `status = 'running'` 或 `status = 'queued'` 的日志记录
2. 内存队列已清空，调度器不知道这些任务
3. 这些日志永远停留在 `running`/`queued` 状态

这会导致：

- 监控面板显示任务"卡在运行中"
- `queue.canExecute()` 基于内存状态判断，重启后所有任务都被认为"空闲"，可能导致重复触发

### 建议

在 `CronScheduler.start()` 中增加状态恢复逻辑：

```typescript
async start(): Promise<void> {
    // 将上次未完成的运行/排队日志标记为失败
    await this.storage.resetStuckLogs('Server restarted');

    // 继续正常加载任务...
}
```

```typescript
// storage.ts 新增方法
async resetStuckLogs(reason: string): Promise<void> {
    this.db.run(`
        UPDATE cron_logs
        SET status = 'failed',
            error_message = ?,
            finished_at = ?
        WHERE status IN ('running', 'queued', 'pending')
    `, [reason, new Date().toISOString()]);
}
```

---

## 2. Cron 执行器使用自调用 HTTP 请求

### 问题描述

```typescript
// config/loader.ts:67
export const cronExecutor = new CronExecutor(cronStorage, {
    apiBaseUrl: process.env.LANGGRAPH_API_URL || `http://127.0.0.1:${port}`,
    maxExecutionTime: 10 * 60 * 1000,
});
```

`CronExecutor` 通过 HTTP 请求调用 `http://127.0.0.1:8124/api/langgraph`，相当于自己调用自己。这引入了几个问题：

1. **端口不一致风险**: `loader.ts` 读取 `process.env.PORT`，`server.ts` 硬编码
   `8124`，若只设置了一处，端口会不同（见架构总览 P1）
2. **延迟增加**: 走完整 HTTP 栈（序列化→网络→反序列化），而不是直接函数调用
3. **认证绕过**: 自调用绕过了可能将来添加的认证中间件
4. **服务启动顺序**: `loader.ts` 在 `server.ts` 之前执行（因为 `server.ts` import 了
   `loader.ts`），此时 HTTP 服务尚未启动，但 `cronScheduler.start()`
   已经被调用——如果有任务在启动时立即触发，HTTP 请求会失败

### 建议

**方案 A（短期）**: 统一端口来源

```typescript
// config/constants.ts（新建）
export const SERVER_PORT = parseInt(process.env.PORT ?? '8124', 10);

// server.ts 和 loader.ts 都从此导入
import { SERVER_PORT } from './config/constants.js';
```

**方案 B（中期，推荐）**: 将 LangGraph 调用改为直接函数调用

Cron 执行器目前通过 HTTP 调用 `swarmGraph`，可以直接调用：

```typescript
// executor.ts
import { swarmGraph } from '../graphBuilder.js';

async execute(task: CronTask, logId: string): Promise<ExecutionResult> {
    const result = await swarmGraph.invoke({
        messages: [{ role: 'user', content: task.prompt }],
        agent_id: task.agent_id,
    }, {
        configurable: { thread_id: logId },
    });
    // ...
}
```

直接调用消除网络层，也避免了启动顺序问题。

---

## 3. 手动触发结果无法同步等待

```typescript
// scheduler.ts:299-302（triggerManually）
this.executeWithRetry(task, logId).catch((error) => {
    console.error(`[Cron] Manual trigger error:`, error);
});
// ...
return logId; // 只返回 logId，不等待执行完成
```

前端调用 `triggerManually` 后只得到一个
`logId`，需要轮询日志状态才能知道执行结果。这是合理设计（长时间任务不适合同步等待），但前端需要有清晰的轮询机制。

当前 `api/cron.ts` 中 `getLog` 接口需要前端手动实现轮询，没有 SSE/WebSocket 推送。

**建议**: 为日志状态变更提供 tRPC
subscription（基于 Bun 的 WebSocket），或至少在文档中说明前端轮询间隔建议（推荐 2 秒）。

---

## 4. 指数退避的上界问题

```typescript
// scheduler.ts:190
await this.sleep(1000 * Math.pow(2, retryCount)); // 指数退避
```

当 `maxRetries = 5` 时，第 5 次重试等待 `1000 * 2^5 = 32`
秒，加上执行时间可能超过 Cron 触发间隔（比如每分钟的任务），导致任务积压在队列中。

**建议**: 设置退避上界：

```typescript
const backoff = Math.min(1000 * Math.pow(2, retryCount), 30_000); // 最多等 30 秒
await this.sleep(backoff);
```

---

## 5. `processQueue` 逻辑有轻微竞争窗口

```typescript
// scheduler.ts:257-269
const anyNext = this.queue.dequeue();
if (anyNext && this.queue.canExecute(anyNext.taskId)) {
    // ...执行
} else if (anyNext) {
    // 取出后发现仍在运行中，放回队列头部保持 FIFO 顺序
    this.queue.enqueueFirst(anyNext);
}
```

`dequeue()` 和 `canExecute()` 之间是两步操作，不是原子的。虽然 Node.js 单线程模型通常不会有真正的并发，但 `await`
调用可能导致中间插入。

`markRunning` 和 `dequeue` 之间如果有异步操作，队列状态可能短暂不一致。

**建议**: 将队列的 `dequeue + canExecute + markRunning` 合并为一个原子方法 `tryDequeueAndRun(taskId)`，减少状态暴露。

---

## 6. Cron 表达式验证仅在调度时

```typescript
// scheduler.ts:81-84
if (!cron.validate(task.cron_expression)) {
    console.error(`[Cron] Invalid cron expression for task "${task.name}": ${task.cron_expression}`);
    return;
}
```

无效的 Cron 表达式在 `scheduleTask()` 时才被发现，只打 `console.error`
后静默返回。用户在 UI 创建任务时不会收到验证错误。

**建议**: 在 tRPC `cron.create` 和 `cron.update` 接口中添加 Zod 自定义验证：

```typescript
cronExpression: z.string().refine(
    (val) => cron.validate(val),
    { message: 'Invalid cron expression' }
),
```

---

## 7. 执行器超时时日志状态

当 `CronExecutor` 执行超过
`maxExecutionTime`（10 分钟）时，如果超时后进程被强制终止而不是通过正常 reject，日志状态可能不会被更新为 `failed`。

**建议**: 确保 `executor.execute()` 的超时逻辑使用 `AbortController` 并在超时时明确抛出，让 `executeWithRetry`
的 catch 块能够捕获并写入 `failed` 状态。
