# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概述

Zen Code 是一个基于 LangGraph 构建的终端 AI 编程助手，采用复杂的 monorepo 架构。它通过 TUI（终端用户界面）提供类似
Claude Code 和 Gemini CLI 的体验，具备 Skills、SubAgents 和完整的任务系统等高级功能。

## Monorepo 结构

```
code-graph/
├── packages/
│   ├── config/          # 配置和存储层 (LowDB)
│   ├── agent/           # LangGraph 代理系统和中间件
│   └── union-client/    # React hooks 和工具
├── zen-code/           # 主 TUI 应用 (React/Ink)
├── zen-worker/         # 基于 Web 的伴侣应用
└── pnpm-workspace.yaml # 工作区配置
```

## 开发命令

### 构建

```bash
# 构建所有包和应用
pnpm build

# 构建特定组件
pnpm build:packages      # 构建 @codegraph/config 和 @codegraph/agent
pnpm build:zen-code      # 构建 TUI 应用
pnpm build:zen-worker    # 构建 web worker
```

### 开发

```bash
# 启动代理服务器 (LangGraph 后端)
pnpm dev:server

# 启动 TUI 开发服务器
pnpm dev:tui

# 启动 web worker
pnpm dev:web

# 并行启动所有开发服务器
pnpm dev:all
```

### 运行时

-   Bun 运行时用于开发 (`bun run`)
-   Node.js 用于生产构建 (`node --env-file=.env zen-code/dist/cli.mjs`)

## 架构

### 设计系统工作流 (Spark → Plan → Task → Execution)

系统实现了 4 阶段工作流来管理开发工作：

#### 1. Spark 系统

轻量级的想法/bug/功能收集

-   **存储**: `.claude/spark.json` (LowDB)
-   **类型**: `idea`, `bug_report`, `feature`, `refactor`
-   **命令**: `/spark <text> [#tag1 #tag2]`
-   **实现**: `packages/config/src/implementations/sparkStore.ts`

#### 2. 计划模式

将 sparks 转换为可执行的实施计划

-   **命令**: `/spark-to-task`
-   **流程**: 使用 `writing-plans` skill 生成结构化的 markdown 计划
-   **输出**: `.claude/plans/*.md`

#### 3. 任务系统

具有代理分配的分层任务管理

-   **存储**: `.claude/task.json` (LowDB)
-   **架构**: **固定 2 层结构**
    -   第 1 层: 并行任务组（每个分配给不同的代理）
    -   第 2 层: 组内的串行任务
-   **状态机**: `pickup` → `running` → `complete`/`error`/`review` ← `feedback`
-   **类型定义**: `packages/config/src/types/task.ts:75-105`

#### 4. 执行

代理使用完整的上下文和工具访问权限执行任务

-   **任务工具**: `add_task`, `commit_task`
-   **LangGraph 集成**: 每个任务都有用于状态管理的 `threadId`

### 代理系统

#### 代理配置

代理在 `packages/agent/src/subagents/config.ts` 中定义，包括：

-   **tools**: 工具名称数组（或 `'all'`）
-   **middleware**: 选择性中间件启用
    -   `agents_md`: 代理文档
    -   `skills`: 渐进式技能发现
    -   `memories`: 知识持久化
    -   `mcp`: Model Context Protocol
    -   `subagents`: 任务委托

#### 可用的代理类型

-   `default` (Jarvis) - 全功能代码助手
-   `planner` - 任务规划和分解
-   `reviewer` - 代码审查和验证
-   `refactor` - 重构辅助
-   `finder` - 文件搜索和导航
-   `debugger` - 调试和故障排除

#### LangGraph 状态管理

```typescript
// packages/agent/src/state.ts:24-29
export const CodeState = AgentState.extend(SubAgentStateSchema.shape).extend({
    main_model: z.string().default('qwen-plus'),
    agent_name: z.string().default('Code Agent'),
    switch_command: z.string().optional(),
    enable_thinking: z.boolean().default(true),
});
```

### 中间件架构

