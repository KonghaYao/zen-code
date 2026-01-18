# 动态工具 Command 系统设计文档

> **状态**: ✅ 已完成
> **实现方式**: LangChain Middleware（CommandSystemMiddleware）
> **日期**: 2025-01-18

---

## 1. 概述

### 1.1 目标
设计一个将 LangChain 工具调用转换为统一 command 格式的系统，实现：
- **统一接口**：所有工具调用通过标准 command JSON 格式
- **批量执行**：支持单次调用执行多个工具
- **解耦设计**：工具实现与调用方式解耦
- **向后兼容**：保持与现有 LangChain 工具系统的兼容性

### 1.2 核心概念

**Command 格式**：
```typescript
interface ToolCommand {
  name: string;      // 工具名称
  args: any;         // 工具参数（符合工具 schema）
}

interface BatchCommand {
  commands: ToolCommand[];  // 命令数组
}
```

**batch_command 工具**：
- 接收命令数组 `[{name, args}, ...]`
- 解析每个命令并调用对应的实际工具
- 返回所有工具的执行结果

### 1.3 设计原则
- **最小侵入**：复用现有 LangChain 工具定义
- **类型安全**：TypeScript 严格模式，Zod schema 验证
- **性能优化**：支持批量调用，减少 LLM 调用次数
- **缓存友好**：静态描述支持 Anthropic Prompt Caching

---

## 2. 实现架构

### 2.1 Middleware 设计

**文件**: `agents/code/middlewares/commandSystem.ts`

```typescript
export class CommandSystemMiddleware implements AgentMiddleware {
    name = 'CommandSystemMiddleware';
    stateSchema = undefined;
    contextSchema = undefined;

    private registry: ToolRegistry = {};
    private batchCommandTool: StructuredTool;
    private listToolsTool: StructuredTool;

    // 提供 batch_command 和 list_available_commands 工具
    get tools(): StructuredTool[] {
        return [this.batchCommandTool, this.listToolsTool];
    }

    // 注册底层工具
    registerTools(tools: StructuredTool[]): void {
        for (const tool of tools) {
            this.registry[tool.name] = tool;
        }
    }

    // 注入系统提示词
    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        // 添加 Command System 使用说明
        const systemPromptAddon = `...`;
        return await handler(modifiedRequest);
    }
}
```

### 2.2 工具流程

```
Agent 调用
    ↓
CommandSystemMiddleware (拦截)
    ↓
batch_command 工具
    ↓
Tool Registry (注册表)
    ↓
底层工具 (read_file, grep, bash, etc.)
```

---

## 3. 核心工具

### 3.1 batch_command

**用途**：批量执行多个工具命令

**格式**：
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

**返回**：
```
[read_file]
文件内容...

[grep]
搜索结果...
```

### 3.2 list_available_commands

**用途**：查询当前可用工具列表

**格式**：
```json
{}
```

**返回**：
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

---

## 4. 集成方式

### 4.1 配置系统

**文件**: `agents/code/subagents/config.ts`

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

### 4.2 工厂集成

**文件**: `agents/code/subagents/factory.ts`

```typescript
export async function createStandardAgent(config: AgentConfig, state: CodeStateType, runtime: Runtime) {
    // 原有工具
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

---

## 5. 系统提示词设计

### 5.1 静态描述原则

**核心原则**：
- ✅ 系统提示词和工具 description 完全静态
- ✅ 支持 Anthropic Prompt Caching
- ✅ 工具列表通过 `list_available_commands` 运行时查询
- ❌ 不在 description 中包含动态工具列表

### 5.2 Middleware 注入的提示词

```typescript
const systemPromptAddon = `

## Command System 工具使用指南

所有工具调用通过统一的 Batch Command 格式进行：

**核心工具**：
- \`batch_command\` - 批量执行多个命令，格式：{commands: [{name, args}, ...]}
- \`list_available_commands\` - 查询所有可用工具的列表和参数定义

**使用示例**：
- 读取文件：{commands: [{name: "read_file", args: {file_path: "/path/to/file"}}]}
- 搜索代码：{commands: [{name: "grep", args: {pattern: "function", path: "./src"}}]}
- 批量操作：{commands: [{name: "read_file", args: {...}}, {name: "grep", args: {...}}]}

**重要**：
- 系统提示词和工具描述保持静态以支持 Prompt Caching
- 工具列表动态查询，使用 list_available_commands 获取最新信息
- 所有工具调用必须使用 batch_command，即使单个操作也包装为数组
`;
```

### 5.3 为什么必须静态？

| 方面 | 动态描述（❌） | 静态描述（✅） |
|------|-------------|-------------|
| **缓存稳定性** | 工具变化会打乱缓存 | description 始终固定 |
| **Prompt Caching** | 无法利用 Anthropic 缓存 | 完全支持缓存优化 |
| **工具查询** | 需要重新生成描述 | 通过 `list_available_commands` 查询 |
| **可维护性** | 逻辑复杂，需要动态生成 | 简单静态文本 |

---

## 6. 使用方式

### 6.1 未启用 CommandSystem（默认）

```typescript
// Agent 配置
middleware: {
    commandSystem: false  // 或不设置
}

