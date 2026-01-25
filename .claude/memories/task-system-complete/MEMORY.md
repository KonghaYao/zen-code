---
name: "task-system-complete"
description: "任务系统完整架构和实现：固定 2 层任务树（root.children 并行任务组，children.children 串行任务）、6 状态任务机、DAG 依赖检测、Plan 锁定机制。包括 Phase 1-3 实现：核心数据结构（递归 TaskNode、Web Crypto API UUID、LowDB 存储）、Plan Mode 工具、Kanban UI 看板界面。适用于需要从灵感到任务执行全流程管理的场景。"
tags: ["task-system", "two-layer-architecture", "dag-dependency", "state-machine", "lowdb", "typescript", "plan-mode", "kanban-ui", "tui", "command-system"]
category: "architecture"
created: "2025-01-24"
last_updated: "2025-01-25"
priority: "high"
context_scope: "project"
---

# Task System 完整架构与实现

## 概述

任务系统支持从灵感到任务执行的全流程管理，采用固定 2 层任务树架构，6 状态任务机，DAG 依赖检测，完整实现 Phase 1（核心数据结构）、Phase 2（Plan Mode）、Phase 3（Kanban UI）。

---

## 核心架构设计

### 固定 2 层任务树结构

**架构创新**：不同于通用任务树，采用固定 2 层设计

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
```

**第一层（root.children）**：并行执行任务组
- 每个 `TaskGroup` 分配给一个独立的 agent
- 不同 group 同时运行（受 maxConcurrentAgents 限制）
- agentType 在 YAML frontmatter 中声明

**第二层（children.children）**：串行执行任务
- 单个 agent 依次完成组内所有任务
- 支持 dependencies 字段（跨 group 任务依赖）
- FIFO 执行顺序（按创建时间）

### 6 状态任务机

```
Pickup → Running → Complete → Review
           ↓         ↓
         Error ← Feedback
```

**状态定义**：
- `pickup` - 待领取（新任务，未被 agent 接管）
- `running` - 运行中（agent 正在执行）
- `complete` - 已完成（成功完成）
- `error` - 已失败（失败，暂停整个任务树）
- `review` - 待审核（完成，等待人工确认）
- `feedback` - 待反馈（agent 卡住，需要人工输入）

**关键特性**：
- `error` 状态自动暂停整个任务树，等待人工干预
- 无超时机制，完全依赖人工介入
- 失败后可从失败节点重新执行（非重试整个树）

### DAG 依赖检测

```typescript
// 启动前检测循环依赖
function validateTaskTree(root: TaskGroup): void {
  const allTasks = new Map<string, Task>();
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
}
```

### Plan 锁定机制

```typescript
// 执行开始时锁定
async function lockPlan(planId: string): Promise<void> {
  const plan = await getPlan(planId);
  if (plan.locked) {
    throw new Error(`Plan ${planId} is currently locked`);
  }
  await updatePlan(planId, {
    locked: true,
    lockedAt: new Date().toISOString()
  });
}
```

---

## Phase 1: 核心数据结构和存储层

### 关键实现

#### 1. 递归类型解决方案

**问题**：TaskNode 需要引用自身（children: TaskNode[]），使用 `type` 别名会导致循环引用错误。

**解决方案**：使用 `interface` 定义类型，Zod schema 用于验证：

`packages/config/src/types/task.ts`：TaskNode interface 和 TaskNodeSchema

```typescript
// 使用 interface 支持递归类型
export interface TaskNode {
  id: string;
  title: string;
  description: string;
  execution?: TaskExecution;
  children?: TaskNode[];  // 递归引用
  agentType?: AgentType;
  status?: TaskStatus;
}

