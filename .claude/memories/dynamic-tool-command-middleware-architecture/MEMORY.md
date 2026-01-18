---
name: "dynamic-tool-command-middleware-architecture"
description: "实现将 LangChain 工具调用转换为统一 batch_command 格式的 middleware 架构；核心是 CommandSystemMiddleware 类，通过配置可选启用（默认关闭保持向后兼容），提供 batch_command（批量执行）和 list_available_tools（运行时查询）工具；关键决策：系统提示词和工具 description 完全静态以支持 Anthropic Prompt Caching，工具列表通过 list_available_tools 运行时查询获取；适用于需要动态工具管理和批量调用的 LangChain Agent 系统"
tags: ["langchain", "middleware", "batch-command", "prompt-caching", "tool-registry"]
category: "architecture"
created: "2025-01-18"
last_updated: "2025-01-18"
priority: "high"
context_scope: "project"
---

# ## 背景

## 背景

用户需要将 LangChain 工具调用系统改造为统一的 Command 格式，以支持：
1. 批量工具调用（减少 LLM 往返次数）
2. 静态工具描述（支持 Anthropic Prompt Caching）
3. 运行时工具查询（动态工具列表）
4. 向后兼容（不干扰现有系统）

## 解决方案

### 核心架构：CommandSystemMiddleware

**文件**：`agents/code/middlewares/commandSystem.ts`

```typescript
export class CommandSystemMiddleware implements AgentMiddleware {
    name = 'CommandSystemMiddleware';
    stateSchema = undefined;
    contextSchema = undefined;

    private registry: ToolRegistry = {};
    private batchCommandTool: StructuredTool;
    private listToolsTool: StructuredTool;

    // 提供 batch_command 和 list_available_tools 工具
    get tools(): StructuredTool[] {
        return [this.batchCommandTool, this.listToolsTool];
    }

    // 注册底层工具到内部注册表
    registerTools(tools: StructuredTool[]): void {
        for (const tool of tools) {
            this.registry[tool.name] = tool;
        }
    }

    // 注入系统提示词
    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        const systemPromptAddon = `...`; // 静态提示词
        return await handler(modifiedRequest);
    }
}
```

### 关键决策

**1. Middleware 而非工具函数**
- **原因**：更好的集成和灵活性，符合 LangChain 架构
- **实现**：实现 `AgentMiddleware` 接口，通过 `wrapModelCall` 注入提示词

**2. 可选启用（配置控制）**
- **原因**：保持向后兼容，不干扰现有系统
- **实现**：`config.middleware.commandSystem?: boolean`，默认 `false`

**3. 只有 batch_command（移除 command）**
- **原因**：简化实现，避免冗余，所有操作都包装为数组
- **实现**：单个操作也使用 `{commands: [{name, args}]}` 格式

**4. 静态描述（支持 Prompt Caching）**
- **原因**：动态工具列表会破坏 Anthropic Prompt Caching
- **实现**：工具 description 完全静态，工具列表通过 `list_available_tools` 运行时查询

**5. 特殊工具处理**
- **原因**：`ask_user_with_options` 不应该被包装
- **实现**：在 `registerTools` 前过滤，直接传递给 Agent

### 集成方式

**配置文件**：`agents/code/subagents/config.ts`

```typescript
interface AgentConfig {
    middleware: {
        commandSystem?: boolean;  // 新增配置项
    };
}

// 默认配置（向后兼容）
default: {
    middleware: {
        commandSystem: false,  // 默认关闭
    },
},
```

**工厂集成**：`agents/code/subagents/factory.ts`

```typescript
export async function createStandardAgent(config: AgentConfig, state: CodeStateType, runtime: Runtime) {
    const tools = config.tools.includes('all')
        ? [...ALL_TOOLS]
        : config.tools.map(...).filter(...);

    const middleware: any[] = [];
    let finalTools = tools;

    // 可选：启用 Command System
    if (config.middleware.commandSystem) {
        const commandSystem = new CommandSystemMiddleware();

        // 注册工具（排除 ask_user_with_options）
        const toolsForCommandSystem = tools.filter(t => t.name !== 'ask_user_with_options');
        const specialTools = tools.filter(t => t.name === 'ask_user_with_options');

        commandSystem.registerTools(toolsForCommandSystem);
        middleware.push(commandSystem);

        // 最终工具只包含特殊工具
        finalTools = specialTools;
    }

    // ... 其他 middleware

    return createAgent({
        tools: finalTools,  // middleware 提供的工具自动包含
        middleware,
    });
}
```