// Agent 调用
read_file({
    file_path: "/path/to/file.txt"
})
```

### 6.2 启用 CommandSystem

```typescript
// Agent 配置
middleware: {
    commandSystem: true
}

// Agent 调用
batch_command({
    commands: [
        {
            name: "read_file",
            args: {
                file_path: "/path/to/file.txt"
            }
        }
    ]
})
```

### 6.3 批量调用示例

```json
{
  "commands": [
    {
      "name": "grep",
      "args": {
        "pattern": "function",
        "path": "./src"
      }
    },
    {
      "name": "read_file",
      "args": {
        "file_path": "./src/main.js"
      }
    },
    {
      "name": "bash",
      "args": {
        "command": "ls -la"
      }
    }
  ]
}
```

---

## 7. 实现清单

### 7.1 核心文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `agents/code/middlewares/commandSystem.ts` | ✅ | CommandSystemMiddleware 实现 |
| `agents/code/middlewares/index.ts` | ✅ | 导出所有 middleware |
| `agents/code/middlewares/README.md` | ✅ | Middleware 文档 |
| `agents/code/middlewares/COMMAND_SYSTEM.md` | ✅ | 使用指南 |
| `agents/code/subagents/config.ts` | ✅ | 添加 commandSystem 配置 |
| `agents/code/subagents/factory.ts` | ✅ | 集成 CommandSystemMiddleware |

### 7.2 删除的文件

| 文件 | 原因 |
|------|------|
| `agents/code/tools/command_system.ts` | 已迁移到 middleware |
| `agents/code/tools/registry.ts` | 已迁移到 middleware |
| `agents/code/tools/index.ts` | 不再需要 |

### 7.3 特性清单

✅ **核心功能**
- CommandSystemMiddleware 实现
- batch_command 批量工具调用
- list_available_commands 工具查询
- 工具注册表管理
- 静态描述（支持 Prompt Caching）

✅ **高级特性**
- 可选启用（配置控制）
- 向后兼容（默认关闭）
- 特殊工具处理（ask_user_with_options）
- 系统提示词自动注入

✅ **架构特性**
- Middleware 模式
- 工具拦截和包装
- 错误处理和部分成功
- 运行时工具查询

---

## 8. 性能影响

### 8.1 优势

| 特性 | 收益 |
|------|------|
| **批量调用** | 减少 LLM 往返次数 |
| **Prompt Caching** | 降低 token 成本 |
| **并行执行** | 提高吞吐量 |

### 8.2 示例对比

**未启用（原有方式）**：
```
User: 读取 3 个文件
AI: read_file(file1)
AI: read_file(file2)
AI: read_file(file3)
→ 3 次 LLM 调用
```

**启用 CommandSystem**：
```
User: 读取 3 个文件
AI: batch_command({commands: [
    {name: "read_file", args: {file_path: "file1"}},
    {name: "read_file", args: {file_path: "file2"}},
    {name: "read_file", args: {file_path: "file3"}}
]})
→ 1 次 LLM 调用
```

---

## 9. 向后兼容性

### 9.1 完全兼容

- ✅ 默认关闭，不影响现有行为
- ✅ 可按 agent 配置选择性启用
- ✅ 工具代码无需任何修改
- ✅ 可随时启用/禁用

### 9.2 迁移步骤

1. **在配置中启用** `commandSystem: true`
2. **无需修改代码** - middleware 自动处理
3. **Agent 自适应** - 自动使用 batch_command

### 9.3 回退

设置 `commandSystem: false` 即可恢复原有行为。

---

## 10. 配置建议

### 10.1 适合启用的场景

- ✅ 需要频繁批量调用工具
- ✅ 使用 Anthropic 模型（Prompt Caching 受益）
- ✅ 需要运行时查询工具列表
- ✅ 追求性能优化

### 10.2 不建议启用的场景

- ❌ 简单的单工具调用
- ❌ 调试阶段（直接调用更直观）
- ❌ 对包装开销极其敏感

---

## 11. 文档

### 11.1 用户文档

- **使用指南**: `agents/code/middlewares/COMMAND_SYSTEM.md`
  - 启用方法
  - 配置说明
  - 使用示例
  - 迁移指南
  - 故障排查

### 11.2 开发文档

- **架构文档**: `agents/code/middlewares/README.md`
  - 设计原理
  - 实现细节
  - 扩展指南

---

## 12. 测试

### 12.1 测试命令

```bash
# 启用后测试
bun run dev:server

