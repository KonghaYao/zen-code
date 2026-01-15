---
name: "langgraph-switchbranch-subagents-complete"
description: "基于 LangGraph switchBranch 的 subagents 系统完整实现，包括后端配置系统、前端 TUI 集成和工具映射规范；核心特性：统一配置系统、动态提示词支持、工厂模式创建 agent、命令行控制面板；与 SubAgentsMiddleware 插件系统独立运行，支持中间件开关和工具白名单筛选"
tags: ["langgraph", "switchbranch", "subagents", "factory-pattern", "agent-config", "tui", "agent-routing", "middleware-configuration"]
category: "architecture"
created: "2025-01-13"
last_updated: "2025-01-15"
priority: "high"
context_scope: "project"
---

## 系统概述

基于 LangGraph switchBranch 机制的 subagents 系统，允许用户通过命令切换不同能力的 agent。与现有的 SubAgentsMiddleware 插件系统独立运行：

| 维度 | SubAgentsMiddleware | SwitchBranch Subagents |
|------|---------------------|------------------------|
| 实现方式 | Tool 调用 + Middleware 注入 | LangGraph switchBranch |
| 触发机制 | AI 决定调用 ask_subagents tool | 前端命令控制 + 状态驱动 |
| 状态管理 | task_store 存储子任务状态 | 共享主状态，分支执行 |
| 使用场景 | AI 自主委托专门任务 | 用户明确切换 agent 模式 |

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

**可用 Agents**：
- **default**：全功能代码助手（`tools: ['all']`，引用完整 prompts/coding.ts）
- **finder**：文件搜索专家（只读工具）
- **planner**：任务规划专家（TodoWrite, ask_user_with_options）
- **reviewer**：代码审查专家（只读分析）

### 2. 动态提示词支持

`systemPrompt` 字段支持两种类型：

1. **字符串**：直接提供提示词（用于 finder/reviewer 等简单 agents）
2. **函数**：`systemPrompt: getSystemPrompt`，调用时传入 state 动态生成（用于 default agent）

关键实现（`agents/code/subagents/factory.ts`）：
```typescript
const systemPrompt = typeof config.systemPrompt === 'function'
    ? await config.systemPrompt(state)
    : config.systemPrompt;
```

### 3. 标准 Agent 工厂

**核心文件**：`agents/code/subagents/factory.ts`

`createStandardAgent` 函数实现：
- 根据 `config.tools` 筛选工具（支持 'all' 或工具名称数组）
- 根据 `config.middleware` 动态构建中间件链
- 使用 `config.systemPrompt` 或默认 `getSystemPrompt`

**工具映射规范**（重要）：
| 配置名称 | 实际 tool.name | 说明 |
|---------|---------------|------|
| TodoWrite | TodoWrite | 任务规划工具 |
| ask_user_with_options | ask_user_with_options | 用户交互工具 |
| glob_files | glob_files | 文件 glob 搜索 |
| search-files-rg | search-files-rg | 文件内容搜索 |
| read_file | read_file | 读取文件 |
| write_file | write_file | 写入文件 |
| edit_file | edit_file | 编辑文件 |

⚠️ **注意**：工具名称必须与 TOOL_MAP 键名匹配，使用实际的 tool.name 而非导入变量名。

### 4. 图路由逻辑

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

## 前端集成

### TUI 命令系统

**简化命令设计**：只保留 `/agent`（别名 `/a`）命令，打开可视化面板。

删除了：
- `/agent-list` (/al)
- `/agent-reset` (/ar)  
- `/agent <id>` 直接切换逻辑

**AgentPanel 组件**：`tui/src/chat/components/AgentPanel.tsx`

关键特性：
- **单数据源设计**：直接从 `config.switch_command` 读取当前 agent
- **可视化界面**：支持↑↓选择、Enter切换、q关闭
- **自动同步**：配置更新后自动重新定位选中项

### 配置持久化

**AppConfig 扩展**：`tui/src/chat/store/index.ts`

```typescript
interface AppConfig {
    // ... 其他字段
    switch_command?: string;  // agent 切换命令
}
```

持久化流程：
1. 用户在 AgentPanel 选择 agent
2. 调用 `updateConfig({ switch_command: agentId })`
3. Context `extraParams` 从 config 读取
4. 后端根据 `switch_command` 路由到对应 agent

