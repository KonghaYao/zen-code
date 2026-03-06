# Zen-Swarm Cron 任务系统设计文档 v2

> 基于 cron-system.md 的需求澄清版本，紧贴 zen-swarm 现有架构
>
> **状态**: ✅ 已实现 **最后验证**: 2026-03-06

## 当前实现状态（2026-03-06 验证）

| 功能                         | 设计     | 实现状态                              |
| ---------------------------- | -------- | ------------------------------------- |
| 基础 CRUD（cron_tasks 表）   | ✅       | ✅ 已实现（`zen-swarm/src/cron/`）    |
| 执行日志（cron_logs 表）     | ✅       | ✅ 已实现                             |
| Scheduler + Queue + Executor | ✅       | ✅ 已实现                             |
| 变量替换 `{{variable}}`      | ✅       | ✅ 已实现（`variable-replacer.ts`）   |
| `initial_state` 配置         | 扩展设计 | ✅ 已实现（含 SQLite migration）      |
| processMonitor               | 扩展设计 | ✅ 已实现（`cron/processMonitor.ts`） |
| tRPC API                     | ✅       | ✅ 已实现（`api/cron.ts`）            |

**与原设计的关键差异**：

- `CronTask` 新增了 `initial_state: Record<string, unknown>` 字段（非原始设计），支持传递
  `cwd`、`model_id`、`provider_type` 等 LangGraph state 参数
- `executor.ts` 会验证 `initial_state.cwd` 是否存在，缺失则跳过执行并记录错误
- 存储使用 `bun:sqlite`（非原设计的 `better-sqlite3`）

---

## 1. 需求确认

| 需求项   | 决策                                           |
| -------- | ---------------------------------------------- |
| 服务范围 | 仅 zen-swarm 项目使用                          |
| 并发策略 | 排队等待执行                                   |
| 日志保留 | 无限制（手动清理）                             |
| 时区处理 | 使用服务器时区 (UTC)                           |
| 变量替换 | 支持简单 `{{variable}}` 替换，值从任务配置读取 |
| 执行通知 | 暂不需要                                       |

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      zen-swarm                               │
├─────────────────────────────────────────────────────────────┤
│  Frontend                                                    │
│  ├── views/CronView.tsx          # Cron 视图（Tab 入口）     │
│  ├── components/cron/            # Cron 组件                 │
│  └── types/cron.ts               # Cron 类型定义             │
├─────────────────────────────────────────────────────────────┤
│  API (tRPC)                                                  │
│  └── api/cron.ts                 # Cron Router               │
├─────────────────────────────────────────────────────────────┤
│  Cron Core                                                   │
│  ├── cron/scheduler.ts           # 调度器                    │
│  ├── cron/executor.ts            # 执行器（调用 Agent）       │
│  ├── cron/queue.ts               # 执行队列                  │
│  ├── cron/storage.ts             # 数据存储                  │
│  └── cron/types.ts               # 类型定义                  │
├─────────────────────────────────────────────────────────────┤
│  Storage                                                     │
│  └── data/index.db               # SQLite（复用现有）         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 与现有系统的集成点

| 集成点         | 现有代码                              | Cron 集成方式                            |
| -------------- | ------------------------------------- | ---------------------------------------- |
| tRPC Router    | `src/api/index.ts`                    | 添加 `cronRouter`                        |
| Storage        | `src/config/loader.ts`                | 复用 `agentStorage` 或新建 `cronStorage` |
| Agent 执行     | `src/agents/factory.ts`               | 调用 `createSwarmAgent`                  |
| Frontend Types | `src/frontend/types/`                 | 添加 `cron.ts`                           |
| Tab 导航       | `src/frontend/layouts/MainLayout.tsx` | 添加 Cron Tab                            |
| App 路由       | `src/frontend/App.tsx`                | 添加 `CronView`                          |

---

## 3. 数据模型

### 3.1 数据库表

使用现有 SQLite 数据库 (`./data/index.db`)，新增两张表：

