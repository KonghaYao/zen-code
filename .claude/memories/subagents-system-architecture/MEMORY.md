---
name: "subagents-system-architecture"
description: "专业化子代理系统完整架构，通过 LangGraph switchBranch 实现任务路由和委托。包含10个子代理（finder, planner, reviewer, debugger, refactor, tester, security, performance, organizer, default），每个代理有特定的工具分配策略（只读/读写/全部）和中间件配置。配置系统基于 AgentConfig 接口，支持工具白名单、中间件开关、动态提示词解析。完整实现包括后端配置系统、前端 TUI 集成和工具映射规范。与 SubAgentsMiddleware 插件系统独立运行。"
tags: ["subagents", "agent-configuration", "task-routing", "langgraph", "switchbranch", "middleware", "factory-pattern", "tui", "agent-system"]
category: "architecture"
created: "2025-01-13"
last_updated: "2025-01-17"
priority: "high"
context_scope: "project"
---

## 系统概述

专业化子代理系统通过 LangGraph switchBranch 机制实现任务路由和委托，允许用户通过命令切换不同能力的 agent。

### 两个独立的 SubAgent 系统

| 维度 | SubAgentsMiddleware | SwitchBranch Subagents |
|------|---------------------|------------------------|
| **实现方式** | Tool 调用 + Middleware 注入 | LangGraph switchBranch |
| **触发机制** | AI 决定调用 ask_subagents tool | 前端命令控制 + 状态驱动 |
| **状态管理** | task_store 存储子任务状态 | 共享主状态，分支执行 |
| **使用场景** | AI 自主委托专门任务 | 用户明确切换 agent 模式 |

两者协同工作：`default` agent 通过 SubAgentsMiddleware 委托给专业化子代理。

## 核心架构

### 1. 配置系统

**统一配置文件**：`agents/code/subagents/config.ts`

所有 agents（包括默认的）在 `loadAgentsList()` 函数中统一定义：

```typescript
export interface AgentConfig {
    id: string;
    name: string;
    description: string;
    systemPrompt: string | ((state: any) => Promise<string> | string);
    tools: string[];
    middleware: {
        agents_md?: boolean;
        skills?: boolean;
        memories?: boolean;
        mcp?: boolean;
        subagents?: boolean;
        cache?: boolean;
    };
}
```

### 2. 10 个子代理定位

#### 只读专家（安全分析类）
1. **finder** - 文件搜索专家（只读工具）
2. **reviewer** - 代码审查专家（维度：正确性、安全性、性能、可读性、规范、测试）
3. **security** - 安全专家（OWASP Top 10）
4. **performance** - 性能专家（时间/空间复杂度、I/O、缓存、并发）

#### 辅助专家
5. **planner** - 任务规划专家（TodoWrite, ask_user_with_options，只读 + 交互工具）

#### 执行专家（需要修改代码）
6. **debugger** - 调试专家（只读 + bash，理解问题 → 收集信息 → 定位根因 → 验证假设 → 提出修复）
7. **refactor** - 重构专家（提炼、结构、简化、架构重构）
8. **tester** - 测试专家（单元 70%、集成 20%、E2E 10%）
9. **organizer** - 知识整理专家（维护 `.claude/memories/` 和 AGENTS.md）
10. **default** - 全功能助手（完整中间件链、支持 subagents 委托）

### 3. 工具分配策略

#### 工具分类
- **只读工具**: `glob_files`, `search-files-rg`, `read_file`
- **读写工具**: `write_file`, `edit_file`
- **执行工具**: `bash`（仅 debugger）
- **交互工具**: `ask_user_with_options`, `TodoWrite`

#### 分配原则

| 子代理 | 工具范围 | 理由 |
|--------|---------|------|
| finder, reviewer, security, performance | 只读 | 分析不应修改代码 |
| planner | 只读 + 交互 | 规划分析，需要用户确认和搜索工具 |
| debugger | 只读 + bash | 调试需要运行命令验证 |
| refactor, tester, organizer, default | 全部 | 需要修改代码或生成文件 |

### 4. 中间件配置

完整配置表参见 `agents/code/subagents/README.md`：

| 中间件 | 专业化子代理 | default |
|--------|------------|---------|
| agents_md, skills, memories | ✓ | ✓ |
| mcp, subagents, cache | ✗ | ✓ (条件性) |

**设计决策**：
- 专业化子代理禁用 `subagents` 中间件，避免过度嵌套委托
- 只有 `default` 启用 `mcp` 和 `subagents`，保持简洁
- `cache` 仅在 `MODEL_PROVIDER=anthropic` 时启用

### 5. 动态提示词支持

`systemPrompt` 字段支持两种类型：

1. **字符串**：直接提供提示词（用于 finder/reviewer 等简单 agents）
2. **函数**：`systemPrompt: getSystemPrompt`，调用时传入 state 动态生成（用于 default agent）

关键实现（`agents/code/subagents/factory.ts`）：
```typescript
const systemPrompt = typeof config.systemPrompt === 'function'
    ? await config.systemPrompt(state)
    : config.systemPrompt;
```

## LangGraph 集成

### 图路由逻辑

**核心文件**：`agents/code/graph.ts`

使用 `switch_command` 字段路由到不同 agent：

