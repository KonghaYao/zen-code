---
name: 'core-architecture'
description:
    'CodeGraph 项目核心架构记忆集：包含 2025Q1 完整重构、standard-agent 模块架构、子代理系统（SubAgent）、任务系统（Task
    System）的完整设计与实现。涵盖分层架构、动态工具系统、AgentPackage、2 层任务树、DAG 依赖、LangGraph
    集成等核心架构设计。'
tags:
    [
        'architecture',
        'refactoring',
        'agent-system',
        'task-system',
        'subagents',
        'langgraph',
        'middleware',
        'agentpackage',
        'dynamic-tools',
    ]
category: 'architecture'
created: '2025-01-13'
last_updated: '2026-02-17'
priority: 'high'
context_scope: 'project'
---

# 核心架构设计

## 概述

本文档整合 CodeGraph 项目的核心架构设计，包括完整重构、Agent 系统、子代理系统和任务系统的完整实现。

---

## 一、2025 Q1 完整重构

### 重构范围

从零散组件到统一架构，涵盖六大核心领域：

- UI 交互系统 v2.0
- TUI 面板系统
- 配置管理统一
- 跨平台支持
- 代码共享
- 前端集成

### 核心架构模式

**分层架构**：

```
┌─────────────────────────────────────┐
│   UI 层（TUI + Web UI）              │
├─────────────────────────────────────┤
│   业务逻辑层（Context + Hooks）      │
├─────────────────────────────────────┤
│   数据层（LowDB + LangGraph）       │
└─────────────────────────────────────┘
```

**泛型组件系统**：

- `UniversalPanel<T>` 支持任意数据类型
- 类型安全的渲染器注册系统
- 可插拔渲染器架构

**依赖注入**：

- Context 提供全局状态
- Hooks 封装业务逻辑
- Props 传递依赖

### 关键决策

**统一 InteractionContext 迁移到 union-client**：

- 原因：zen-code 和 zen-worker 共享代码
- 效果：减少重复代码，统一交互模式

**TUI 面板系统重构**：

- 原因：多个面板各自实现，代码重复
- 效果：统一面板系统，代码复用率提升 60-80%

**配置管理统一**：

- 原因：TUI 和 Web UI 配置不一致
- 效果：统一配置系统，支持环境变量覆盖

---

## 二、Standard Agent 模块架构

### 重构成果

| 问题           | 解决方案                                                     |
| -------------- | ------------------------------------------------------------ |
| 贫血 Entity 层 | 删除 Entity，Repository 直接返回 `z.infer<Schema>`           |
| 职责重叠       | 拆分为 Repository/Validator/Serializer/Factory（各 <100 行） |
| 循环依赖       | 创建 `schemas.ts` 集中管理所有 Zod Schema                    |
| 代码臃肿       | AgentPackage 从 350 行精简为模块化设计                       |

### 文件结构

```
standard-agent/
├── schemas.ts          # 所有 Zod Schema（解决循环依赖）
├── repository.ts       # CRUD 操作
├── validator.ts        # 数据验证
├── serializer.ts       # 序列化逻辑
├── factory.ts          # 依赖注入
├── package.ts          # 主入口（精简版）
├── storage/
│   ├── abstract.ts     # IStorage 接口
│   └── memory.ts       # MemoryStorage 实现
└── types.ts            # TypeScript 类型
```

### 存储层异步化

所有方法改为异步 API（Promise）：

```typescript
async getModel(id: string): Promise<ModelRow | undefined> {
    return Promise.resolve().then(() => this.models.get(id));
}
```

### 关键修复

**updatePrompt name 索引未更新**：

```typescript
async updatePrompt(data: z.infer<typeof PromptSchema>): Promise<void> {
    // 删除旧索引，添加新索引
    this.promptsByName.delete(oldName);
    this.promptsByName.set(newName, data.id);
}
```

**transaction 回滚机制**：

```typescript
async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.inTransaction) return fn();

    this.inTransaction = true;
    const snapshot = this.snapshot();

    try {
        const result = await fn();
        this.inTransaction = false;
        return result;
    } catch (error) {
        this.restore(snapshot);  // 回滚到快照
        this.inTransaction = false;
        throw error;
    }
}
```

---

## 三、子代理系统（SubAgent System）

### 系统概述

专业化子代理系统通过 LangGraph switchBranch 机制实现任务路由，允许用户通过命令切换不同能力的 agent。

### 当前可用的 Agents

#### 1. **default** - 代码实现助手

- **ID**: `default`
- **名称**: Jarvis
- **工具**: 文件操作、搜索、执行、交互
- **中间件**: agents_md、skills、memories、mcp、subagents

