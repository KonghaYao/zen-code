# Code Review: Cron Task System

**Date**: 2025-02-19 **Reviewer**: AI Assistant **Branch/Commit**: Staged changes **Scope**: 32 files, +10,666 / -9,019
lines

---

## 📋 Summary

为 zen-swarm 添加完整的 **Cron 任务调度系统**，包含：

- 后端核心：`scheduler`、`executor`、`queue`、`storage`
- API 层：tRPC router (`api/cron.ts`)
- 前端组件：`CronView`、`CronTaskForm`、`CronExpressionInput` 等
- 设计文档：`specs/cron-system-v2.md`

---

## 🎉 Strengths (做得好的地方)

1. **架构设计清晰**
    - 分层明确：`scheduler` → `executor` → `queue` → `storage`
    - 职责单一，易于测试和维护

2. **类型安全完善**
    - TypeScript + Zod schema 双重验证
    - 数据库行类型 (`CronTaskRow`) 与业务类型 (`CronTask`) 分离

3. **错误处理合理**
    - 使用 tRPC 的 `TRPCError` 进行 NOT_FOUND 处理
    - 执行失败时正确更新日志状态

4. **UI/UX 考虑周到**
    - Cron 表达式验证和人类可读描述
    - 预设值快速选择
    - 变量编辑器支持 `{{variable}}` 语法

---

## 🔴 Blocking Issues (必须修复)

### 1. `[api/cron.ts:148]` - 潜在的空指针访问

**文件**: `zen-swarm/src/api/cron.ts`

```typescript
const task = await ctx.cronStorage.getTask(input.id);
if (!task) {
    handleNotFound('CronTask', input.id);
}
// 这里 task 可能是 null，但后续代码使用了 task!
const enabled = !task!.enabled; // 使用了 non-null assertion
```

**问题**：`handleNotFound` 会抛出错误，但 TypeScript 不知道这一点，后续使用 `task!` 是不安全的。

**修复建议**：

```typescript
const task = await ctx.cronStorage.getTask(input.id);
if (!task) {
    handleNotFound('CronTask', input.id);
    return; // 明确 return 让 TS 知道后续 task 一定存在
}
const enabled = !task.enabled; // 不再需要 !
```

**状态**: [ ] 待修复

---

### 2. `[executor.ts]` - 服务器端未验证 Agent 存在性

**文件**: `zen-swarm/src/cron/executor.ts`

```typescript
private async runAgent(threadId: string, agentId: string, prompt: string): Promise<void> {
    // 直接调用 API，没有验证 agentId 是否有效
    const response = await fetch(`${LANGGRAPH_API_URL}/api/langgraph/threads/${threadId}/runs`, {
```

**问题**：如果 `agentId` 不存在，会在执行时才发现，浪费资源。

**修复建议**：

- 在 `createTask` 和 `updateTask` 时已经验证了 agent 存在性
- 但 `executor` 中也应该处理 API 返回的错误情况，提供更友好的错误信息

**状态**: [ ] 待修复

---

## 🟡 Important Issues (建议修复)

### 3. `[scheduler.ts:174]` - 重试逻辑中 sleep 时间过短

**文件**: `zen-swarm/src/cron/scheduler.ts`

```typescript
await this.sleep(1000 * retryCount); // 指数退避
```

**问题**：这不是真正的指数退避，只是线性增加。且 1s、2s、3s... 对于网络问题可能太短。

**修复建议**：

```typescript
await this.sleep(Math.min(1000 * Math.pow(2, retryCount), 30000)); // 真正的指数退避，最大 30s
```

**状态**: [ ] 待修复

---

### 4. `[executor.ts:23-24]` - 硬编码的 API URL

**文件**: `zen-swarm/src/cron/executor.ts`

```typescript
const LANGGRAPH_API_URL = process.env.LANGGRAPH_API_URL || 'http://127.0.0.1:8124';
```

**问题**：默认端口 8124 与 `server.ts` 中实际使用的端口可能不一致。

**修复建议**：确保环境变量配置一致，或从配置中心读取。

**状态**: [ ] 待修复

---

### 5. `[CronExpressionInput.tsx:17-20]` - 预设值缺少验证

**文件**: `zen-swarm/src/frontend/components/cron/CronExpressionInput.tsx`

```typescript
const presets = [
    { label: 'Every minute', value: '* * * * *' },
    // ...
];
```

