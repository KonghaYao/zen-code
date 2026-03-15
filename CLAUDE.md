# 仓库指南

Monorepo：LangGraph 后端（`packages/agent/`）+ 配置系统（`packages/config/`）+ 共享库（`packages/standard-agent/`、`packages/agent-middlewares/`）+ 客户端（`zen-code/`、`zen-swarm/`、`zen-core/`、`zen-desktop/`）

## 项目结构

```
code-graph/
├── packages/                    # Monorepo 包
│   ├── agent/                  # LangGraph 后端核心（应用层）
│   ├── config/                 # 配置系统（基于 LowDB）
│   ├── ink-pro/                # 共享 Ink 组件（TUI）
│   ├── union-client/           # 共享客户端逻辑
│   ├── standard-agent/         # Agent 系统库（AgentPackage、中间件基类）
│   └── agent-middlewares/      # 可复用中间件实现
├── zen-core/                   # 统一后端服务（端口 8125）
├── zen-code/                   # TUI CLI 工具
├── zen-swarm/                  # Web UI 代理服务器（端口 8124）
├── zen-desktop/                # 桌面应用（Electrobun）
├── .claude/
│   └── skills/                 # 项目级 Skills
└── specs/                      # 功能文档
```

**参考**：各包目录内有详细结构说明

## 开发命令

```bash
# 后端（推荐流程）
bun run dev:core            # zen-core 统一服务（端口 8125）
bun run dev:swarm           # Web UI 代理服务器（端口 8124），需先启动 zen-core

# TUI
bun run dev:tui             # TUI 应用（zen-code）
bun run dev:all             # zen-core + TUI 并行启动（推荐）

# 桌面
bun run dev:desktop         # zen-desktop（Electrobun）

# 构建
bun run build               # 构建所有包
bun run build:packages      # 仅构建 packages
bun run build:zen-code      # 仅构建 TUI

# 测试
bun test                    # 运行所有测试
bun run test:run            # 单次运行测试
bun run test:coverage       # 生成覆盖率报告
bun run test:watch          # 监听模式
```

**测试配置**：

- 框架：Vitest，happy-dom 环境
- 配置：根目录 `vitest.config.ts`
- 覆盖率：v8 provider，text/json/html 报告
- 初始化：`zen-code/src/__tests__/setup.ts`

**测试文件位置规则**：

- Packages：`packages/**/*.test.ts`
- zen-code：`zen-code/src/**/*.{test,testx}.{ts,tsx}`
- zen-swarm：`zen-swarm/src/**/*.test.ts`

**覆盖率排除项**：

- `**/__tests__/**`
- `**/*.test.{ts,tsx}`
- `**/dist/**`
- `**/node_modules/**`

## 配置

**用户配置**：`~/.zen-code/settings.json`

**配置系统**：`packages/config/src/implementations/FileSystemConfigStore.ts`

**架构**：

- FileSystemConfigStore
- ConfigManager：统一配置访问，自动同步到环境变量
- ConfigServer：基于 Hono 的 REST API，用于远程配置管理
- 自动同步到 `process.env`：`MODEL_PROVIDER`、`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`

**多 Provider 架构**：

- 格式：`provider_id` + `model_id` + `providers[]` 数组
- 自动从旧格式迁移
- 根据当前 `provider_id` 同步环境变量

**环境变量**（可覆盖配置文件）：

```bash
MODEL_PROVIDER=openai|anthropic
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
YOLO_MODE=true              # 禁用 HITL（危险）
```

**Provider 管理**：

- 命令：`/provider` 打开配置面板
- UI：`zen-code/src/chat/components/ProviderPanel.tsx`

## 状态管理

**核心原则**：库与应用层分离

**架构**：TanStack Query hooks **仅在 zen-code 应用层**实现

**原因**：

- `packages/` 是被多个应用共享的库
- 影响范围小，易于回滚
- 职责清晰：库提供基础 API，应用层负责状态管理