#### 2. **manager** - 任务管理员

- **ID**: `manager`
- **工具**: 与 default 相同
- **中间件**: agents_md、skills、memories、subagents（**不启用 mcp**）

### 配置系统

**统一配置文件**：`packages/agent/src/subagents/config.ts`

```typescript
export interface AgentConfig {
    id: string;
    name: string;
    description: string;
    system_prompt: string; // Prompt ID
    model: string; // Model ID
    tools: Record<string, boolean | any>; // Tool ID -> enabled/params
    middleware: Record<string, boolean | any>; // Middleware ID -> enabled/params
}
```

### AgentPackage 系统集成

**图路由逻辑**：`packages/agent/src/graphBuilder.ts`

```typescript
export const graph = new StateGraph(CodeState)
    .addNode('graph', async (state: CodeStateType, runtime: Runtime) => {
        const { switch_command: cmd } = state;

        // 特殊分支：智能记忆
        if (cmd === 'smart_memory') return switchBranch.smart_memory(state);

        // Load agent package (cached after first load)
        const pkg = await loadDefaultConfigs();

        // Determine agent ID (from command or default)
        const availableAgents = await getAvailableAgentIds(pkg);
        const agentId = cmd ? `agents/${cmd}` : 'agents/default';

        if (!availableAgents.includes(agentId)) {
            throw new Error(`Unknown agent: ${cmd || 'default'}`);
        }

        return await invokeAgent(agentId, pkg, state, runtime);
    })
    .compile();
```

### 标准 Agent 工厂 V2

**文件**：`packages/agent/src/subagents/factory-v2.ts`

`createStandardAgentV2` 实现流程：

1. 加载配置：从 AgentPackage 获取 agent 配置
2. 验证配置：确保 agent 配置有效
3. 初始化模型：使用 `initChatModel`
4. 加载工具：根据 `config.tools` 动态加载工具实现
5. 构建中间件链：按 `config.middleware` 顺序添加中间件
6. 加载提示词：从 AgentPackage 获取 system prompt
7. 创建 Agent：返回 `ReactAgent` 实例

#### 工具加载逻辑

```typescript
for (const [toolId, params] of Object.entries(agentConfig.tools)) {
    const toolImpl = toolRegistry.getImplementation(toolId);
    if (!toolImpl) {
        console.warn(`Tool ${toolId} not found in registry`);
        continue;
    }

    // Wrap ToolImplementation.execute to handle ToolMessage return type
    const langChainTool = tool(
        async (input) => {
            const result = await toolImpl.execute(input);
            if (result && typeof result === 'object' && 'content' in result) {
                return (result as any).content;
            }
            return result;
        },
        {
            name: toolImpl.name,
            description: toolImpl.description,
            schema: toolImpl.paramsSchema as any,
        },
    );

    tools.push(langChainTool as any);
}
```

#### 中间件加载逻辑

```typescript
const middleware: AgentMiddleware[] = [];
for (const [middlewareId, params] of Object.entries(agentConfig.middleware)) {
    // 子代理不启用 subagents 中间件（避免无限嵌套）
    if (middlewareId === 'subagents' && isSubAgent) continue;

    const subagentsImpl = pkg.middlewares.getImplementation(middlewareId);
    if (!params) break;

    middleware.push(await subagentsImpl!.execute(params.customParams || {}));
}

// MCP middleware (always enabled)
middleware.push(new MCPMiddleware());
```

---

## 四、任务系统（Task System）

### 系统概述

任务系统支持从灵感到任务执行的全流程管理，采用固定 2 层任务树架构，6 状态任务机，DAG 依赖检测。

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
- 失败后可从失败节点重新执行

### DAG 依赖检测

```typescript
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
```

### 核心实现

#### 1. 递归类型解决方案

**问题**：TaskNode 需要引用自身（children: TaskNode[]），使用 `type` 别名会导致循环引用错误。

**解决方案**：使用 `interface` 定义类型，Zod schema 用于验证

```typescript
// 使用 interface 支持递归类型
export interface TaskNode {
    id: string;
    title: string;
    description: string;
    execution?: TaskExecution;
    children?: TaskNode[]; // 递归引用
    agentType?: AgentType;
    status?: TaskStatus;
}

// Zod schema 用于验证（使用 z.lazy）
export const TaskNodeSchema: z.ZodType<TaskNode> = z.lazy(() =>
    z.object({
        children: z.array(z.lazy(() => TaskNodeSchema)).optional(),
    }),
);
```

#### 2. UUID 生成策略

**决策**：使用 Web Crypto API 替代 uuid 库

```typescript
private generateId(): string {
  return crypto.randomUUID();
}
```

#### 3. 目录自动创建

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