**问题**：`* * * * *` 是一个非常危险的预设（每分钟执行一次），可能导致大量不必要的执行。

**修复建议**：移除 "Every minute" 预设，或添加确认提示。

**状态**: [ ] 待修复

---

### 6. `[storage.ts:93-112]` - 没有事务保护

**文件**: `zen-swarm/src/cron/storage.ts`

```typescript
async insertTask(task: CronTaskInput): Promise<void> {
    // Check if id already exists
    const checkStmt = this.db.prepare('SELECT id FROM cron_tasks WHERE id = ?');
    const existing = checkStmt.get(task.id) as { id: string } | null | undefined;

    if (existing) {
        throw new Error(`Cron task with id "${task.id}" already exists`);
    }
    // ... INSERT
}
```

**问题**：检查和插入之间存在竞态条件。

**修复建议**：使用 SQLite 的 `UNIQUE` 约束（已有）捕获错误，或使用事务：

```typescript
const insertTask = this.db.transaction((task: CronTaskInput) => {
    try {
        stmt.run(...);
    } catch (e) {
        if (e.message.includes('UNIQUE constraint')) {
            throw new Error(`Cron task with id "${task.id}" already exists`);
        }
        throw e;
    }
});
```

**状态**: [ ] 待修复

---

## 🟢 Nits (小建议)

### 7. `[types.ts]` - 前后端类型重复定义

**文件**:

- `zen-swarm/src/cron/types.ts`
- `zen-swarm/src/frontend/types/cron.ts`

**问题**：两个文件定义了几乎相同的类型。

**建议**：从后端导出类型，前端直接导入：

```typescript
// frontend/types/cron.ts
export type { CronTask, CronLog, ... } from '../../cron/types.js';
```

**状态**: [ ] 待修复

---

### 8. `[CronView.tsx:57]` - 日期比较逻辑可简化

**文件**: `zen-swarm/src/frontend/views/CronView.tsx`

```typescript
if (!existing || new Date(log.created_at || log.started_at) > new Date(existing.created_at || existing.started_at)) {
```

**建议**：确保 `created_at` 总是存在，或使用 `??` 提供默认值：

```typescript
const logTime = new Date(log.created_at ?? log.started_at);
const existingTime = new Date(existing.created_at ?? existing.started_at);
if (!existing || logTime > existingTime) {
```

**状态**: [ ] 待修复

---

### 9. `[scheduler.ts]` - 日志使用 `console.log`

**文件**: `zen-swarm/src/cron/scheduler.ts`

**问题**：使用 `console.log` 进行日志记录，不便于生产环境调试。

**建议**：考虑使用统一的日志库（如 pino）或集成现有的日志系统。

**状态**: [ ] 待修复

---

## 💡 Suggestions (架构建议)

### 10. 考虑添加任务执行超时配置

**问题**：当前 `maxExecutionTime` 是全局的 10 分钟，不同任务可能需要不同的超时时间。

**建议**：在 `CronTaskInput` 中添加 `timeout_minutes` 字段。

**状态**: [ ] 待评估

---

### 11. 考虑添加任务执行锁

**问题**：如果部署多个实例，当前调度器会在每个实例中运行，可能导致重复执行。

**建议**：

- 使用分布式锁（如 Redlock）
- 或明确文档说明仅支持单实例部署

**状态**: [ ] 待评估

---

## 📚 Documentation (文档相关)

### 12. 设计时区与实现不一致

**文件**: `specs/cron-system-v2.md`

**问题**：设计文档提到"使用服务器时区 (UTC)"，但代码中没有显式设置时区。

**建议**：在 `node-cron` 调用时指定时区：

```typescript
const job = cron.schedule(task.cron_expression, () => {...}, {
    timezone: "UTC"
});
```

**状态**: [ ] 待修复

---

## Verdict

**✅ Approve after addressing blocking issues**

这是一个设计良好、实现完整的 Cron 任务系统。代码结构清晰，类型安全，错误处理合理。建议修复两个阻塞性问题后合并，其他改进可以作为后续迭代。

---

## 建议的后续工作

- [ ] 添加单元测试（`scheduler.test.ts`、`executor.test.ts`）
- [ ] 考虑添加 Prometheus 指标（执行次数、成功率、延迟等）
- [ ] 添加 API 速率限制
- [ ] 添加执行通知功能（邮件/Webhook）