```sql
-- Cron 任务表
CREATE TABLE cron_tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cron_expression TEXT NOT NULL,
  prompt TEXT NOT NULL,
  agent_id TEXT NOT NULL,            -- 关联 agents.id
  enabled INTEGER DEFAULT 1,
  max_retries INTEGER DEFAULT 0,
  variables TEXT DEFAULT '{}',       -- JSON: {"key": "value"}
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 执行日志表
CREATE TABLE cron_logs (
  id TEXT PRIMARY KEY,
  cron_task_id TEXT NOT NULL,
  thread_id TEXT,                    -- LangGraph Thread ID
  status TEXT NOT NULL,              -- pending, queued, running, success, failed
  started_at TEXT NOT NULL,
  finished_at TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  queued_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cron_task_id) REFERENCES cron_tasks(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_cron_tasks_enabled ON cron_tasks(enabled);
CREATE INDEX idx_cron_logs_task_id ON cron_logs(cron_task_id);
CREATE INDEX idx_cron_logs_status ON cron_logs(status);
CREATE INDEX idx_cron_logs_created_at ON cron_logs(created_at);
```

### 3.2 TypeScript 类型

```typescript
// src/frontend/types/cron.ts

export interface CronTask {
    id: string;
    name: string;
    description?: string;
    cron_expression: string;
    prompt: string;
    agent_id: string;
    enabled: boolean;
    max_retries: number;
    variables: Record<string, string>;
    created_at?: string;
    updated_at?: string;
}

export interface CronLog {
    id: string;
    cron_task_id: string;
    thread_id?: string;
    status: 'pending' | 'queued' | 'running' | 'success' | 'failed';
    started_at: string;
    finished_at?: string;
    error_message?: string;
    retry_count: number;
    queued_at?: string;
    created_at?: string;
}

export type CronTaskInput = Omit<CronTask, 'created_at' | 'updated_at'>;
export type UpdateCronTaskInput = Partial<CronTaskInput> & { id: string };
```

---

## 4. 后端实现

### 4.1 文件结构

```
zen-swarm/src/
├── cron/
│   ├── index.ts                   # 导出
│   ├── scheduler.ts               # node-cron 调度器
│   ├── executor.ts                # Agent 执行器
│   ├── queue.ts                   # 执行队列
│   ├── storage.ts                 # SQLite 存储
│   ├── variable-replacer.ts       # 变量替换
│   └── types.ts                   # 类型定义
├── api/
│   └── cron.ts                    # tRPC Router（新增）
└── config/
    └── loader.ts                  # 添加 cronScheduler 初始化
```

### 4.2 Cron Storage

```typescript
// src/cron/storage.ts

import Database from 'bun:sqlite';
import type { CronTask, CronLog } from './types.js';

export class CronStorage {
  private db: Database;

  constructor(dbPath: string = './data/index.db') {
    this.db = new Database(dbPath, { create: true });
    this.db.run('PRAGMA foreign_keys = ON');
  }

  async initialize(): Promise<void> {
    this.createTables();
  }

  private createTables(): void {
    // 创建 cron_tasks 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cron_tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        cron_expression TEXT NOT NULL,
        prompt TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        max_retries INTEGER DEFAULT 0,
        variables TEXT DEFAULT '{}',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 创建 cron_logs 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cron_logs (
        id TEXT PRIMARY KEY,
        cron_task_id TEXT NOT NULL,
        thread_id TEXT,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        queued_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cron_task_id) REFERENCES cron_tasks(id) ON DELETE CASCADE
      );
    `);

    // 创建索引
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_cron_tasks_enabled ON cron_tasks(enabled);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_cron_logs_task_id ON cron_logs(cron_task_id);`);
  }

  // CRUD Operations
  async getAllTasks(): Promise<CronTask[]> { ... }
  async getTask(id: string): Promise<CronTask | null> { ... }
  async getEnabledTasks(): Promise<CronTask[]> { ... }
  async insertTask(task: CronTaskInput): Promise<void> { ... }
  async updateTask(task: UpdateCronTaskInput): Promise<void> { ... }
  async deleteTask(id: string): Promise<void> { ... }

  // Log Operations
  async getLogsByTaskId(taskId: string, limit?: number, offset?: number): Promise<CronLog[]> { ... }
  async getRecentLogs(limit?: number): Promise<CronLog[]> { ... }
  async insertLog(log: Omit<CronLog, 'id' | 'created_at'>): Promise<string> { ... }
  async updateLog(id: string, updates: Partial<CronLog>): Promise<void> { ... }
  async deleteLogsBefore(taskId: string, before: string): Promise<number> { ... }
}
```

