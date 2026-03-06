# Task System Design Specification

> 基于 `task-system.md` 原始设计的详细技术方案
>
> **版本**: v1.0 **日期**: 2025-01-24 **状态**: ⚠️ 部分实现 - 仅 todo_write 工具已实现

## 当前实现状态（2026-03-06 验证）

本文档为完整设计规格，**实际代码仅实现了其中的 TodoList 部分**：

| 功能模块                            | 设计 | 实现状态                                                        |
| ----------------------------------- | ---- | --------------------------------------------------------------- |
| `todo_write` 工具（Session 级待办） | ✅   | ✅ 已实现（`packages/agent/src/tools/task_tools/todo_tool.ts`） |
| Spark List（灵感收集）              | ✅   | ❌ 未实现                                                       |
| Plan File（任务规划）               | ✅   | ❌ 未实现                                                       |
| TaskNode 多层任务树                 | ✅   | ❌ 未实现                                                       |
| TaskState 持久化                    | ✅   | ❌ 未实现                                                       |
| TaskKanBan UI                       | ✅   | ❌ 未实现                                                       |

### 实际实现的 todo_write 工具

```typescript
// packages/agent/src/tools/task_tools/todo_tool.ts
// 状态: pending | in_progress | completed（精简版，无 pickup/review/feedback）
export const todo_write_tool = tool(async () => 'todo saved successfully', {
    name: 'todo_write',
    schema: z.object({
        todos: z.array(
            z.object({
                content: z.string().min(1),
                status: z.enum(['pending', 'in_progress', 'completed']),
                id: z.string(),
            }),
        ),
    }),
});
```

**关键差异**：

- 实际 `todo_write` 是 session 级的，用于 AI 自跟踪任务进度，非持久化存储
- 没有 SparkStore/TaskStore/PlanFile 等复杂数据结构
- 任务状态仅有 3 个（`pending/in_progress/completed`），非文档中的 6 个

