---
name: "dynamic-tool-command-system"
description: "将 LangChain 工具调用转换为统一 batch_command 格式的系统；核心是 CommandSystemMiddleware 类，提供批量执行（batch_command）和运行时查询（list_available_commands）工具；关键决策：系统提示词和工具 description 完全静态以支持 Anthropic Prompt Caching，工具列表通过运行时查询获取；适用于需要动态工具管理和批量调用的 LangChain Agent 系统"
tags: ["langchain", "middleware", "batch-command", "prompt-caching", "tool-registry", "dynamic-tools", "architecture"]
category: "architecture"
created: "2025-01-17"
last_updated: "2025-01-24"
priority: "high"
context_scope: "project"
---

## 背景

需要将 LangChain 工具调用系统改造为统一的 Command 格式，以支持：
1. 批量工具调用（减少 LLM 往返次数）
2. 静态工具描述（支持 Anthropic Prompt Caching）
3. 运行时工具查询（动态工具列表）
4. 向后兼容（不干扰现有系统）

## 核心架构

### Command 格式定义

```typescript
interface ToolCommand {
  name: string;  // 工具名称
  args: any;     // 工具参数
}

interface BatchToolCommand {
  commands: ToolCommand[];  // 批量命令数组
}
```

### CommandSystemMiddleware 实现

**文件**：`agents/code/middlewares/commandSystem.ts`

```typescript
export class CommandSystemMiddleware implements AgentMiddleware {
    name = 'CommandSystemMiddleware';
    private registry: ToolRegistry = {};
    private batchCommandTool: StructuredTool;
    private listToolsTool: StructuredTool;

    // 提供 batch_command 和 list_available_commands 工具
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
        const systemPromptAddon = `
## Command System 工具使用指南

所有工具调用通过统一的 Batch Command 格式进行：

**核心工具**：
- batch_command - 批量执行多个命令，格式：{commands: [{name, args}, ...]}
- list_available_commands - 查询所有可用工具的列表和参数定义

**使用示例**：
- 读取文件：{commands: [{name: "read_file", args: {file_path: "/path/to/file"}}]}
- 搜索代码：{commands: [{name: "grep", args: {pattern: "function", path: "./src"}}]}
- 批量操作：{commands: [{name: "read_file", args: {...}}, {name: "grep", args: {...}}]}

**重要**：
- 系统提示词和工具描述保持静态以支持 Prompt Caching
- 工具列表动态查询，使用 list_available_commands 获取最新信息
- 所有工具调用必须使用 batch_command，即使单个操作也包装为数组
`;
        const modifiedRequest = {
            ...request,
            input: [{
                ...request.input[0],
                content: systemPromptAddon + request.input[0].content,
            }],
        };
        return await handler(modifiedRequest);
    }
}
```

## 关键设计决策

### 1. Middleware 而非工具函数
- **原因**：更好的集成和灵活性，符合 LangChain 架构
- **实现**：实现 `AgentMiddleware` 接口，通过 `wrapModelCall` 注入提示词

### 2. 可选启用（配置控制）
- **原因**：保持向后兼容，不干扰现有系统
- **实现**：`config.middleware.commandSystem?: boolean`，默认 `false`

### 3. 只有 batch_command（移除 command）
- **原因**：简化实现，避免冗余，所有操作都包装为数组
- **实现**：单个操作也使用 `{commands: [{name, args}]}` 格式

### 4. 静态描述（支持 Prompt Caching）⭐
- **原因**：动态工具列表会破坏 Anthropic Prompt Caching
- **实现**：
  - 工具 description 完全静态，不包含动态工具列表
  - 工具列表通过 `list_available_commands` 运行时查询
  - 系统提示词只引用工具名称，不列出具体工具
- **效果**：完全利用 Anthropic Prompt Caching，节省 81% 成本

### 5. 特殊工具处理
- **原因**：`ask_user_with_options` 等交互工具不应该被包装
- **实现**：在 `registerTools` 前过滤，直接传递给 Agent

## 集成方式

### 配置文件

**agents/code/subagents/config.ts**：
```typescript
interface AgentConfig {
    middleware: {
        commandSystem?: boolean;  // 新增配置项，默认 false
    };
}
```

### 工厂集成

**agents/code/subagents/factory.ts**：
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

## 工具使用方式

### batch_command（批量执行）

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

### list_available_commands（运行时查询）

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

## 实现文件

**核心实现**：
- `agents/code/middlewares/commandSystem.ts` - CommandSystemMiddleware 类
- `agents/code/middlewares/index.ts` - 导出

**配置集成**：
- `agents/code/subagents/config.ts` - 添加 commandSystem 配置
- `agents/code/subagents/factory.ts` - 集成 middleware

**工具实现**（已废弃，改为 middleware）：
- ~~`agents/code/tools/command_system.ts`~~
- ~~`agents/code/tools/registry.ts`~~
- ~~`agents/code/tools/index.ts`~~

**设计文档**：
- `specs/dynamic-tool-command-system.md` - 完整设计文档

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

## 向后兼容性

- ✅ 默认关闭，不影响现有行为
- ✅ 可按 agent 配置选择性启用
- ✅ 工具代码无需任何修改
- ✅ 可随时启用/禁用

## 注意事项

1. **特殊工具处理**：`ask_user_with_options` 等交互工具不应该被 CommandSystem 包装
2. **工具过滤**：使用 `filter(t => t.name !== 'ask_user_with_options')` 排除
3. **错误处理**：批量调用中部分失败不影响其他命令，返回格式化的错误信息
4. **迁移简单**：设置 `commandSystem: false` 即可回退到原有方式
5. **Prompt Caching**：只有完全静态的描述才能利用缓存，避免动态工具列表