`packages/agent/src/middlewares/` 中的中间件提供横切关注点：

1. **SkillsMiddleware** (`skills.ts`)

    - 渐进式披露: 系统提示中的元数据，按需提供完整内容
    - 用户技能: `~/.claude/{agent}/skills/`
    - 项目技能: `.claude/skills/`
    - 用于元数据的 YAML frontmatter 解析

2. **MemoriesMiddleware** (`memories.ts`)

    - 持久化知识存储
    - 用户记忆: `~/.claude/{agent}/memories/`
    - 项目记忆: `.claude/memories/`

3. **CommandSystemMiddleware** (`commandSystem.ts`)

    - 斜杠命令处理
    - 内置和自定义命令
    - 命令建议

4. **SubAgentsMiddleware** (`subagents.ts`)
    - 任务委托给专业代理
    - Finder 代理用于文件操作
    - Debugger 代理用于故障排除

### TUI 架构

#### 组件结构

```
Chat/
├── Chat.tsx                    # 主聊天容器
├── components/
│   ├── ChatInputBuffer.tsx    # 带缓冲的魔法输入
│   ├── MessageBox.tsx         # 消息渲染
│   ├── UniversalPanel.tsx     # 可重用面板组件
│   ├── TaskPanel.tsx          # 任务管理面板
│   └── StatusBar.tsx          # 状态信息
├── interaction/
│   └── UnifiedUIPanel.tsx     # 人机交互 UI
└── context/
    ├── CommandHandler.tsx     # 命令处理
    └── SettingsContext.tsx    # 配置管理
```

#### 关键模式

1. **输入缓冲**: AI 忙碌时消息排队 (`ChatInputBuffer`)
2. **面板系统**: 可切换视图（聊天、历史、知识、模型、代理、任务）
3. **统一交互**: 所有人机交互使用单个组件
4. **命令系统**: 带自动完成的斜杠命令 (`zen-code/src/chat/commands/`)

### 存储层 (LowDB)

所有持久化数据使用带有 JSON 适配器的 LowDB：

-   **模式**: `packages/config/src/implementations/taskStore.ts`
-   **文件**:
    -   `.claude/spark.json` - Spark 列表存储
    -   `.claude/task.json` - 任务系统存储
    -   `.claude/config.json` - 用户配置

### 构建系统

#### Vite 配置

-   **框架**: React 19 配合 Ink.js 用于 TUI
-   **插件**: `@vitejs/plugin-react`
-   **外部依赖**: Node.js 和 bun APIs 打包，依赖预打包
-   **入口点**: `cli.ts`, `app.tsx`, `zen-init.tsx`, `zen-keyboard.tsx`
-   **特殊处理**: `rollup-plugin-node-externals` 与特定包含项（lowdb、chalk 等）

#### TypeScript 编译

-   **包**: 原生 TypeScript 编译 (`tsc`)
-   **Zen-Code**: Vite 配合 React 转换

## 重要的架构决策

### 1. 固定 2 层任务结构

任务系统使用**非递归的 2 层架构**：

```typescript
Root Task
├── Task Group A (execution: parallel)  // 不同代理并行工作
│   ├── Task 1
│   └── Task 2
└── Task Group B (execution: serial)    // 组内顺序任务
    └── Task 3
```

**理由**: 简化依赖解析同时支持并行执行。

### 2. 渐进式技能披露

技能遵循两阶段发现模式：

1. **元数据阶段**: 代理从 YAML frontmatter 了解名称/描述
2. **完整内容阶段**: 代理在相关时读取完整的 SKILL.md

**理由**: 减少系统提示大小同时保持可发现性。

### 3. 本地优先存储

所有数据存储在 `.claude/` 目录中的 LowDB JSON 文件中。

**理由**: 隐私、离线访问、简单调试。

**权衡**: 设备间不同步。

### 4. TUI 优先设计

使用 Ink.js（CLI 的 React）的终端原生 UI。

**理由**: 快速迭代、原生终端集成。