## 中间件系统

### 中间件链构建顺序

`createStandardAgent` 按以下顺序构建中间件：

1. **SubAgentsMiddleware**（如果启用）
2. **AgentsMdMiddleware**（如果启用）
3. **SkillsMiddleware**（如果启用）
4. **MemoriesMiddleware**（如果启用）
5. **MCPMiddleware**（如果启用）
6. **HumanInTheLoop**（始终启用，安全考虑）
7. **AnthropicCacheMiddleware**（如果启用且提供商为 Anthropic）

### 配置开关示例

```typescript
// Finder Agent - 最小配置
middleware: {
    agents_md: true,
    skills: true,
    memories: true,
    mcp: false,
    subagents: false,
    cache: false,
}

// Default Agent - 完整配置
middleware: {
    agents_md: true,
    skills: true,
    memories: true,
    mcp: true,
    subagents: true,
    cache: process.env.MODEL_PROVIDER === 'anthropic',
}
```

## 使用指南

### 用户操作流程

1. **打开 Agent 面板**：输入 `/a` 或 `/agent`
2. **选择 Agent**：使用↑↓键浏览
3. **切换 Agent**：按 Enter 确认切换
4. **关闭面板**：按 `q` 或 `ESC`

### 开发者扩展流程

**添加新 Agent**：

1. 在 `loadAgentsList()` 中添加配置：
```typescript
export async function loadAgentsList(): Promise<Record<string, AgentConfig>> {
    return {
        // ... 现有 agents
        my_agent: {
            id: 'my_agent',
            name: 'My Custom Agent',
            description: '描述',
            systemPrompt: '你是...',
            tools: ['read_file', 'write_file'],
            middleware: { /* 配置 */ },
        },
    };
}
```

2. 前端自动可用（无需修改 TUI 代码）

**添加新工具**：

1. 在 `factory.ts` 的 `ALL_TOOLS` 数组中添加
2. 在 `TOOL_MAP` 中自动映射（使用 tool.name）
3. 在 agent 配置中使用 tool.name 字符串

## 最佳实践

### 配置原则

1. **单一数据源**：AgentPanel 直接从 config 读取，避免中间状态
2. **代码引用**：通过 import 直接加载 prompts/coding.ts，不使用动态文件路径
3. **配置分离**：systemPrompt 是唯一配置字段，支持字符串和函数两种形式
4. **安全优先**：HumanInTheLoop 始终启用，无法通过配置关闭

### 工具映射规范

⚠️ **常见错误**：使用导入变量名而非实际的 tool.name

错误示例：
```typescript
tools: ['glob_tool']  // ❌ glob_tool 是导入变量名
```

正确示例：
```typescript
tools: ['glob_files']  // ✅ glob_files 是实际的 tool.name
```

### 中间件配置建议

- **只读 agents**（finder/reviewer）：关闭 mcp、subagents、cache
- **规划 agents**（planner）：只启用必要工具和 agents_md
- **全功能 agents**（default）：启用所有中间件

## 系统集成

### 与 SubAgentsMiddleware 的关系

两个系统独立运行，互补使用：

1. **SwitchBranch Subagents**：用户明确切换工作模式
2. **SubAgentsMiddleware**：AI 自主委托专门任务

### 状态管理

- `switch_command` 执行后自动重置为空，避免持续使用特化 agent
- 默认 agent 使用 'all' 工具，包含完整能力
- 状态共享：所有 subagents 使用相同的 CodeState schema

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

### 调试技巧

- 在 `invokeAgent` 前添加 console.log 查看 agentId 和 config
- 使用 `/agent` 命令确认当前 agent 状态
- 检查 `.langgraph_api/langgraph.db` 中的配置记录

## 扩展方向

### 未来优化

1. **配置源扩展**：支持从 `~/.code-graph.json` 或数据库加载
2. **热重载**：修改配置后无需重启服务
3. **Agent 链**：支持多个 agents 顺序执行
4. **性能监控**：记录各 agent 的执行时间和资源使用

### 架构演进

- **插件系统**：允许第三方扩展 agent 配置
- **配置验证**：启动时验证所有 agent 配置的有效性
- **版本管理**：支持多版本 agent 配置并存