### 4.3 Cron Scheduler

```typescript
// src/cron/scheduler.ts

import cron from 'node-cron';
import type { CronStorage } from './storage.js';
import type { CronTask } from './types.js';
import { ExecutionQueue } from './queue.js';
import { CronExecutor } from './executor.js';

export class CronScheduler {
    private storage: CronStorage;
    private executor: CronExecutor;
    private queue: ExecutionQueue;
    private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

    constructor(storage: CronStorage, executor: CronExecutor) {
        this.storage = storage;
        this.executor = executor;
        this.queue = new ExecutionQueue();
    }

    async start(): Promise<void> {
        const tasks = await this.storage.getEnabledTasks();
        for (const task of tasks) {
            this.scheduleTask(task);
        }
    }

    async stop(): Promise<void> {
        for (const [_, job] of this.scheduledJobs) {
            job.stop();
        }
        this.scheduledJobs.clear();
    }

    scheduleTask(task: CronTask): void {
        if (this.scheduledJobs.has(task.id)) {
            this.scheduledJobs.get(task.id)!.stop();
        }

        if (!task.enabled) return;

        const job = cron.schedule(task.cron_expression, () => {
            this.onTrigger(task);
        });

        this.scheduledJobs.set(task.id, job);
    }

    unscheduleTask(taskId: string): void {
        if (this.scheduledJobs.has(taskId)) {
            this.scheduledJobs.get(taskId)!.stop();
            this.scheduledJobs.delete(taskId);
        }
    }

    private async onTrigger(task: CronTask): Promise<void> {
        const logId = await this.storage.insertLog({
            cron_task_id: task.id,
            status: 'pending',
            started_at: new Date().toISOString(),
            retry_count: 0,
        });

        if (this.queue.canExecute(task.id)) {
            this.queue.markRunning(task.id);
            await this.storage.updateLog(logId, { status: 'running' });
            await this.executeWithRetry(task, logId);
        } else {
            await this.storage.updateLog(logId, {
                status: 'queued',
                queued_at: new Date().toISOString(),
            });
            this.queue.enqueue(task.id, logId);
        }
    }

    private async executeWithRetry(task: CronTask, logId: string): Promise<void> {
        // 重试逻辑...
    }

    async triggerManually(taskId: string): Promise<string> {
        // 手动触发逻辑...
    }
}
```

### 4.4 Cron Executor

```typescript
// src/cron/executor.ts

import { agentPackage } from '../config/loader.js';
import { createSwarmAgent } from '../agents/factory.js';
import { replaceVariables } from './variable-replacer.js';
import type { CronTask, CronStorage } from './types.js';

export class CronExecutor {
    private storage: CronStorage;

    constructor(storage: CronStorage) {
        this.storage = storage;
    }

    async execute(task: CronTask, logId: string): Promise<void> {
        try {
            // 1. 替换变量
            const prompt = replaceVariables(task.prompt, task.variables);

            // 2. 获取 Agent 配置
            const agentConfig = await agentPackage.getAgent(task.agent_id);
            if (!agentConfig) {
                throw new Error(`Agent not found: ${task.agent_id}`);
            }

            // 3. 创建 LangGraph Thread
            const thread = await this.createThread(task.agent_id);

            // 4. 执行 Agent
            await this.runAgent(thread, prompt);

            // 5. 更新日志
            await this.storage.updateLog(logId, {
                status: 'success',
                thread_id: thread.thread_id,
                finished_at: new Date().toISOString(),
            });
        } catch (error) {
            await this.storage.updateLog(logId, {
                status: 'failed',
                error_message: error instanceof Error ? error.message : String(error),
                finished_at: new Date().toISOString(),
            });
            throw error;
        }
    }

    private async createThread(agentId: string): Promise<{ thread_id: string }> {
        // 调用 LangGraph API 创建 thread
        const response = await fetch('http://127.0.0.1:8124/api/langgraph/threads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assistant_id: agentId }),
        });
        return response.json();
    }

    private async runAgent(thread: { thread_id: string }, prompt: string): Promise<void> {
        // 发送消息到 thread 并等待执行
        const response = await fetch(`http://127.0.0.1:8124/api/langgraph/threads/${thread.thread_id}/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assistant_id: 'swarm',
                input: { messages: [{ role: 'user', content: prompt }] },
            }),
        });
        // 等待执行完成...
    }
}
```

### 4.5 tRPC Router

```typescript
// src/api/cron.ts