---

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Structures](#data-structures)
3. [Task State Machine](#task-state-machine)
4. [Workflow Design](#workflow-design)
5. [Sub-agent System](#sub-agent-system)
6. [Tools & APIs](#tools--apis)
7. [UI/TUI Integration](#uitui-integration)
8. [Storage & Persistence](#storage--persistence)
9. [Error Handling](#error-handling)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Spark List   │  │ Plan Viewer  │  │ KanBan Board │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Task Orchestrator                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Spark Manager│  │ Plan Generator│ │ Task Scheduler│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               LangGraph Agent Router                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Sub-agents: default | planner | reviewer | finder  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Task State Store                          │
│           .claude/task.json + .claude/spark.json            │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### 1. Spark List（灵感收集）

```typescript
// .claude/spark.json
interface SparkStore {
    version: '1.0';
    sparks: SparkItem[];
    lastUpdated: string; // ISO timestamp
}

interface SparkItem {
    id: string; // UUID
    type: 'idea' | 'bug_report' | 'feature' | 'refactor';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    source: 'user_input' | 'ai_suggestion' | 'conversation_derived';
    status: 'pending' | 'planned' | 'archived';
    createdAt: string;
    tags: string[];
    metadata?: {
        relatedFiles?: string[];
        conversationContext?: string; // 来自哪段对话
        estimatedComplexity?: 'simple' | 'medium' | 'complex';
    };
}
```

### 2. Plan File（任务规划）

````markdown
---
id: "plan-20250124-001"
title: "Refactor Authentication System"
agentType: "refactor" // 整个 plan 的默认 agentType
createdAt: "2025-01-24T10:00:00Z"
priority: "high"
relatedSparks: ["spark-001", "spark-002"]
estimatedComplexity: "complex"
---

# Refactor Authentication System

## Background

Current auth system has issues with session management and token refresh...

## Goals

- [ ] Implement centralized auth context
- [ ] Add token refresh logic
- [ ] Migrate all components to use new auth

## Task Tree

```json
{
    "id": "task-root",
    "title": "Refactor Authentication System",
    "description": "Complete auth system refactor",
    "execution": "serial", // root 任务的执行模式
    "children": [
        {
            "id": "task-1",
            "title": "Create AuthContext",
            "description": "Implement centralized auth context with hooks",
            "agentType": "default", // 显式指定 agent
            "estimatedTime": "2h",
            "children": []
        },
        {
            "id": "task-group-2",
            "title": "Migrate Components",
            "description": "Migrate all components to use new auth",
            "execution": "parallel", // 并行迁移多个组件
            "children": [
                {
                    "id": "task-2-1",
                    "title": "Migrate Login Page",
                    "agentType": "refactor"
                },
                {
                    "id": "task-2-2",
                    "title": "Migrate Dashboard",
                    "agentType": "refactor"
                }
            ]
        }
    ]
}
```
````

## Acceptance Criteria

- [ ] All components use AuthContext
- [ ] Token refresh works seamlessly
- [ ] No token leaks in localStorage

## Dependencies

- Requires auth backend API changes

````

### 3. TaskNode（任务树节点）

```typescript
interface TaskNode {
  // 基本信息
  id: string; // 唯一标识符
  title: string;
  description: string;

  // 执行控制
  execution: 'serial' | 'parallel'; // 子任务执行模式
  children?: TaskNode[];

  // Agent 分配
  agentType?: 'default' | 'planner' | 'reviewer' | 'refactor' | 'finder' | 'debugger';
  // 如果不指定，继承父节点或 plan 的 agentType

  // 元数据
  estimatedTime?: string; // 如 "2h", "30m"
  complexity?: 'simple' | 'medium' | 'complex';
  dependencies?: string[]; // 依赖的其他 task IDs
  acceptanceCriteria?: string[]; // 验收标准

  // 状态相关（运行时）
  status?: TaskStatus;
  startedAt?: string;
  completedAt?: string;
  assignedTo?: string; // agent instance ID
  error?: {
    message: string;
    stack?: string;
    retryCount?: number;
  };
}

type TaskStatus =
  | 'pickup'     // 待领取（新任务，未被 agent 接管）
  | 'running'    // 运行中（agent 正在执行）
  | 'complete'   // 已完成（成功完成）
  | 'error'      // 已失败（失败，暂停中）
  | 'review'     // 待审核（完成，等待人工确认）
  | 'feedback';  // 待反馈（agent 卡住，需要人工输入）
````

### 4. TaskState（任务状态存储）

```typescript
// .claude/task.json
interface TaskStore {
    version: '1.0';
    lastUpdated: string;

    // 活跃的任务树
    activePlanId?: string;
    tasks: Record<string, TaskNode>; // taskId -> TaskNode (包含状态)

    // 执行历史
    history: TaskExecutionRecord[];

    // 全局配置
    config: {
        maxConcurrentAgents: number; // 并行 agent 上限
        retryLimit: number; // 失败重试次数
        autoResume: boolean; // 是否自动恢复
    };
}

interface TaskExecutionRecord {
    taskId: string;
    planId: string;
    agentType: string;
    status: TaskStatus;
    startedAt: string;
    completedAt?: string;
    output?: string;
    error?: string;
    changedFiles?: string[];
}
```

---

## Task State Machine

```
                    ┌──────────────────┐
                    │     Pickup       │
                    │  (待领取任务)     │
                    └────────┬─────────┘
                             │ agent 接管任务
                             ▼
                    ┌──────────────────┐
              ┌─────│     Running      │─────┐
              │     │   (agent 执行中)  │     │
              │     └────────┬─────────┘     │
              │              │               │
     任务完成 │              │ 失败/阻塞     │ 需要人工输入
              │              │               │
              ▼              ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Complete │   │  Error   │   │ Feedback │
        │ (已完成)  │   │ (已失败)  │   │ (待反馈)  │
        └────┬─────┘   └────┬─────┘   └────┬─────┘
             │              │              │
             │ 人工审核      │ 人工修复      │ 人工提供反馈
             ▼              ▼              ▼
        ┌──────────────────────────────────────┐
        │            Review (待审核)            │
        │         (等待人工确认)                │
        └──────────────────┬───────────────────┘
                           │
                  ┌────────┴────────┐
                  │                 │
             通过审核              需要修改
                  │                 │
                  ▼                 ▼
            ┌──────────┐      ┌──────────┐
            │  终止    │      │  Running │
            │ (任务树)  │      │  (重新执行) │
            └──────────┘      └──────────┘
```

### 状态转换规则

| 当前状态   | 触发事件     | 目标状态   | 自动/手动      |
| ---------- | ------------ | ---------- | -------------- |
| `pickup`   | agent 接管   | `running`  | 自动           |
| `running`  | 成功完成     | `complete` | 自动           |
| `running`  | 失败/异常    | `error`    | 自动           |
| `running`  | 需要人工决策 | `feedback` | 自动           |
| `complete` | 需要审核     | `review`   | 自动（可配置） |
| `error`    | 人工修复     | `running`  | 手动           |
| `feedback` | 人工提供反馈 | `running`  | 手动           |
| `review`   | 审核通过     | 终止       | 手动           |
| `review`   | 需要修改     | `running`  | 手动           |

---

## Workflow Design

### Phase 1: Spark Collection

```typescript
// 用户流程
用户输入想法/bug → Spark List 持久化到 .claude/spark.json
                  ↓
界面整理条目 → 选择多个相关条目 → 触发 Plan Mode
```

**Agent 工作流**:

1. 用户触发 `plan-mode`（通过 UI 或命令 `/plan`）
2. `SparkManagerAgent` 读取 `.claude/spark.json`
3. 智能分组相关条目（基于 tags, type, description）
4. 为每组条目生成一个 Plan

### Phase 2: Plan Generation

```typescript
// Planner Agent 工作流
输入: 选中的 SparkItem[]
     ↓
1. 使用 writing-plans skill 分析需求
2. 生成 Plan MD 文件（包含任务树）
3. 解析任务树到 .claude/task.json
4. 所有任务初始状态 = 'pickup'
     ↓
输出: .claude/plans/{planId}.md
     .claude/task.json (更新)
```

### Phase 3: Task Execution

```typescript
// Task Scheduler 工作流
读取 .claude/task.json
     ↓
找到所有 status = 'pickup' 的任务
     ↓
根据 execution mode 分组:
  - serial: 依次执行
  - parallel: 并行执行（受 maxConcurrentAgents 限制）
     ↓
为每个任务分配 Sub-agent:
  - 读取 agentType 配置
  - 创建 agent 实例
  - 注入任务上下文
     ↓
Agent 执行任务 → 调用 task_complete_tool
     ↓
更新 task.json 状态 → 触发下一个任务
```

### Phase 4: Task Completion

```typescript
// Sub-agent 工作流
1. 接收任务上下文:
   {
     planId: string,
     taskId: string,
     taskNode: TaskNode,
     planContext: string // plan 文件内容
   }

2. 执行任务 (使用现有 tools)

3. 调用 task_complete_tool({
     taskId: string,
     success: boolean,
     output?: string,
     error?: string,
     changedFiles?: string[]
   })

4. Task Scheduler:
   - 更新任务状态
   - 检查是否需要触发下一个任务
   - 如果失败，暂停整个任务树
   - 如果成功且是 serial，触发下一个兄弟任务
   - 如果成功且是 parallel，检查是否所有兄弟任务都完成
```

---

## Sub-agent System

### Agent Type 映射

```typescript
// packages/agent/src/subagents/config.ts
export const AGENT_TYPES = {
    default: {
        id: 'default',
        name: 'Generalist',
        description: 'Full-featured assistant with all tools',
        tools: ['all'],
        middleware: {
            skills: true,
            memories: true,
            subagents: false, // 防止无限递归
            mcp: true,
        },
    },

    planner: {
        id: 'planner',
        name: 'Planning Specialist',
        description: 'Expert in breaking down complex tasks',
        tools: ['read_tool', 'grep_tool', 'glob_tool'], // 只读工具
        middleware: {
            skills: true,
            memories: true,
        },
        systemPrompt: 'You are a planning specialist. Analyze requirements and create detailed task trees...',
    },

    refactor: {
        id: 'refactor',
        name: 'Refactoring Expert',
        description: 'Specialized in code restructuring',
        tools: ['read_tool', 'write_tool', 'grep_tool', 'glob_tool'],
        middleware: {
            skills: true,
            memories: true,
        },
        systemPrompt: 'You are a refactoring expert. Focus on code quality, maintainability, and architecture...',
    },

    reviewer: {
        id: 'reviewer',
        name: 'Code Reviewer',
        description: 'Reviews code for quality and issues',
        tools: ['read_tool', 'grep_tool'], // 只读
        middleware: {
            skills: true,
            memories: true,
        },
    },

    finder: {
        id: 'finder',
        name: 'Code Navigator',
        description: 'Finds files and code patterns',
        tools: ['grep_tool', 'glob_tool', 'read_tool'],
        middleware: {
            skills: true,
            memories: true,
        },
    },
};
```

### 任务上下文注入

```typescript
// Sub-agent 接收的额外上下文
interface TaskAgentContext {
    // 任务信息
    planId: string;
    planTitle: string;
    taskId: string;
    taskTitle: string;
    taskDescription: string;

    // 执行约束
    acceptanceCriteria?: string[];
    dependencies?: string[];

    // Plan 上下文
    planContent: string; // 完整 plan 文件
    relatedTasks?: TaskNode[]; // 相关任务（兄弟节点、父节点）

    // Agent 身份
    agentType: string;
    isSubAgent: boolean;
}

// 注入到 Agent 系统提示词
const TASK_SYSTEM_PROMPT = (context: TaskAgentContext) => `
You are executing a task as part of a larger plan.

**Plan**: ${context.planTitle}
**Your Task**: ${context.taskTitle}
**Description**: ${context.taskDescription}
${context.acceptanceCriteria ? `**Acceptance Criteria**:\n${context.acceptanceCriteria.map((c) => `- ${c}`).join('\n')}` : ''}

${context.relatedTasks ? `**Related Tasks**:\n${context.relatedTasks.map((t) => `- ${t.title}: ${t.status || 'pending'}`).join('\n')}` : ''}

**Important**:
1. Complete your task independently
2. When done, call task_complete_tool with your results
3. If you need human input, set status to 'feedback'
4. If you encounter an error, set status to 'error' with details
`;
```

---

## Tools & APIs

### 1. task_complete_tool

```typescript
// packages/agent/src/tools/task_complete/index.ts
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { updateTaskStatus } from '../taskStore';

export const task_complete_tool = tool(
    async (input) => {
        const result = await updateTaskStatus(input);

        if (!result.success) {
            return {
                success: false,
                error: result.error,
            };
        }

        // 触发任务调度器检查下一个任务
        await triggerNextTask(input.taskId);

        return {
            success: true,
            message: `Task ${input.taskId} marked as ${input.success ? 'complete' : 'failed'}`,
            nextTaskId: result.nextTaskId,
        };
    },
    {
        name: 'task_complete',
        description: 'Complete or fail a task. Must be called when finishing a task.',
        schema: z.object({
            taskId: z.string().describe('Task ID to update'),
            success: z.boolean().describe('true if completed successfully, false if failed'),
            output: z.string().optional().describe('Task output, results, or summary'),
            error: z.string().optional().describe('Error message if success=false'),
            changedFiles: z.array(z.string()).optional().describe('List of files modified'),
            reviewRequired: z.boolean().optional().describe('Set to true if task needs human review'),
        }),
    },
);
```

### 2. Spark Management Tools

```typescript
// add_spark_tool
export const add_spark_tool = tool(
    async (input) => {
        const spark: SparkItem = {
            id: generateUUID(),
            type: input.type,
            title: input.title,
            description: input.description,
            priority: input.priority || 'medium',
            source: 'user_input',
            status: 'pending',
            createdAt: new Date().toISOString(),
            tags: input.tags || [],
        };

        await appendSpark(spark);
        return { success: true, sparkId: spark.id };
    },
    {
        name: 'add_spark',
        description: 'Add a new idea, bug report, or feature request to Spark List',
        schema: z.object({
            type: z.enum(['idea', 'bug_report', 'feature', 'refactor']),
            title: z.string(),
            description: z.string(),
            priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
            tags: z.array(z.string()).optional(),
        }),
    },
);

// generate_plan_tool
export const generate_plan_tool = tool(
    async (input) => {
        const sparkIds = input.sparkIds || (await getPendingSparks()).map((s) => s.id);

        // 调用 Planner Agent
        const plan = await invokePlannerAgent(sparkIds);

        return {
            success: true,
            planId: plan.id,
            planPath: `.claude/plans/${plan.id}.md`,
            tasksCreated: plan.tasks.length,
        };
    },
    {
        name: 'generate_plan',
        description: 'Generate a plan from selected Spark List items',
        schema: z.object({
            sparkIds: z.array(z.string()).optional().describe('Spark IDs to include, defaults to all pending'),
        }),
    },
);
```

### 3. Task Query Tools

```typescript
// get_task_tool
export const get_task_tool = tool(
    async (input) => {
        const task = await getTaskById(input.taskId);
        return task;
    },
    {
        name: 'get_task',
        description: 'Get current task status and details',
        schema: z.object({
            taskId: z.string(),
        }),
    },
);

// list_tasks_tool
export const list_tasks_tool = tool(
    async (input) => {
        const tasks = await getTasksByStatus(input.status);
        return tasks;
    },
    {
        name: 'list_tasks',
        description: 'List tasks by status',
        schema: z.object({
            status: z.enum(['pickup', 'running', 'complete', 'error', 'review', 'feedback']).optional(),
        }),
    },
);

// resume_task_tool
export const resume_task_tool = tool(
    async (input) => {
        // 人工恢复失败的任务
        const result = await updateTaskStatus({
            taskId: input.taskId,
            status: 'pickup',
        });

        // 触发任务调度器重新执行
        await triggerTaskExecution(input.taskId);

        return { success: true, message: `Task ${input.taskId} resumed` };
    },
    {
        name: 'resume_task',
        description: 'Resume a failed or paused task (requires manual intervention)',
        schema: z.object({
            taskId: z.string(),
            context: z.string().optional().describe('Additional context for resuming'),
        }),
    },
);
```

---

## UI/TUI Integration

### TUI KanBan Board

```typescript
// zen-code/src/components/TaskKanBan.tsx
import { Box, Text } from 'ink';

export const TaskKanBan = () => {
  const { tasks, loading } = useTaskStore();

  const columns = [
    { status: 'pickup', title: '📋 Pickup', color: 'gray' },
    { status: 'running', title: '🔄 Running', color: 'yellow' },
    { status: 'complete', title: '✅ Complete', color: 'green' },
    { status: 'error', title: '❌ Error', color: 'red' },
    { status: 'review', title: '👀 Review', color: 'blue' },
    { status: 'feedback', title: '💬 Feedback', color: 'magenta' }
  ];

  return (
    <Box flexDirection="row" flexGrow={1}>
      {columns.map(col => (
        <Box
          key={col.status}
          width="16.66%"
          borderStyle="single"
          borderColor={col.color}
          paddingX={1}
        >
          <Box marginBottom={1}>
            <Text color={col.color} bold>{col.title}</Text>
            <Text dimColor> ({tasks.filter(t => t.status === col.status).length})</Text>
          </Box>

          {tasks
            .filter(t => t.status === col.status)
            .map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
        </Box>
      ))}
    </Box>
  );
};

const TaskCard = ({ task }) => (
  <Box
    marginBottom={1}
    borderStyle="classic"
    paddingX={1}
    flexDirection="column"
  >
    <Text bold>{task.title}</Text>
    <Text dimColor>{task.agentType}</Text>
    {task.error && (
      <Text color="red">⚠ {task.error.message}</Text>
    )}
  </Box>
);
```

### TUI 任务管理操作

```typescript
// 快捷键操作
const KEYBINDINGS = {
  'p': 'pickupTask',    // 手动领取任务
  'r': 'resumeTask',    // 恢复失败任务
  'e': 'viewError',     // 查看错误详情
  'l': 'viewLogs',      // 查看执行日志
  'a': 'approveReview', // 审核通过
  'm': 'modifyTask',    // 修改后重新执行
  'Ctrl+C': 'cancelTask' // 取消任务
};

// 任务详情面板
const TaskDetailPanel = ({ taskId }) => {
  const task = useTask(taskId);
  const plan = usePlan(task.planId);

  return (
    <Box flexDirection="column">
      <Text bold>Task: {task.title}</Text>
      <Text>Status: {task.status}</Text>

      {task.status === 'error' && (
        <ErrorPanel error={task.error} onResume={handleResume} />
      )}

      {task.status === 'feedback' && (
        <FeedbackPanel taskId={task.id} onSubmit={handleFeedback} />
      )}

      {task.status === 'review' && (
        <ReviewPanel task={task} onApprove={handleApprove} onModify={handleModify} />
      )}

      <OutputSection output={task.output} />
      <ChangedFiles files={task.changedFiles} />
    </Box>
  );
};
```

### Web UI 集成 (zen-worker)

```typescript
// zen-worker/src/components/TaskBoard.tsx
export const TaskBoard = () => {
  const { tasks, updateTask, resumeTask } = useTaskStore();

  return (
    <div className="grid grid-cols-6 gap-4 p-4">
      {TASK_STATUSES.map(status => (
        <div key={status} className="bg-gray-100 rounded-lg p-4">
          <h3 className="font-bold mb-3">{STATUS_LABELS[status]}</h3>

          {tasks
            .filter(t => t.status === status)
            .map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onResume={resumeTask}
                onApprove={() => updateTask(task.id, { status: 'complete' })}
              />
            ))}
        </div>
      ))}
    </div>
  );
};
```

---

## Storage & Persistence

### 文件结构

```
.claude/
├── spark.json          # Spark List 存储
├── task.json           # 任务状态存储
└── plans/              # Plan 文件目录
    ├── plan-20250124-001.md
    ├── plan-20250124-002.md
    └── ...
```

### 存储实现

```typescript
// packages/config/src/taskStore.ts
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';

class TaskStore {
    private db: Low<TaskStore>;

    constructor(projectRoot: string) {
        const dbPath = path.join(projectRoot, '.claude', 'task.json');
        const adapter = new JSONFile<TaskStore>(dbPath);
        this.db = new Low(adapter, this.getDefaultData());
    }

    private getDefaultData(): TaskStore {
        return {
            version: '1.0',
            lastUpdated: new Date().toISOString(),
            tasks: {},
            history: [],
            config: {
                maxConcurrentAgents: 3,
                retryLimit: 3,
                autoResume: false,
            },
        };
    }

    async updateTask(taskId: string, updates: Partial<TaskNode>) {
        await this.db.read();
        this.db.data.tasks[taskId] = {
            ...this.db.data.tasks[taskId],
            ...updates,
        };
        this.db.data.lastUpdated = new Date().toISOString();
        await this.db.write();
    }

    async getTasksByStatus(status: TaskStatus): Promise<TaskNode[]> {
        await this.db.read();
        return Object.values(this.db.data.tasks).filter((t) => t.status === status);
    }

    async addHistory(record: TaskExecutionRecord) {
        await this.db.read();
        this.db.data.history.push(record);
        await this.db.write();
    }
}

export const taskStore = new TaskStore(process.cwd());
```

---

## Error Handling

### 任务失败处理流程

```typescript
// packages/agent/src/taskScheduler.ts
async function handleTaskFailure(taskId: string, error: Error) {
    const task = await taskStore.getTask(taskId);

    // 1. 更新任务状态为 error
    await taskStore.updateTask(taskId, {
        status: 'error',
        error: {
            message: error.message,
            stack: error.stack,
            retryCount: (task.error?.retryCount || 0) + 1,
        },
    });

    // 2. 暂停所有相关任务
    await pauseRelatedTasks(taskId);

    // 3. 通知用户
    notifyUser({
        type: 'task_failed',
        taskId,
        message: `Task "${task.title}" failed: ${error.message}`,
        actions: ['resume', 'view_logs', 'skip'],
    });

    // 4. 记录到历史
    await taskStore.addHistory({
        taskId,
        planId: task.planId,
        agentType: task.agentType,
        status: 'error',
        startedAt: task.startedAt!,
        error: error.message,
    });
}
```

### 人工恢复机制

```typescript
async function resumeTask(taskId: string, context?: string) {
    const task = await taskStore.getTask(taskId);

    // 检查是否超过重试限制
    if (task.error?.retryCount >= taskStore.data.config.retryLimit) {
        throw new Error(`Task ${taskId} exceeded retry limit`);
    }

    // 重置状态为 pickup
    await taskStore.updateTask(taskId, {
        status: 'pickup',
        error: undefined,
    });

    // 触发重新执行
    await triggerTaskExecution(taskId, context);
}
```

---

## Implementation Roadmap

### Phase 1: Core Data Structures (Week 1)

- [ ] 实现 `SparkStore` 和 `TaskStore` LowDB 封装
- [ ] 定义 TypeScript interfaces (SparkItem, TaskNode, TaskStatus)
- [ ] 实现基础 CRUD 操作
- [ ] 编写单元测试

### Phase 2: Plan Mode (Week 2)

- [ ] 实现 `SparkManagerAgent`
- [ ] 实现 `PlannerAgent` (复用 writing-plans skill)
- [ ] 实现 `generate_plan_tool`
- [ ] 实现 Plan 文件生成逻辑
- [ ] 测试从 Spark 到 Plan 的完整流程

### Phase 3: Task Scheduler (Week 3)

- [ ] 实现任务树解析逻辑
- [ ] 实现 serial/parallel 执行调度
- [ ] 实现 sub-agent 分配逻辑
- [ ] 实现 `task_complete_tool`
- [ ] 集成到 LangGraph 状态机

### Phase 4: Sub-agent System (Week 4)

- [ ] 扩展 `subagents/config.ts` 添加新 agent types
- [ ] 实现任务上下文注入
- [ ] 为每个 agent type 定制系统提示词
- [ ] 测试 agent 任务执行

### Phase 5: UI/TUI Integration (Week 5)

- [ ] 实现 TUI KanBan Board
- [ ] 实现任务详情面板
- [ ] 实现错误恢复界面
- [ ] 实现 Web UI TaskBoard (zen-worker)
- [ ] 添加快捷键操作

### Phase 6: Error Handling & Polish (Week 6)

- [ ] 实现失败暂停机制
- [ ] 实现人工恢复流程
- [ ] 添加执行日志
- [ ] 性能优化和压力测试
- [ ] 文档编写

---

## Design Decisions (Finalized)

### ✅ 任务执行策略

- **执行顺序**: FIFO（按创建时间，先进先出）
- **依赖检查**: DAG 检测（启动前检测循环依赖）
- **并行限制**: 全局限制（所有 agent 总数 <= maxConcurrentAgents）
- **任务结构**: **固定 2 层架构**
    - **第一层（root.children）**: 并行执行，每个 group 分配给不同的 agent
    - **第二层（children.children）**: 串行执行，单个 agent 依次完成

### ✅ 版本控制与超时

- **Plan 修改**: 锁定执行中的 Plan（不允许修改，执行完成后解锁）
- **任务超时**: 不需要（依赖人工干预）

### ✅ 存储与模板

- **Spark List**: 项目级 `.claude/spark.json`（每个项目独立）
- **任务模板**: 不需要（每次从 Spark 生成）

---

## Fixed 2-Layer Task Structure

### 架构设计

```
Plan: Multi-Task Execution
├─ Task Group 1 (Parallel, agentType: refactor)
│  ├─ Task 1-1 (Serial)
│  ├─ Task 1-2 (Serial)
│  └─ Task 1-3 (Serial)
│
├─ Task Group 2 (Parallel, agentType: debugger)
│  ├─ Task 2-1 (Serial)
│  ├─ Task 2-2 (Serial)
│  └─ Task 2-3 (Serial)
│
└─ Task Group 3 (Parallel, agentType: reviewer)
   ├─ Task 3-1 (Serial)
   └─ Task 3-2 (Serial)
```

### 执行流程

```
[Group 1] Refactor Auth ──┐
  ├─ Create AuthContext   │ 并行执行
  ├─ Migrate Components   ├─→ [Group 2] Fix Bug
  └─ Add Tests            │   ├─ Investigate
                          │   ├─ Apply Fix
[Group 3] Review Code ────┘   └─ Write Test
  ├─ Review Auth
  └─ Review Bug Fix
```

### TypeScript 定义

```typescript
// 第一层：并行任务组（每个组一个 agent）
interface TaskGroup {
    id: string;
    title: string;
    execution: 'parallel'; // 固定为 parallel
    agentType: 'default' | 'planner' | 'refactor' | 'reviewer' | 'debugger';
    children: Task[]; // 第二层：串行任务列表
}

// 第二层：串行任务（单个 agent 依次执行）
interface Task {
    id: string;
    title: string;
    description: string;
    acceptanceCriteria?: string[];
    dependencies?: string[]; // 可选：依赖其他任务
}
```

### DAG 依赖检测

```typescript
function validateTaskTree(root: TaskGroup): void {
    const allTasks = new Map<string, Task>();

    // 收集所有任务
    function collectTasks(group: TaskGroup) {
        for (const task of group.children) {
            allTasks.set(task.id, task);
        }
    }

    // 检测循环依赖
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function dfs(taskId: string): boolean {
        if (recursionStack.has(taskId)) {
            throw new Error(`Circular dependency detected: ${taskId}`);
        }
        if (visited.has(taskId)) return false;

        visited.add(taskId);
        recursionStack.add(taskId);

        const task = allTasks.get(taskId);
        for (const depId of task?.dependencies || []) {
            if (!allTasks.has(depId)) {
                throw new Error(`Dependency not found: ${depId}`);
            }
            dfs(depId);
        }

        recursionStack.delete(taskId);
        return false;
    }

    // 检查所有任务
    for (const taskId of allTasks.keys()) {
        dfs(taskId);
    }
}
```

### Plan 锁定机制

```typescript
interface PlanMetadata {
    id: string;
    title: string;
    locked?: boolean;
    lockedAt?: string;
    completedAt?: string;
}

// 执行开始时锁定
async function lockPlan(planId: string): Promise<void> {
    const plan = await getPlan(planId);

    if (plan.locked) {
        throw new Error(`Plan ${planId} is currently locked`);
    }

    await updatePlan(planId, {
        locked: true,
        lockedAt: new Date().toISOString(),
    });
}

// 执行完成后解锁
async function unlockPlan(planId: string): Promise<void> {
    await updatePlan(planId, {
        locked: false,
        completedAt: new Date().toISOString(),
    });
}
```

---

## Related Documentation

- [writing-plans Skill](../../.claude/skills/writing-plans/SKILL.md)
- [SubAgent System Architecture](../../.claude/memories/subagents-system-architecture/MEMORY.md)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)

---

**Next Steps**:

1. Review this specification with stakeholders
2. Answer open questions
3. Start Phase 1 implementation
4. Iterate based on feedback