```
.claude/
├── spark.json          # Spark List 存储（项目级）
├── task.json           # 任务状态存储（项目级）
└── plans/              # Plan 文件目录
    ├── plan-20250124-001.md
    └── plan-20250124-002.md
```

---

## 五、动态工具命令系统

### 背景与问题

原工具系统存在以下问题：

- 工具列表静态硬编码在系统提示词中
- 无法运行时动态查询可用工具
- 批量执行需要多次函数调用
- 提示词缓存失效（Anthropic Prompt Caching）

### 解决方案

**核心设计**：CommandSystemMiddleware 类

```typescript
class CommandSystemMiddleware {
    // 批量执行多个工具
    batch_command: Tool;

    // 查询所有可用工具
    list_available_commands: Tool;

    // 工具注册方法
    registerTools(tools: Tool[]): void;
}
```

**关键特性**：

1. **批量执行**：一次调用执行多个工具

    ```typescript
    {commands: [{name: "read_file", args: {...}}, {name: "grep", args: {...}}]}
    ```

2. **运行时查询**：动态获取已注册工具列表

3. **静态系统提示词**：工具列表动态加载，支持 Anthropic Prompt Caching

4. **工具来源**：
    - MCP 提供的工具（添加到 CommandSystem）
    - 系统内置工具（手动注册到 CommandSystem）
    - 其他注册的工具（可用但不一定在 CommandSystem）

### 实现细节

**手动指定工具**：

```typescript
// factory.ts
const commandSystem = new CommandSystemMiddleware();
const commandTools = [read_tool, glob_tool]; // 手动指定工具
if (config.middleware.mcp) {
    const mcpTools = await MCPManager.getInstance().getAllTools();
    commandTools.push(...mcpTools);
}
commandSystem.registerTools(commandTools);
```

**系统提示词注入**：

```typescript
wrapModelCall(req, handler) {
  // 注入 Command System 能力说明到系统提示词
  const enhancedPrompt = this.injectCommandSystemDescription(req.systemPrompt);
  return handler({ ...req, systemPrompt: enhancedPrompt });
}
```

---

## 六、配置管理

### zen-code 配置路径迁移

**新路径**：`~/.zen-code/settings.json`

**目录自动创建**：

```typescript
// tui/src/chat/store/index.ts
const zenConfigDir = join(homedir(), '.zen-code');
const dbPath = join(zenConfigDir, 'settings.json');

if (!existsSync(zenConfigDir)) {
    mkdirSync(zenConfigDir, { recursive: true });
}
```

### 配置结构

```json
{
  "provider_id": "openai",
  "model_id": "qwen-plus",
  "providers": [
    {
      "id": "openai",
      "type": "openai",
      "apiKey": "sk-...",
      "baseUrl": "https://api.openai.com/v1"
    },
    {
      "id": "anthropic",
      "type": "anthropic",
      "apiKey": "sk-ant-..."
    }
  ],
  "enable_thinking": true,
  "mcp_config": { "filesystem": {...} }
}
```

---

## 设计决策总结

| 决策              | 理由                                  |
| ----------------- | ------------------------------------- |
| 删除 Entity 层    | 贫血模型无价值，Zod Schema 已包含验证 |
| 单一职责拆分      | 每个模块 <100 行，易于测试和维护      |
| Schema 独立文件   | 物理隔离打破循环依赖                  |
| 全异步 API        | 统一接口，支持 I/O 操作               |
| 固定 2 层任务树   | 简化任务树结构，避免过度嵌套          |
| AgentPackage 系统 | 统一的配置、工具、中间件管理          |
| MCP 始终启用      | MCP 是重要的工具扩展机制              |
| 子代理嵌套保护    | 避免无限嵌套导致的问题                |

---

## 相关文件

### 重构

- `packages/union-client/` - 共享客户端代码
- `packages/config/src/` - 统一配置系统

### Standard Agent

- `packages/agent/src/subagents/` - SubAgent 系统
- `packages/agent/src/subagents/factory-v2.ts` - Agent 工厂 V2
- `packages/agent/src/graphBuilder.ts` - Graph 路由逻辑
- `packages/agent/src/middlewares/` - 中间件实现

### 任务系统

- `packages/config/src/types/task.ts` - 核心类型定义
- `packages/config/src/implementations/taskStore.ts` - 任务系统存储
- `packages/config/src/implementations/sparkStore.ts` - Spark List 存储
- `packages/agent/src/tools/task_tools/plan_tool.ts` - Plan 模式工具

### 动态工具系统

- `packages/agent/src/middlewares/commandSystem/` - CommandSystemMiddleware
- `packages/agent/src/tools/` - 工具定义