import { z } from 'zod';
import { router, publicProcedure, handleNotFound } from './trpc.js';

// Schemas
const CronTaskInputSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    description: z.string().optional(),
    cron_expression: z.string().min(5),
    prompt: z.string().min(1),
    agent_id: z.string().min(1),
    enabled: z.boolean().optional(),
    max_retries: z.number().min(0).optional(),
    variables: z.record(z.string(), z.string()).optional(),
});

const UpdateCronTaskSchema = CronTaskInputSchema.partial().extend({
    id: z.string(),
});

// Router
export const cronRouter = router({
    // 任务列表
    listTasks: publicProcedure.query(async ({ ctx }) => {
        return ctx.cronStorage.getAllTasks();
    }),

    // 获取任务
    getTask: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const task = await ctx.cronStorage.getTask(input.id);
        if (!task) handleNotFound('CronTask', input.id);
        return task;
    }),

    // 创建任务
    createTask: publicProcedure.input(CronTaskInputSchema).mutation(async ({ ctx, input }) => {
        await ctx.cronStorage.insertTask(input);
        ctx.cronScheduler.scheduleTask(input as any);
        return { id: input.id };
    }),

    // 更新任务
    updateTask: publicProcedure.input(UpdateCronTaskSchema).mutation(async ({ ctx, input }) => {
        await ctx.cronStorage.updateTask(input);
        const task = await ctx.cronStorage.getTask(input.id);
        if (task) ctx.cronScheduler.scheduleTask(task);
        return { id: input.id };
    }),

    // 删除任务
    deleteTask: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        ctx.cronScheduler.unscheduleTask(input.id);
        await ctx.cronStorage.deleteTask(input.id);
        return { id: input.id };
    }),

    // 切换启用状态
    toggleTask: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        const task = await ctx.cronStorage.getTask(input.id);
        if (!task) handleNotFound('CronTask', input.id);
        const enabled = !task!.enabled;
        await ctx.cronStorage.updateTask({ id: input.id, enabled });
        if (enabled) {
            const updated = await ctx.cronStorage.getTask(input.id);
            if (updated) ctx.cronScheduler.scheduleTask(updated);
        } else {
            ctx.cronScheduler.unscheduleTask(input.id);
        }
        return { id: input.id, enabled };
    }),

    // 手动触发
    triggerTask: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        const logId = await ctx.cronScheduler.triggerManually(input.id);
        return { logId };
    }),

    // 获取执行日志
    getLogs: publicProcedure
        .input(z.object({ taskId: z.string(), limit: z.number().optional(), offset: z.number().optional() }))
        .query(async ({ ctx, input }) => {
            const logs = await ctx.cronStorage.getLogsByTaskId(input.taskId, input.limit, input.offset);
            return logs;
        }),

    // 获取最近日志
    getRecentLogs: publicProcedure.input(z.object({ limit: z.number().optional() })).query(async ({ ctx, input }) => {
        return ctx.cronStorage.getRecentLogs(input.limit);
    }),

    // 清理日志
    clearLogs: publicProcedure
        .input(z.object({ taskId: z.string(), before: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
            const count = await ctx.cronStorage.deleteLogsBefore(
                input.taskId,
                input.before ?? new Date().toISOString(),
            );
            return { deletedCount: count };
        }),
});
```

### 4.6 更新 tRPC Context

```typescript
// src/api/trpc.ts (修改)

