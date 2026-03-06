# Cron 任务 Agent 入参完善：支持 initial_state 配置

**状态**: ✅ 已实现  
**优先级**: 高  
**创建日期**: 2026-03-02  
**完成日期**: 2026-03-06（验证）

---

## 背景

Cron 任务执行时需要传递正确的 Agent 入参给 LangGraph，包括但不限于 `agent_id`、`cwd`、`model_id` 等。当前 `CronTask`
虽然有 `agent_id` 字段，但
**缺少 workspace（`cwd`）和其他 SwarmState 字段的配置**，导致 executor 调用 LangGraph 时使用服务器默认值（`process.cwd()`）而非用户期望的工作目录。

### 参考：前端 Chat 如何传参

前端 `ChatPanel.tsx` 通过 `sendMessage` 的 `extraParams` 传递 state：

```typescript
// ChatPanel.tsx - handleSubmit
await sendMessage([{ type: 'human', content: inputValue }], {
    extraParams: {
        agent_id: selectedAgentId,
        cwd: rootPath,
    },
});
```

这些字段直接注入到 LangGraph 的 `input` 对象中，覆盖 `SwarmState` 的默认值。

### SwarmState 可配置字段

```typescript
// zen-swarm/src/state.ts
export const SwarmStateSchema = AgentState.extend(SubAgentStateSchema.shape).extend({
    agent_id: z.string().default('default'),
    model_id: z.string().default('gpt-4o-mini'),
    provider_type: z.string().default('openai'),
    cwd: z.string().default(process.cwd()),
});
```

### 现状问题

**关键代码路径**：

```
Cron 任务触发
  → CronExecutor.execute(task, logId)
  → CronExecutor.runAgent(threadId, agentId, prompt)
  → POST /api/langgraph/threads/{threadId}/runs
      input: {
          messages: [...],
          agent_id: agentId,   ← 只传了 agent_id
          // ❌ 缺少 cwd、model_id、provider_type 等
      }
  → SwarmState.cwd = process.cwd()   ← 错误的工作目录
```

---

## 需求

### 核心目标

Cron 任务支持配置完整的 **initial state JSON**，在执行时将这些参数注入到 LangGraph run 的 `input`
中，与前端 Chat 行为保持一致。

### 具体需求

1. **表单支持选择 Agent 和 Workspace**：创建/编辑 Cron 任务时，可以通过下拉选择器选择 Agent（已有）和 Workspace（新增），并自动生成/维护
   `initial_state` JSON
2. **`initial_state` 持久化到 CronTask**：`CronTask` 数据结构新增 `initial_state`
   字段（`Record<string, unknown>`），保存用户配置的 state 参数
3. **executor 注入 initial_state**：执行时将 `initial_state` 合并进 LangGraph run 的 `input` 对象
4. **缺少 agent_id 或 cwd 时跳过执行**：校验 `initial_state` 中包含必填字段，否则跳过并记录错误

### UI 交互设计

表单中提供**两个下拉选择器**（Agent、Workspace），自动映射到 `initial_state` 字段：

| UI 控件                       | 映射的 initial_state 字段                  |
| ----------------------------- | ------------------------------------------ |
| Agent 下拉（已有 `agent_id`） | `initial_state.agent_id`                   |
| Workspace 下拉（新增）        | `initial_state.cwd` = `workspace.rootPath` |

同时保留高级编辑：支持直接编辑 `initial_state` JSON（可折叠的高级选项）。

---

## 技术方案

### 1. 数据层：`CronTask` 类型新增 `initial_state`

**文件**: `zen-swarm/src/cron/types.ts`

```typescript
export interface CronTask {
    id: string;
    name: string;
    description?: string;
    cron_expression: string;
    prompt: string;
    agent_id: string; // 保留（向后兼容 + 快速访问）
    initial_state: Record<string, unknown>; // 新增：完整 state 参数
    enabled: boolean;
    max_retries: number;
    variables: Record<string, string>;
    created_at?: string;
    updated_at?: string;
}

export interface CronTaskInput {
    // ... 原有字段 ...
    initial_state?: Record<string, unknown>; // 新增：可选，默认 {}
}

export interface UpdateCronTaskInput {
    // ... 原有字段 ...
    initial_state?: Record<string, unknown>; // 新增：可选
}
```

> **设计说明**：保留 `agent_id` 字段（向后兼容），`initial_state` 里的 `agent_id` 优先级更高。executor 使用
> `initial_state.agent_id ?? task.agent_id`。

### 2. 数据库：SQLite 迁移

**文件**: `zen-swarm/src/cron/storage.ts`