// Zod schema 用于验证（使用 z.lazy）
export const TaskNodeSchema: z.ZodType<TaskNode> = z.lazy(() =>
  z.object({
    children: z.array(z.lazy(() => TaskNodeSchema)).optional(),
  })
);
```

#### 2. UUID 生成策略

**决策**：使用 Web Crypto API 替代 uuid 库，避免额外依赖：

```typescript
private generateId(): string {
  return crypto.randomUUID();
}
```

**优势**：
- 无需安装额外依赖
- 原生支持，性能更好
- 符合现代 Web 标准

#### 3. 目录自动创建

**问题**：LowDB 写入时如果 `.claude` 目录不存在会报错。

**解决方案**：在 `initialize()` 方法中检查并创建目录：

```typescript
async initialize(): Promise<void> {
  const fs = await import('fs');
  const dir = path.dirname(this.dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
```

### 存储结构

**文件布局**：
```
.claude/
├── spark.json          # Spark List 存储（项目级）
├── task.json           # 任务状态存储（项目级）
└── plans/              # Plan 文件目录
    ├── plan-20250124-001.md
    └── plan-20250124-002.md
```

**数据结构**：
```typescript
// SparkStore
interface SparkStore {
  version: '1.0';
  sparks: SparkItem[];
  lastUpdated: string;
}

// TaskStore
interface TaskStore {
  version: '1.0';
  activePlanId?: string;
  tasks: Record<string, TaskNode>;
  history: TaskExecutionRecord[];
  config: {
    maxConcurrentAgents: number;
    retryLimit: number;
    autoResume: boolean;
  };
  lastUpdated: string;
}
```

---

## Phase 2: Plan Mode - 任务规划

### 实现内容

#### 1. plan_tool.ts - Plan 模式工具
**路径**: `packages/agent/src/tools/task_tools/plan_tool.ts`

**核心功能**:
- 接受用户目标描述（goal）和可选上下文（context）
- 调用 LLM 生成结构化的 Markdown Plan 文件
- 保存到 `.claude/plans/{timestamp}_{goal}.md`
- 返回生成的 plan 内容和文件路径

#### 2. planPrompt.ts - 规划提示词模板
**路径**: `packages/agent/src/prompts/planPrompt.ts`

**核心功能**:
- 提供结构化的规划提示词模板
- 输出包含项目概述、技术背景、实施阶段、依赖关系和后续行动的 Markdown 文档
- 遵循 SMART 原则（Specific、Measurable、Achievable、Relevant、Time-bound）

---

## Phase 3: Kanban UI - 看板界面

### 实现内容

#### 1. TaskPanel.tsx - TUI 面板组件
**路径**: `zen-code/src/chat/components/TaskPanel.tsx`

**核心功能**:
- 使用统一面板系统（UniversalPanel）展示任务列表
- 支持按状态过滤（全部、待领取、运行中、已完成、失败）
- 支持任务搜索（标题和描述）
- 显示任务统计信息（运行中、已完成、失败数量）
- 快捷键支持（`r` 刷新任务列表）

**状态配置**:
```typescript
const STATUS_CONFIG = {
    pickup: { emoji: '📥', color: 'cyan', label: '待领取' },
    running: { emoji: '🔄', color: 'yellow', label: '运行中' },
    complete: { emoji: '✅', color: 'green', label: '已完成' },
    error: { emoji: '❌', color: 'red', label: '失败' },
    review: { emoji: '👀', color: 'blue', label: '待审核' },
    feedback: { emoji: '💬', color: 'magenta', label: '待反馈' },
};
```

#### 2. store/tasks.ts - Store 集成层
**路径**: `zen-code/src/chat/store/tasks.ts`

**核心功能**:
- 封装 TaskStoreManager，提供 React 友好的 API
- 单例模式，确保全局唯一实例
- 自动初始化和错误处理
- 提供任务统计功能

#### 3. 命令系统集成

**修改文件**:
- `zen-code/src/chat/commands/implementations.ts` - 添加 `/task` 命令
- `zen-code/src/chat/commands/types.ts` - 添加 `switchToTask` 到 CommandContext
- `zen-code/src/chat/context/CommandHandler.tsx` - 更新 props 和执行逻辑

#### 4. Chat.tsx 集成

**变更**:
1. 导入 TaskPanel 组件
2. 更新 activeView 类型添加 'task'
3. 添加 switchToTask 回调函数
4. 传递 switchToTask 到 ChatInput 和 CommandHandler
5. 添加 TaskPanel 渲染逻辑

### 关键路径修复

**问题**：TaskPanel.tsx 中的动态导入路径错误

**错误路径**：
```typescript
const { getTasksStore } = await import('../../store/tasks');
```

**正确路径**：
```typescript
const { getTasksStore } = await import('../store/tasks');
```

**原因**：TaskPanel 在 `src/chat/components/`，store 在 `src/chat/store/`，相对路径应为 `../store/tasks`

---

## 设计决策记录

1. **任务优先级**：FIFO（按创建时间，先进先出）
2. **任务依赖**：DAG 检测（启动前检测循环依赖）
3. **并行限制**：全局限制（所有 agent 总数 <= N）
4. **Plan 版本控制**：锁定执行中的 Plan（不允许修改）
5. **任务超时**：不需要（依赖人工干预）
6. **跨 Project**：项目级存储（.claude/spark.json，每个项目独立）
7. **任务模板**：不需要（每次从 Spark 生成）
8. **任务结构**：固定 2 层（root.children 并行，children.children 串行）

---

## 使用方式

### Plan Mode
```bash
# 在 TUI 中输入
请帮我规划一个用户认证系统

# Agent 会自动调用 plan_tool
# 生成的 plan 保存到 .claude/plans/{timestamp}_{goal}.md
```

### Kanban UI
```bash
# 三种命令方式
/task
/tasks
/kanban

# 在看板中
- ↑↓ 导航任务列表
- Enter 选择任务
- Tab 切换状态过滤器
- / 搜索任务
- r 刷新任务列表
- q 关闭面板
```

---

## 架构亮点

1. **固定 2 层架构** - 简化任务树结构，避免过度嵌套
2. **统一面板系统复用** - 获得虚拟滚动、搜索过滤、统一导航
3. **Store 单例模式** - 全局唯一实例，避免重复初始化
4. **命令系统集成** - 统一入口、自动补全、别名支持
5. **类型安全** - 全链路 TypeScript 类型定义
6. **动态导入优化** - 按需加载 store 模块
7. **Web Crypto API** - 避免额外依赖，原生支持 UUID

---

## 适用场景

- 需要多类型 agent 并行工作的场景
- 需要 2 层任务层级的应用
- 依赖人工干预的任务执行系统
- 需要项目级存储的任务管理

**不适用场景**：
- 需要 3 层以上任务层级
- 需要动态调整任务树结构
- 需要自动超时恢复的系统

---

## 相关文件

### 核心类型和存储
- `packages/config/src/types/task.ts` - 核心类型定义
- `packages/config/src/implementations/taskStore.ts` - 任务系统存储
- `packages/config/src/implementations/sparkStore.ts` - Spark List 存储

### Phase 2 - Plan Mode
- `packages/agent/src/tools/task_tools/plan_tool.ts`
- `packages/agent/src/prompts/planPrompt.ts`

### Phase 3 - Kanban UI
- `zen-code/src/chat/components/TaskPanel.tsx`
- `zen-code/src/chat/store/tasks.ts`
- `zen-code/src/chat/commands/implementations.ts`
- `zen-code/src/chat/context/CommandHandler.tsx`
- `zen-code/src/chat/Chat.tsx`