import type { CronStorage } from '../cron/storage.js';
import type { CronScheduler } from '../cron/scheduler.js';

export interface Context {
    agentPackage: AgentPackage;
    cronStorage: CronStorage; // 新增
    cronScheduler: CronScheduler; // 新增
}
```

### 4.7 更新 API 入口

```typescript
// src/api/index.ts (修改)

import { cronRouter } from './cron.js';

export const appRouter = router({
    models: modelsRouter,
    prompts: promptsRouter,
    tools: toolsRouter,
    middlewares: middlewaresRouter,
    agents: agentsRouter,
    mcp: mcpRouter,
    skills: skillsRouter,
    cron: cronRouter, // 新增
});
```

---

## 5. 前端实现

### 5.1 文件结构

```
zen-swarm/src/frontend/
├── types/
│   └── cron.ts                   # Cron 类型定义
├── components/
│   └── cron/
│       ├── CronTaskList.tsx      # 任务列表
│       ├── CronTaskCard.tsx      # 任务卡片
│       ├── CronTaskForm.tsx      # 任务编辑表单
│       ├── CronExpressionInput.tsx # Cron 表达式输入
│       ├── VariablesEditor.tsx   # 变量编辑器
│       ├── CronLogList.tsx       # 执行日志列表
│       ├── CronLogItem.tsx       # 日志项
│       └── QueueIndicator.tsx    # 队列状态指示
├── views/
│   └── CronView.tsx              # Cron 视图
└── App.tsx                       # 添加 cron tab 路由
```

### 5.2 更新 Tab 导航

```typescript
// src/frontend/layouts/MainLayout.tsx (修改)

const tabs: Tab[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'agent-config', label: 'Agent Config', icon: '🤖' },
    { id: 'resources', label: 'Resources', icon: '📦' },
    { id: 'cron', label: 'Cron', icon: '⏰' }, // 新增
    { id: 'chat', label: 'Chat', icon: '💬' },
];
```

### 5.3 更新 App 路由

```typescript
// src/frontend/App.tsx (修改)

import { CronView } from './views/CronView.js';

export function App() {
  return (
    <MainLayout>
      {(tab: PanelType) => {
        switch (tab) {
          case 'dashboard':
            return <DashboardView />;
          case 'agent-config':
            return <AgentConfigView />;
          case 'resources':
            return <ResourcesView />;
          case 'cron':
            return <CronView />;  // 新增
          case 'chat':
            return <ChatView />;
          default:
            return <div>Unknown panel: {tab}</div>;
        }
      }}
    </MainLayout>
  );
}
```

### 5.4 CronView 组件

```typescript
// src/frontend/views/CronView.tsx

import { useState } from 'react';
import { trpc } from '../api.js';
import { CronTaskList } from '../components/cron/CronTaskList.js';
import { CronTaskForm } from '../components/cron/CronTaskForm.js';
import { CronLogList } from '../components/cron/CronLogList.js';
import { Modal } from '../components/Modal.js';

export function CronView() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const { data: tasks } = trpc.cron.listTasks.useQuery();
  const { data: recentLogs } = trpc.cron.getRecentLogs.useQuery({ limit: 20 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cron Tasks</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + New Task
        </button>
      </div>

      {/* Task List */}
      <CronTaskList
        tasks={tasks ?? []}
        onSelect={setSelectedTaskId}
        onEdit={(id) => { setSelectedTaskId(id); setShowForm(true); }}
      />

      {/* Recent Logs */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Executions</h2>
        <CronLogList logs={recentLogs ?? []} />
      </div>

      {/* Edit Modal */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <CronTaskForm
            taskId={selectedTaskId}
            onSave={() => setShowForm(false)}
          />
        </Modal>
      )}
    </div>
  );
}
```

### 5.5 CronExpressionInput 组件

```typescript
// src/frontend/components/cron/CronExpressionInput.tsx