- `CREATE TABLE cron_tasks` 中添加 `initial_state TEXT NOT NULL DEFAULT '{}'` 列
- `rowToTask()` 中解析 `JSON.parse(row.initial_state)`
- `taskToRow()` 中序列化 `JSON.stringify(task.initial_state ?? {})`
- 添加 `ALTER TABLE` 迁移逻辑（兼容已有数据）

```typescript
// storage.ts - initialize()
private migrateIfNeeded(): void {
    const tableInfo = this.db.prepare("PRAGMA table_info(cron_tasks)").all() as any[];

    const hasInitialState = tableInfo.some((col) => col.name === 'initial_state');
    if (!hasInitialState) {
        this.db.run("ALTER TABLE cron_tasks ADD COLUMN initial_state TEXT NOT NULL DEFAULT '{}'");
        console.log('[Cron] Migrated: added initial_state column to cron_tasks');
    }
}
```

### 3. 后端 API：Schema 更新

**文件**: `zen-swarm/src/api/cron.ts`

```typescript
const CronTaskInputSchema = z.object({
    // ... 原有字段 ...
    initial_state: z.record(z.string(), z.unknown()).optional().default({}),
});

const UpdateCronTaskSchema = z.object({
    // ... 原有字段 ...
    initial_state: z.record(z.string(), z.unknown()).optional(),
});
```

### 4. 执行器：注入 `initial_state` 到 LangGraph

**文件**: `zen-swarm/src/cron/executor.ts`

```typescript
async execute(task: CronTask, logId: string): Promise<ExecutorResult> {
    // 校验必填字段
    const agentId = (task.initial_state?.agent_id as string) ?? task.agent_id;
    const cwd = task.initial_state?.cwd as string | undefined;

    if (!agentId) {
        await this.storage.updateLog(logId, {
            status: 'failed',
            error_message: 'Task is missing agent_id in initial_state, skipping execution',
            finished_at: new Date().toISOString(),
        });
        return { success: false, error: 'Missing agent_id' };
    }

    if (!cwd) {
        await this.storage.updateLog(logId, {
            status: 'failed',
            error_message: 'Task is missing cwd (workspace) in initial_state, skipping execution',
            finished_at: new Date().toISOString(),
        });
        return { success: false, error: 'Missing cwd' };
    }

    // ... 继续执行
    const prompt = replaceVariables(task.prompt, task.variables);
    const thread = await this.createThread(agentId);
    await this.storage.updateLog(logId, { thread_id: thread.thread_id });
    await this.runAgent(thread.thread_id, agentId, prompt, task.initial_state);
    // ...
}
```

`runAgent` 方法修改：

```typescript
private async runAgent(
    threadId: string,
    agentId: string,
    prompt: string,
    initialState: Record<string, unknown> = {},
): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/langgraph/threads/${threadId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            assistant_id: 'swarm',
            input: {
                messages: [{ role: 'user', content: prompt }],
                // 合并 initial_state（与前端 ChatPanel 的 extraParams 行为一致）
                ...initialState,
                // agent_id 最终以 initial_state 里的为准
                agent_id: (initialState.agent_id as string) ?? agentId,
            },
            config: {
                configurable: {
                    agent_id: (initialState.agent_id as string) ?? agentId,
                },
            },
        }),
    });
    // ...
}
```

### 5. 前端表单：Agent 下拉 + Workspace 下拉 → 自动维护 `initial_state`

**文件**: `zen-swarm/src/frontend/components/cron/CronTaskForm.tsx`

关键设计：UI 提供两个直观的下拉选择器，选择后自动同步到 `initial_state` 字段。

```tsx
// 新增本地 state：workspace 选择
const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');

// 获取 workspaces 列表
const { data: workspacesData } = trpc.workspaces.getAll.useQuery();
const workspaces = workspacesData?.workspaces ?? [];

// 当 agent_id 或 workspace 选择变化时，同步到 initial_state
const handleAgentChange = (agentId: string) => {
    updateField('agent_id', agentId);
    updateField('initial_state', {
        ...formData.initial_state,
        agent_id: agentId,
    });
};

const handleWorkspaceChange = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) {
        updateField('initial_state', {
            ...formData.initial_state,
            cwd: ws.rootPath,
        });
    }
};

// 初始化时从 initial_state 反推 workspace 选择
useEffect(() => {
    if (task?.initial_state?.cwd) {
        const ws = workspaces.find((w) => w.rootPath === task.initial_state.cwd);
        if (ws) setSelectedWorkspaceId(ws.id);
    }
}, [task, workspaces]);
```

**表单 UI 布局**（Agent 下拉 + Workspace 下拉并排）：