**关键文件**：

- Hooks：`zen-code/src/chat/hooks/`
- Query keys：`zen-code/src/chat/query-keys.ts`
- Query Client：`zen-code/src/chat/QueryClientProvider.tsx`
- Context：`zen-code/src/chat/context/SettingsContext.tsx`

**实现规范**：

1. 所有 TanStack Query hooks 必须放在 `zen-code/src/chat/hooks/`
2. `packages/` 仅提供基础 CRUD 操作
3. 从应用层导入：`../context/SettingsContext`（不用 `@codegraph/union-client`）
4. 在 `zen-code/src/chat/query-keys.ts` 中定义 query keys

**性能优化**：

- UniversalPanel：用 `useRef` + `useMemo` 稳定引用
- 组件：用 `useMemo` + `useCallback`，最小化依赖
- 参考：`packages/ink-pro/src/components/Panel/usePanelNavigation.ts`

**已迁移组件**：

- `ModelPanel.tsx`、`TaskPanel.tsx`、`HistoryPanel.tsx`、`KnowledgePanel.tsx`、`ProviderPanel.tsx`

**可用 Hooks**：

- `useConfig`、`useUpdateConfig` - 配置管理
- `useSkills`、`useSaveSkill`、`useDeleteSkill` - Skills 管理
- `useModels` - 模型列表获取（30s 超时，网络/超时错误重试）
- `useTasks`、`useDeleteTask`、`useUpdateTaskStatus` - 任务管理
- `useHistory` - 聊天历史查询
- `useKnowledge` - 知识库（memories + skills）
- `useProviders` - Provider 列表查询
- `useAgents` - Agent 列表查询

## 架构

### 三层架构

代码库严格遵循三层分离：

1. **框架层**（`packages/standard-agent/`、`packages/agent-middlewares/`）
    - 通用、可复用组件
    - 无应用层特定依赖
    - 作为独立包发布

2. **应用层**（`packages/agent/`、`packages/config/`）
    - 项目特定业务逻辑
    - 依赖框架层
    - 实现领域特定功能

3. **客户端层**（`zen-code/`、`zen-swarm/`、`zen-core/`、`zen-desktop/`）
    - 用户界面与服务入口
    - `zen-core/`：统一后端服务（所有业务逻辑、数据存储）
    - `zen-swarm/`：Web UI 代理（鉴权 + 前端，委托给 zen-core）
    - `zen-code/`：TUI CLI，通过 `ZenCoreContext` 连接 zen-core
    - `zen-desktop/`：桌面应用（Electrobun）

### Standard Agent 包

**包名**：`@langgraph-js/standard-agent`

**用途**：统一的 agent 包系统，用于工具、中间件和存储

**核心组件**：

- **AgentPackage**：中央协调器，管理 repository、validator、serializer 和运行时注册表
- **AgentRepository**：models、prompts、tools、middlewares、agents 的 CRUD 操作
- **AgentValidator**：根据可用工具/中间件验证 agent 配置
- **AgentSerializer**：agent 配置的 JSON 导入/导出
- **Storage 抽象**：内存存储、SQLite（平台相关）
- **运行时注册表**：ToolRegistry、MiddlewareRegistry，用于动态发现

**使用示例**：

```typescript
import { AgentPackage } from '@langgraph-js/standard-agent';
import { MemoryStorage } from '@langgraph-js/standard-agent/storage/memory';

const storage = new MemoryStorage();
const pkg = await AgentPackage.fromStorage(storage);

// 注册运行时工具
pkg.tools.register('my_tool', myToolImplementation);

// 使用已注册工具和中间件创建 agent
const agent = await createAgent({
    pkg,
    model,
    systemPrompt,
});
```

**参考**：`packages/standard-agent/src/package.ts`

### Zen Core（统一服务）

**服务**：`zen-core/src/server.ts`（端口 8125）

**架构**：