import { useState, useMemo } from 'react';
import cronstrue from 'cronstrue';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function CronExpressionInput({ value, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);

  // 解析 Cron 表达式
  const description = useMemo(() => {
    try {
      if (!value || value.split(' ').length !== 5) return null;
      return cronstrue.toString(value);
    } catch {
      setError('Invalid cron expression');
      return null;
    }
  }, [value]);

  // 计算下次 5 次执行时间
  const nextRuns = useMemo(() => {
    // 使用 cron-parser 计算
    // ...
  }, [value]);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0 9 * * 1-5"
        className="input w-full"
      />
      {description && (
        <p className="text-sm text-green-600">{description}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {nextRuns.length > 0 && (
        <div className="text-xs text-gray-500">
          <p>Next runs:</p>
          <ul>
            {nextRuns.slice(0, 5).map((time, i) => (
              <li key={i}>{time.toLocaleString()}</li>
            ))}
          </ul>
        </div>
      )}
      {/* 常用预设 */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => onChange('0 9 * * *')} className="btn-sm">Daily 9AM</button>
        <button onClick={() => onChange('0 * * * *')} className="btn-sm">Hourly</button>
        <button onClick={() => onChange('0 9 * * 1')} className="btn-sm">Weekly Mon</button>
      </div>
    </div>
  );
}
```

---

## 6. 变量替换

```typescript
// src/cron/variable-replacer.ts

export function replaceVariables(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (key in variables) {
            return variables[key];
        }
        // 找不到变量时保留原占位符并记录警告
        console.warn(`Variable "${key}" not found in cron task variables`);
        return match;
    });
}
```

---

## 7. 初始化流程

```typescript
// src/config/loader.ts (修改)

import { CronStorage } from '../cron/storage.js';
import { CronScheduler } from '../cron/scheduler.js';
import { CronExecutor } from '../cron/executor.js';

// Cron 存储实例
export const cronStorage = new CronStorage('./data/index.db');
await cronStorage.initialize();

// Cron 执行器
const cronExecutor = new CronExecutor(cronStorage);

// Cron 调度器
export const cronScheduler = new CronScheduler(cronStorage, cronExecutor);
await cronScheduler.start();
```

---

## 8. 依赖安装

```bash
cd zen-swarm
bun add node-cron cronstrue cron-parser
bun add -d @types/node-cron
```

---

## 9. 实现计划

### Phase 1: 后端基础 (Day 1)

- [ ] 创建 `src/cron/types.ts` 类型定义
- [ ] 创建 `src/cron/storage.ts` 数据存储
- [ ] 创建 `src/cron/variable-replacer.ts` 变量替换
- [ ] 创建 `src/api/cron.ts` tRPC Router
- [ ] 更新 `src/api/trpc.ts` Context
- [ ] 更新 `src/api/index.ts` 注册 router

### Phase 2: 调度器 (Day 2)

- [ ] 创建 `src/cron/queue.ts` 执行队列
- [ ] 创建 `src/cron/executor.ts` 任务执行器
- [ ] 创建 `src/cron/scheduler.ts` 调度器
- [ ] 更新 `src/config/loader.ts` 初始化

### Phase 3: 前端 (Day 3-4)

- [ ] 创建 `src/frontend/types/cron.ts` 类型
- [ ] 创建 `src/frontend/components/cron/` 组件
- [ ] 创建 `src/frontend/views/CronView.tsx` 视图
- [ ] 更新 `MainLayout.tsx` 添加 Tab
- [ ] 更新 `App.tsx` 添加路由

### Phase 4: 测试和优化 (Day 5)

- [ ] 手动测试各功能
- [ ] 边界情况处理
- [ ] UI 优化

---

## 10. 风险和缓解

| 风险                   | 缓解措施                                           |
| ---------------------- | -------------------------------------------------- |
| 服务器重启丢失队列状态 | 队列中只存 logId，重启后从 pending/queued 状态恢复 |
| Agent 执行超时         | 设置执行超时，更新日志为 failed                    |
| 时区混淆               | UI 显示 UTC，添加说明                              |
| 变量未定义             | 保留占位符，日志警告                               |

---

## 11. 后续扩展（暂不实现）

- [ ] 任务执行通知（Webhook/邮件）
- [ ] 任务分组管理
- [ ] 任务模板
- [ ] 执行统计报表
- [ ] 执行结果预览