```tsx
{
    /* Agent */
}
<div>
    <label>
        Agent <span className="text-red-500">*</span>
    </label>
    <select value={formData.agent_id} onChange={(e) => handleAgentChange(e.target.value)}>
        <option value="">Select an agent...</option>
        {agents?.map((agent) => (
            <option key={agent.id} value={agent.id}>
                {agent.name}
            </option>
        ))}
    </select>
</div>;

{
    /* Workspace */
}
<div>
    <label>
        Workspace <span className="text-red-500">*</span>
    </label>
    <select value={selectedWorkspaceId} onChange={(e) => handleWorkspaceChange(e.target.value)}>
        <option value="">Select a workspace...</option>
        {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
                {ws.name} ({ws.rootPath})
            </option>
        ))}
    </select>
    {errors.workspace && <p className="text-sm text-red-600">{errors.workspace}</p>}
</div>;
```

验证逻辑新增：

```typescript
const validate = (): boolean => {
    // ...
    if (!formData.agent_id) {
        newErrors.agent_id = 'Agent is required';
    }

    // 验证 workspace（通过 initial_state.cwd 判断）
    if (!formData.initial_state?.cwd) {
        newErrors.workspace = 'Workspace is required';
    }
    // ...
};
```

### 6. 前端类型同步

**文件**: `zen-swarm/src/frontend/types/cron.ts`

```typescript
export interface CronTask {
    // ...
    initial_state: Record<string, unknown>; // 新增
}

export interface CronTaskInput {
    // ...
    initial_state?: Record<string, unknown>; // 新增
}

export interface UpdateCronTaskInput {
    // ...
    initial_state?: Record<string, unknown>; // 新增
}
```

### 7. Agent 工具 Schema 同步

**文件**: `zen-swarm/src/middlewares/cron.ts`

```typescript
const TaskSchema = z.object({
    // ... 原有字段 ...
    initial_state: z
        .record(z.string(), z.unknown())
        .optional()
        .default({})
        .describe('Initial state parameters for the LangGraph run (e.g. {agent_id, cwd, model_id})'),
});
```

---

## 数据库迁移策略

已有 `cron_tasks` 表通过 `ALTER TABLE` 添加 `initial_state` 列：

- 默认值 `'{}'`，旧数据执行时 `cwd` 字段为空
- 执行时检测 `initial_state.cwd` 为空 → 跳过执行 + 记录错误日志
- 用户需手动编辑任务并选择 Workspace 才能恢复执行

---

## 错误处理策略

| 场景                                 | 处理方式                                                    |
| ------------------------------------ | ----------------------------------------------------------- |
| `initial_state.agent_id` 为空        | 跳过执行，log: "Missing agent_id in initial_state"          |
| `initial_state.cwd` 为空             | 跳过执行，log: "Missing cwd (workspace) in initial_state"   |
| Workspace 路径不存在（文件系统层面） | executor 执行时 LangGraph agent 会报错，通过 retry 机制处理 |

---

## 文件修改清单

| 文件                                                      | 修改内容                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `zen-swarm/src/cron/types.ts`                             | `CronTask`/`CronTaskInput`/`UpdateCronTaskInput` 新增 `initial_state`   |
| `zen-swarm/src/cron/storage.ts`                           | 建表语句新增 `initial_state` 列 + 迁移逻辑 + rowToTask/taskToRow 序列化 |
| `zen-swarm/src/cron/executor.ts`                          | `runAgent` 接受 `initialState` 参数，合并注入 LangGraph input           |
| `zen-swarm/src/api/cron.ts`                               | Schema 新增 `initial_state` 字段                                        |
| `zen-swarm/src/middlewares/cron.ts`                       | `TaskSchema` 新增 `initial_state`                                       |
| `zen-swarm/src/frontend/types/cron.ts`                    | 前端类型同步新增 `initial_state`                                        |
| `zen-swarm/src/frontend/components/cron/CronTaskForm.tsx` | 添加 Workspace 下拉，agent/workspace 变化时同步到 `initial_state`       |

---

## 与现有前端 Chat 行为对比

| 特性          | ChatPanel（前端）                        | CronExecutor（Cron）                         |
| ------------- | ---------------------------------------- | -------------------------------------------- |
| agent_id 来源 | `sendMessage extraParams.agent_id`       | `task.initial_state.agent_id`                |
| cwd 来源      | `sendMessage extraParams.cwd = rootPath` | `task.initial_state.cwd`                     |
| 传递方式      | 合并到 LangGraph run input               | 合并到 LangGraph run input（相同）           |
| 额外参数      | 不支持                                   | 支持任意 `initial_state` 字段（model_id 等） |