# 观察 Agent 是否使用 batch_command
# 检查工具调用格式是否正确
```

### 12.2 验证清单

- [ ] Agent 使用 batch_command 调用工具
- [ ] 批量调用正确执行
- [ ] 错误处理正常工作
- [ ] list_available_commands 返回正确结果
- [ ] Prompt Caching 正常工作

---

## 13. 未来扩展

### 13.1 可能的改进

- [ ] 并发执行控制（串行/并行选项）
- [ ] 执行结果缓存
- [ ] 性能监控和日志
- [ ] 更复杂的错误恢复策略

### 13.2 集成点

- MCP 工具动态加载
- Skills 工具注册
- 子代理工具共享

---

## 14. 总结

### 14.1 实现成果

✅ **完整的 Middleware 实现**
- CommandSystemMiddleware 符合 LangChain 规范
- 可选启用，向后兼容
- 静态描述，缓存友好

✅ **灵活的配置系统**
- 按 agent 配置
- 默认关闭，按需启用
- 无缝切换

✅ **完善的文档**
- 使用指南
- 架构文档
- 配置示例

### 14.2 关键决策

| 决策 | 理由 |
|------|------|
| **Middleware 而非工具** | 更好的集成和灵活性 |
| **可选而非强制** | 保持向后兼容 |
| **只有 batch_command** | 简化实现，避免冗余 |
| **静态描述** | 支持 Prompt Caching |
| **配置控制** | 灵活的启用/禁用 |

### 14.3 架构优势

- ✓ **解耦**: 工具实现与调用方式分离
- ✓ **可扩展**: 易于添加新特性
- ✓ **可维护**: 清晰的职责划分
- ✓ **可测试**: 纯函数设计

---

## 附录 A: 相关文件路径

```
agents/code/
├── middlewares/
│   ├── commandSystem.ts       # 核心实现
│   ├── index.ts               # 导出
│   ├── README.md              # 架构文档
│   └── COMMAND_SYSTEM.md      # 使用指南
├── subagents/
│   ├── config.ts              # 配置（添加 commandSystem）
│   └── factory.ts             # 工厂（集成 middleware）
└── prompts/
    └── coding.ts              # 系统提示词（已恢复）
```

---

## 附录 B: 配置示例

### B.1 全部启用

```typescript
// config.ts
const agents = {
    default: {
        middleware: {
            agents_md: true,
            skills: true,
            memories: true,
            mcp: true,
            subagents: true,
            commandSystem: true,  // 启用
        },
    },
};
```

### B.2 选择性启用

```typescript
// 只对特定 agent 启用
default: {
    middleware: { commandSystem: true }
},

finder: {
    middleware: { commandSystem: false }  // 保持原有方式
}
```

---

## 附录 C: 调用示例

### C.1 单个工具

```json
{
  "commands": [
    {
      "name": "read_file",
      "args": {
        "file_path": "/path/to/file.txt"
      }
    }
  ]
}
```

### C.2 批量工具

```json
{
  "commands": [
    {
      "name": "grep",
      "args": {
        "pattern": "function",
        "path": "./src"
      }
    },
    {
      "name": "read_file",
      "args": {
        "file_path": "./src/main.js"
      }
    },
    {
      "name": "bash",
      "args": {
        "command": "npm test"
      }
    }
  ]
}
```

### C.3 工具查询

```json
{
  "name": "list_available_commands",
  "args": {}
}
```

---

**文档版本**: 1.0
**最后更新**: 2025-01-18
**状态**: ✅ 已完成