- 基于 Hono 的 HTTP 服务器，提供所有后端服务
- tRPC API：`AppRouter` 从 `zen-core/src/router.ts` 导出
- 无鉴权（本地服务，直接信任所有本地请求）
- LangGraph 流式传输：`/api/langgraph`
- Terminal WebSocket：`/ws/terminal`

**主要路由**（`zen-core/src/routes/`）：

- `config`、`models`、`skills`、`tasks`、`agents`、`knowledge`、`processes`
- `mcp`、`workspaces`、`cron`、`prompts`、`middlewares`

**运行时数据**：

- **数据库**：`~/.zen-core/data.db`（SQLite via Kysely）
- **配置**：`~/.zen-code/settings.json`
- **PID 文件**：`~/.zen-core/zen-core.pid`（防孤儿进程）

**参考**：`zen-core/src/bootstrap.ts`（服务容器单例）

### Zen Swarm（Web UI 代理）

**服务**：`zen-swarm/src/server.ts`（端口 8124）

**架构**：

- **纯代理模式**：启动时通过 `connectToZenCore` 确保 zen-core 运行
- 大部分 `/api/*` 请求转发到 `http://127.0.0.1:8125`
- 本地处理：`/api/auth/*`、`/api/trpc/postman.*`、`/api/trpc/providers.*`、`/api/trpc/files.*`
- Terminal WebSocket `/ws/terminal` 本地处理
- React + Vite 前端，`/ui` 提供静态文件

**前端 tRPC**：`zen-swarm/src/frontend/api.ts` 使用本地
`FullAppRouter`（包含 providers、store、postman 等），长期应迁移到 zen-core 的 `AppRouter`

**主要功能**：

- **Finder**：文件浏览器，支持 ripgrep 搜索
- **工作区管理**：多工作区隔离存储
- **四面板布局**：Finder、工作区、聊天、任务

**参考**：`zen-swarm/src/server.ts`、`zen-swarm/src/frontend/api.ts`

### 图系统

**动态 Agent 路由**，通过 `active_agent` 实现

**参考**：`packages/agent/src/graphBuilder.ts`

**可用 Agent**（配置于 `subagents/config.ts`）：

- `default` - "Jarvis"，全能力（代码实现助手）
- `manager` - 任务管理员（专注任务管理）

**关键区别**：`default` 启用包括 MCP 在内的所有中间件，`manager` 禁用 MCP

### 中间件系统

**动态组合**（不再是固定链）

**参考**：`packages/agent/src/subagents/factory-v2.ts`

**分层架构**：

1. **`packages/standard-agent/`** - 框架层，可复用中间件基类
2. **`packages/agent-middlewares/`** - 具体实现（FilesystemMiddleware、TerminalMiddleware）
3. **`packages/agent/`** - 应用层，项目特定中间件

**可用中间件**：

**来自 `@langgraph-js/standard-agent`**（框架层）：

- `SubAgentsMiddleware` - 任务委托给专用子 agent（通用，依赖注入）
- `MCPMiddleware` - 统一 MCP 服务器连接与工具执行
- `MemoriesMiddleware` - 渐进式加载 `.claude/memories/`
- `SkillsMiddleware` - 渐进式加载 `.claude/skills/`
- `AgentsMdMiddleware` - 加载 AGENTS.md 项目指引
- `HumanInTheLoopMiddleware` - 敏感操作需用户确认
- `AnthropicCacheMiddleware` - 提示词缓存（仅 Anthropic）

**来自 `@langgraph-js/agent-middlewares`**（具体实现）：

- `FilesystemMiddleware` - 文件与目录操作（read、write、edit、glob、grep、folder）
- `TerminalMiddleware` - 终端命令执行（跨平台 Bash/CMD）

**关键特性**：

- 通过 AgentPackage 动态加载工具和中间件
- 子 agent 不启用 subagents 中间件（避免无限嵌套）
- MCP 始终作为独立中间件启用
- HITL 始终启用，除非设置 `YOLO_MODE=true`