### 工具格式

**batch_command**（批量执行）：
```json
{
  "commands": [
    {
      "name": "read_file",
      "args": {
        "file_path": "/path/to/file.txt"
      }
    },
    {
      "name": "grep",
      "args": {
        "pattern": "TODO",
        "path": "./src"
      }
    }
  ]
}
```

**list_available_tools**（运行时查询）：
```json
{}
```

返回：
```json
[
  {
    "name": "read_file",
    "description": "读取文件内容..."
  },
  {
    "name": "grep",
    "description": "搜索文件内容..."
  }
]
```

### 提示词设计

**Middleware 自动注入**（`wrapModelCall`）：
```typescript
const systemPromptAddon = `

## Command System 工具使用指南

所有工具调用通过统一的 Batch Command 格式进行：

**核心工具**：
- batch_command - 批量执行多个命令，格式：{commands: [{name, args}, ...]}
- list_available_tools - 查询所有可用工具的列表和参数定义

**使用示例**：
- 读取文件：{commands: [{name: "read_file", args: {file_path: "/path/to/file"}}]}
- 搜索代码：{commands: [{name: "grep", args: {pattern: "function", path: "./src"}}]}
- 批量操作：{commands: [{name: "read_file", args: {...}}, {name: "grep", args: {...}}]}

**重要**：
- 系统提示词和工具描述保持静态以支持 Prompt Caching
- 工具列表动态查询，使用 list_available_tools 获取最新信息
- 所有工具调用必须使用 batch_command，即使单个操作也包装为数组
`;
```

**prompts/coding.ts**：保持原始状态（不包含工具使用说明），由 middleware 注入

### 使用方式

#### 模式 1：原有系统（默认）

```typescript
// config.ts
middleware: {
    commandSystem: false  // 或不设置
}

// Agent 直接调用
read_file({
    file_path: "/path/to/file.txt"
})
```

#### 模式 2：Command System

```typescript
// config.ts
middleware: {
    commandSystem: true
}

// Agent 使用 batch_command
batch_command({
    commands: [{
        name: "read_file",
        args: {
            file_path: "/path/to/file.txt"
        }
    }]
})
```

### 实现文件

**新增**：
- `agents/code/middlewares/commandSystem.ts` - 核心实现
- `agents/code/middlewares/index.ts` - 导出
- `agents/code/middlewares/README.md` - 架构文档
- `agents/code/middlewares/COMMAND_SYSTEM.md` - 使用指南

**修改**：
- `agents/code/subagents/config.ts` - 添加 commandSystem 配置
- `agents/code/subagents/factory.ts` - 集成 middleware
- `specs/dynamic-tool-command-system.md` - 更新设计文档

**删除**：
- `agents/code/tools/command_system.ts`
- `agents/code/tools/registry.ts`
- `agents/code/tools/index.ts`

## 适用场景

### 适合启用
- 需要频繁批量调用工具
- 使用 Anthropic 模型（Prompt Caching 受益）
- 需要运行时查询工具列表
- 追求性能优化

### 不建议启用
- 简单的单工具调用
- 调试阶段（直接调用更直观）
- 对包装开销极其敏感

## 性能影响

**优势**：
- 批量调用减少 LLM 往返次数（10 个文件从 10 次调用 → 1 次调用）
- Prompt Caching 降低 token 成本（静态描述始终缓存有效）
- 并行执行提高吞吐量

**示例对比**：

未启用：
```
User: 读取 3 个文件
AI: read_file(file1)
AI: read_file(file2)
AI: read_file(file3)
→ 3 次 LLM 调用
```

启用 CommandSystem：
```
User: 读取 3 个文件
AI: batch_command({commands: [...]})
→ 1 次 LLM 调用
```

## 向后兼容性

- ✓ 默认关闭，不影响现有行为
- ✓ 可按 agent 配置选择性启用
- ✓ 工具代码无需任何修改
- ✓ 可随时启用/禁用

## 注意事项

1. **特殊工具处理**：`ask_user_with_options` 等交互工具不应该被 CommandSystem 包装
2. **工具过滤**：使用 `filter(t => t.name !== 'ask_user_with_options')` 排除
3. **错误处理**：批量调用中部分失败不影响其他命令，返回格式化的错误信息
4. **迁移简单**：设置 `commandSystem: false` 即可回退到原有方式