```typescript
const switchBranch = {
    summarization: async (state: CodeStateType) => { /* 现有实现 */ },
    smart_memory: async (state: CodeStateType) => { /* 现有实现 */ },
};

export const graph = new StateGraph(CodeState)
    .addNode('graph', async (state: CodeStateType, runtime: Runtime) => {
        const { switch_command: cmd } = state;
        
        if (cmd === 'summarization') return switchBranch.summarization(state);
        if (cmd === 'smart_memory') return switchBranch.smart_memory(state);
        
        const configs = agentConfigs || (await loadAgentsList());
        agentConfigs ??= configs;
        
        const agentId = cmd || getDefaultAgentId();
        const config = configs[agentId];
        
        return invokeAgent(config, state, runtime);
    });
```

### 标准 Agent 工厂

**核心文件**：`agents/code/subagents/factory.ts`

`createStandardAgent` 函数实现流程：

1. 初始化模型（`initChatModel`）
2. 过滤工具（根据 `config.tools`，支持 `'all'` 或工具名数组）
3. 构建中间件链（按配置顺序添加）
4. 解析系统提示词（支持函数或字符串）
5. 返回 `ReactAgent` 实例

### 工具映射规范（重要）

⚠️ **注意**：工具名称必须与实际 tool.name 匹配

| 配置名称 | 实际 tool.name | 说明 |
|---------|---------------|------|
| TodoWrite | TodoWrite | 任务规划工具 |
| ask_user_with_options | ask_user_with_options | 用户交互工具 |
| glob_files | glob_files | 文件 glob 搜索 |
| search-files-rg | search-files-rg | 文件内容搜索 |
| read_file | read_file | 读取文件 |
| write_file | write_file | 写入文件 |
| edit_file | edit_file | 编辑文件 |

**常见错误**：使用导入变量名而非实际的 tool.name

错误示例：
```typescript
tools: ['glob_tool']  // ❌ glob_tool 是导入变量名
```

正确示例：
```typescript
tools: ['glob_files']  // ✅ glob_files 是实际的 tool.name
```

## 前端 TUI 集成

### AgentPanel 组件

**文件位置**：`tui/src/chat/components/AgentPanel.tsx`

关键特性：
- **单数据源设计**：直接从 `config.switch_command` 读取当前 agent
- **可视化界面**：支持↑↓选择、Enter切换、q关闭
- **自动同步**：配置更新后自动重新定位选中项

### 命令系统

**简化命令设计**：只保留 `/agent`（别名 `/a`）命令，打开可视化面板。

### 配置持久化

**AppConfig 扩展**：`tui/src/chat/store/index.ts`

```typescript
interface AppConfig {
    switch_command?: string;  // agent 切换命令
}
```

持久化流程：
1. 用户在 AgentPanel 选择 agent
2. 调用 `updateConfig({ switch_command: agentId })`
3. Context `extraParams` 从 config 读取
4. 后端根据 `switch_command` 路由到对应 agent

## 扩展指南

### 添加新 Agent（5 步）

1. 在 `prompts/subagents/` 中添加提示词文件
2. 在 `prompts/subagents/index.ts` 中导出函数
3. 在 `config.ts` 的 `loadAgentsList()` 中添加配置
4. 可选：在 `factory.ts` 中添加专用创建函数
5. 可选：在 `SubAgentsMiddleware` 中注册（如果需要被委托）

### 添加新工具

1. 在 `factory.ts` 的 `ALL_TOOLS` 数组中添加
2. 在 `TOOL_MAP` 中自动映射（使用 tool.name）
3. 在 agent 配置中使用 tool.name 字符串

## 最佳实践

### 配置原则

1. **单一数据源**：AgentPanel 直接从 config 读取，避免中间状态
2. **代码引用**：通过 import 直接加载 prompts/coding.ts，不使用动态文件路径
3. **配置分离**：systemPrompt 是唯一配置字段，支持字符串和函数两种形式
4. **安全优先**：HumanInTheLoop 始终启用，无法通过配置关闭

### 中间件配置建议

- **只读 agents**（finder/reviewer）：关闭 mcp、subagents、cache
- **规划 agents**（planner）：只启用必要工具和 agents_md
- **全功能 agents**（default）：启用所有中间件

### 注意事项

- 避免过度嵌套：专业化子代理不应再委托给其他子代理
- 工具权限要匹配职责：分析类子代理不应有写入权限
- 提示词要聚焦：每个子代理专注单一领域

## 故障排查

### 常见问题

1. **工具未生效**
   - 检查工具名称是否与 TOOL_MAP 键名匹配
   - 确认工具已添加到 ALL_TOOLS 数组

2. **Agent 切换无效**
   - 检查 `switch_command` 是否正确传递到后端
   - 确认 agentId 在 loadAgentsList() 中存在

3. **中间件未启用**
   - 检查 config.middleware 对应字段是否为 true
   - 确认中间件依赖配置（如 mcp_config）

## 适用场景

- 需要专业化分工的 AI Agent 项目
- 多任务类型的代码助手系统
- 需要权限分离（只读/读写）的场景
- 使用 LangGraph 构建的多 agent 系统

## 核心文件结构

```
agents/code/subagents/
├── config.ts        # 配置定义（AgentConfig 接口、loadAgentsList）
├── factory.ts       # 标准工厂（createStandardAgent）
├── finder.ts        # Finder 子代理实现示例
└── README.md        # 完整文档

agents/code/prompts/subagents/
├── index.ts         # 提示词注册中心
├── finder.ts        # 文件搜索专家
├── planner.ts       # 任务规划专家
├── reviewer.ts      # 代码审查专家
├── debugger.ts      # 调试专家
├── refactor.ts      # 重构专家
├── tester.ts        # 测试专家
├── security.ts      # 安全专家
├── performance.ts   # 性能专家
└── organizer.ts     # 知识整理专家

tui/src/chat/components/
└── AgentPanel.tsx   # Agent 选择面板
```