### Skills 系统

**位置**：

- 项目级 Skills：`./.claude/skills/`
- 用户级 Skills：`~/.claude/code/skills/`

**格式**：YAML frontmatter + Markdown

**渐进式加载**：

- Skills 默认不加载到系统提示词
- SkillsMiddleware 仅在相关时注入
- 每个 skill 有 `name` 和 `description` 用于匹配

**可用 Skills**：

- `codebase-exploration` - 代码库深度搜索
- `tanstack-query` - React TanStack Query v5 服务端状态管理
- `find-skills` - 发现并安装 agent skills
- `skill-creator` - 创建 skills 的指引
- `brainstorming` - 创意工作前必须使用
- `langgraph-development` - 用 LangChain/LangGraph 构建 agent
- `tui-development` - 构建 TUI（终端 UI）应用
- `crafting-effective-readmes` - 编写或改进 README
- `humanizer` - 消除 AI 写作痕迹

### 子 Agent 系统

**配置驱动**

**参考**：`packages/agent/src/subagents/config.ts`

**当前 Agent**：

- `default` - 全能力（工具：read、write、glob、grep、terminal、interaction、task；中间件：全部）
- `manager` - 任务管理（相同工具；中间件：agents_md、skills、subagents - **禁用 mcp**）

**关键区别**：

- `default` agent 启用包括 MCP 在内的所有中间件
- `manager` agent 禁用 MCP（专注任务管理）

**架构**：

- 应用层（`packages/agent/`）提供 `createAgent` 回调
- 框架层（`packages/standard-agent/`）提供通用 `SubAgentsMiddleware`
- 依赖注入模式：`createAgent: async (taskId, args, state) => Agent`
- 数据结构：`SubAgentInfo[]` 数组（简单 JSON，无 AgentPackage 依赖）

**未来扩展**：

- 通过 `AgentConfig` 添加专用 agent
- 从 `~/.zen-code/settings.json` 加载
- 从数据库加载
- 远程配置服务

### 工具系统

**分层架构**：

1. **`packages/agent-middlewares/`** - 可复用工具实现（框架层）
    - `filesystem_tools/`：read、write、replace、glob、grep、folder
    - `bash_tools/`：终端命令执行
    - 基础类型：`BaseAgentStateType`（含 `cwd` 字段的通用状态）

2. **`packages/agent/`** - 应用特定工具（应用层）
    - `interaction` - ask_user_with_options（用户确认与输入）
    - `task_tools` - todo 列表管理（todo_write、add_task、commit_task）
    - `memory` - 记忆存储与检索（通过 smart_memory 触发）

**命令系统**（额外能力）：

- `batch_command` - 一次调用执行多个工具
- `list_available_commands` - 运行时查询所有可用工具

**工具注册**：

- CommandSystem **不会**自动注册所有工具
- 通过 `commandSystem.registerTools(commandTools)` 手动注册
- 当前已注册：`read_tool`、`glob_tool` + MCP 工具（若启用）

**参考**：`packages/agent/src/subagents/factory-v2.ts`

**MCP 集成**：

- MCP 工具通过 CommandSystemMiddleware 暴露
- MCPManager 单例管理连接和工具缓存
- 通过 settings 中的 `mcp_config` 配置

## 编码规范

- **TypeScript**：严格模式，`.js` 扩展名，显式返回类型
- **导入**：优先相对路径（`./module` 而非 `../module`）
- **函数**：纯函数、async/await、Zod schema
- **命名**：类用 PascalCase，文件用 kebab-case，布尔值用 `is/has/should` 前缀
- **架构**：单一职责、依赖注入、组合优于继承
- **文件结构**：按功能分组（middlewares/、tools/、subagents/）

## 添加功能

### 添加新工具

**决策**：该工具是可复用的还是应用特定的？

**可复用工具**（添加到 `packages/agent-middlewares/`）：