**权衡**: 与 Web UI 相比视觉能力有限。

### 5. 代理特定的中间件

每个代理可以有选择地启用中间件功能。

**理由**: 为每个代理定制能力（例如，planner 不需要 subagents）。

## 扩展点

### 自定义技能

在以下位置创建技能：

-   用户级别: `~/.claude/{agent}/skills/{skill-name}/SKILL.md`
-   项目级别: `.claude/skills/{skill-name}/SKILL.md`

格式: YAML frontmatter + markdown 内容

### 自定义命令

在 `zen-code/src/chat/commands/` 中扩展命令注册表

-   实现 `CommandDefinition` 接口
-   在 `registry.ts` 中注册

### 自定义代理

在 `packages/agent/src/subagents/config.ts` 中添加新的代理类型

-   定义代理配置
-   指定工具和中间件
-   实现专门的提示

### 自定义中间件

在 `packages/agent/src/middlewares/` 中实现 `AgentMiddleware` 接口

## 类型系统

### 任务类型 (`packages/config/src/types/task.ts`)

-   `TaskNode`: 递归任务结构（实际强制为 2 层）
-   `TaskStatus`: 6 状态机 (`pickup`, `running`, `complete`, `error`, `review`, `feedback`)
-   `AgentType`: 6 种代理类型 (default, planner, reviewer, refactor, finder, debugger)
-   `SparkItem`: 带类型、优先级和元数据的 Spark 结构

### 状态类型 (`packages/agent/src/state.ts`)

-   `CodeState`: LangGraph 状态扩展
-   `SubAgentStateSchema`: 子代理的基础状态

## 配置

### 环境变量

-   `PROJECT_ROOT`: 覆盖项目根路径
-   `MODEL_PROVIDER`: 'openai' 或 'anthropic'
-   `YOLO_MODE`: 跳过安全检查用于测试

### 基于文件的配置

-   用户级别: `~/.claude/settings.json`
-   项目级别: `.claude/config.json`
-   环境: `.env` 文件

## 需要理解的关键文件

-   `packages/config/src/types/task.ts` - 任务系统类型定义
-   `packages/config/src/implementations/taskStore.ts` - 任务持久化层
-   `packages/config/src/implementations/sparkStore.ts` - Spark 持久化层
-   `packages/agent/src/state.ts` - LangGraph 状态定义
-   `packages/agent/src/subagents/config.ts` - 代理配置
-   `packages/agent/src/middlewares/skills.ts` - Skills 系统实现
-   `zen-code/src/chat/Chat.tsx` - 主 TUI 容器
-   `zen-code/src/chat/commands/sparkToTaskCommand.ts` - 设计模式工作流
-   `zen-code/vite.config.ts` - 带特殊打包的构建配置

## 开发模式

### 添加新任务类型

1. 在 `packages/config/src/types/task.ts` 中定义
2. 更新 Zod schemas
3. 实现存储操作
4. 在 `zen-code/src/chat/components/TaskPanel.tsx` 中添加 UI 组件

### 添加新中间件

1. 在 `packages/agent/src/middlewares/` 中实现
2. 从 `index.ts` 导出
3. 在代理配置中配置
4. 如需要更新系统提示

### 添加新命令

1. 在 `zen-code/src/chat/commands/` 中创建
2. 实现 `CommandDefinition` 接口
3. 在 `registry.ts` 中注册
4. 如需要添加自动完成

## 依赖项

### 核心框架

-   **LangGraph**: 代理编排和状态管理
-   **React 19**: UI 框架
-   **Ink.js**: 终端 UI 渲染
-   **LowDB**: 基于 JSON 的数据库
-   **Zod**: Schema 验证

### AI/ML

-   **@langchain/anthropic**: Anthropic 集成
-   **@langchain/openai**: OpenAI 集成
-   **@langgraph-js/sdk**: LangGraph 客户端 SDK

### 构建工具

-   **Vite**: 构建工具和开发服务器
-   **TypeScript**: 类型和编译
-   **Babel**: React 转换