- 文件操作、终端命令等
- 必须使用 `packages/agent-middlewares/src/index.ts` 中的 `BaseAgentStateType`
- 通过中间件类导出（如 `FilesystemMiddleware`）
- 参考：`packages/agent-middlewares/src/filesystem.ts`

**应用特定工具**（添加到 `packages/agent/src/tools/`）：

- 交互、任务管理、记忆等
- 可使用项目特定状态类型
- 参考：`packages/agent/src/tools/`

**注册**：通过 `pkg.createTool()` 在 AgentPackage 中注册

### 添加新中间件

**决策**：是框架级还是应用特定中间件？

**框架中间件**（添加到 `packages/standard-agent/src/middlewares/`）：

- 通用，跨项目可复用
- 对应用特定逻辑使用依赖注入
- 参考：`packages/standard-agent/src/middlewares/subagents/`

**具体中间件**（添加到 `packages/agent-middlewares/`）：

- 文件系统、终端等
- 实现 `AgentMiddleware` 接口并导出为类
- 参考：`packages/agent-middlewares/src/filesystem.ts`

**应用中间件**（添加到 `packages/agent/src/middlewares/`）：

- 项目特定业务逻辑
- 可依赖应用层类型
- 参考：`packages/agent/src/middlewares/`

**注册**：通过 `pkg.createMiddleware()` 在 AgentPackage 中注册

### 添加新子 Agent

**参考**：`packages/agent/src/subagents/config.ts`

**流程**：

1. 在 `loadAgentsList()` 中添加 agent 配置
2. 通过 `pkg.createPrompt()` 在 AgentPackage 中注册提示词
3. 配置工具和中间件

### 添加新 Skill

**流程**：

```bash
mkdir -p .claude/skills/my-skill
cat > .claude/skills/my-skill/SKILL.md << 'EOF'
---
name: 'my-skill'
description: '该 skill 的功能描述'
---

# My Skill

说明内容...
EOF
```

## 运行时数据

- **记忆**：`.langgraph_api/memory.md`
- **数据库**：`~/.zen-core/data.db`（SQLite via Kysely，zen-core 统一数据库）
- **配置**：`~/.zen-code/settings.json`（用户），`.zen-code/config.json`（项目）
- **zen-code stop** - 通过 PID 文件停止 zen-core 进程
- **zen-code status** - 查询 `/health` 打印运行状态

## 安全

**需要用户确认**（HITL）：

- package.json 变更（添加依赖）
- lint/test/类型检查命令
- 文档/测试文件生成
- 服务启动
- 工作区外的文件写入（可配置）

**YOLO 模式**：设置 `YOLO_MODE=true` 禁用 HITL（不推荐）

## 迁移记录

### 2026 Q1：Zen Core 统一服务层

**架构变更**：

- 原 zen-swarm 的所有后端逻辑迁入独立的 `zen-core/`（端口 8125）
- zen-swarm 改为纯代理：大部分 `/api/*` 转发到 zen-core，仅保留 auth/providers/files/postman 本地路由
- 数据库从 `.langgraph_api/langgraph.db` 迁移到 `~/.zen-core/data.db`
- zen-code 通过 `ZenCoreContext`（`zen-code/src/chat/context/ZenCoreContext.tsx`）连接 zen-core
- `packages/union-client/src/zen-core-client.ts` 提供 `connectToZenCore` 函数

**待完成**：

- zen-swarm 前端 hooks 迁移到使用 tRPC（目前仍有部分使用旧 API）
- zen-swarm `FullAppRouter` 类型长期应从 zen-core `AppRouter` 导入

### 历史迁移（已稳定）

- Agent Middlewares Package（2025-01-23）：工具迁移到 `packages/agent-middlewares/`
- SubAgentsMiddleware 迁移（2025-01-17）：迁移到 `packages/standard-agent/src/middlewares/subagents/`
- 参考：`.claude/memories/` 目录下的各迁移备忘录
