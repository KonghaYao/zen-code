# 动态工具 Command 系统设计文档

> **状态**: ✅ 已完成 **实现方式**: LangChain Middleware（CommandSystemMiddleware） **日期**: 2025-01-18 **更新日期**:
> 2025-02-14（MCP Tools 重构）

---

## 1. 概述

### 1.1 目标

设计一个为 MCP 工具提供专门发现和执行能力的系统，实现：

- **MCP 工具发现**：通过 `load_mcp_tools` 查询可用的 MCP 工具列表
- **MCP 工具执行**：通过 `execute_mcp_tool` 执行 MCP 工具（支持批量）
- **职责清晰**：MCP 工具与标准工具分离管理
- **向后兼容**：标准工具（read_file, glob_files 等）直接调用，无需通过 MCP 命令

### 1.2 核心概念

**MCP Tool 格式**：

```typescript
interface McpTool {
    name: string; // 工具名称
    description: string; // 工具描述
    schema: any; // 工具参数 schema
}

interface ExecuteMcpCommand {
    commands: Array<{
        name: string; // MCP 工具名称
        args: any; // 工具参数（符合工具 schema）
    }>;
}
```

**两个核心命令**：

- `load_mcp_tools` - 查询和加载 MCP 工具列表
- `execute_mcp_tool` - 执行一个或多个 MCP 工具

### 1.3 设计原则

- **职责单一**：CommandSystemMiddleware 只负责 MCP 工具的发现和执行
- **标准工具独立**：read_file, glob_files 等标准工具直接调用
- **缓存友好**：静态描述支持 Anthropic Prompt Caching
- **性能优化**：支持批量执行 MCP 工具

---

## 2. 实现架构

### 2.1 Middleware 设计

**文件**: `packages/agent/src/middlewares/commandSystem.ts`

```typescript
export class CommandSystemMiddleware implements AgentMiddleware {
    name = 'CommandSystemMiddleware';
    stateSchema = undefined;
    contextSchema = undefined;

    private mcpManager: MCPManager;
    private loadMcpToolsTool: StructuredTool;
    private executeMcpToolTool: StructuredTool;

    // 提供 load_mcp_tools 和 execute_mcp_tool 工具
    get tools(): StructuredTool[] {
        return [this.loadMcpToolsTool, this.executeMcpToolTool];
    }

    // 注入系统提示词
    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        const systemPromptAddon = `...`;
        return await handler(modifiedRequest);
    }
}
```

### 2.2 工具流程

```
Agent 需要使用 MCP 工具
    ↓
load_mcp_tools (查询可用工具)
    ↓
返回工具列表和 schema
    ↓
Agent 选择工具
    ↓
execute_mcp_tool (执行 MCP 工具)
    ↓
MCPManager.executeTool
    ↓
MCP 服务器
```

### 2.3 标准工具流程

```
Agent 使用标准工具
    ↓
直接调用 (read_file, glob_files 等)
    ↓
无需通过 CommandSystemMiddleware
```

---

## 3. 核心命令

### 3.1 load_mcp_tools

**用途**：加载并查询所有可用的 MCP 工具列表

**格式**：

```json
{}
```

**返回**：

```json
{
    "tools": [
        {
            "name": "filesystem.read_file",
            "description": "Read a file",
            "schema": {
                "type": "object",
                "properties": {
                    "path": { "type": "string" }
                }
            }
        }
    ],
    "status": {
        "isInitialized": true,
        "toolCount": 3,
        "servers": ["filesystem", "search"]
    }
}
```

**使用场景**：

- Agent 需要了解有哪些 MCP 工具可用
- 获取工具的参数格式（schema）
- 检查 MCP 连接状态

### 3.2 execute_mcp_tool

**用途**：执行一个或多个 MCP 工具

**格式**：

```json
{
    "commands": [
        {
            "name": "filesystem.read_file",
            "args": {
                "path": "/path/to/file.txt"
            }
        },
        {
            "name": "search.web",
            "args": {
                "query": "AI"
            }
        }
    ]
}
```

**返回**：

```json
{
    "results": [
        {
            "tool": "filesystem.read_file",
            "result": {
                "content": "file content..."
            }
        },
        {
            "tool": "search.web",
            "result": {
                "results": ["result1", "result2"]
            }
        }
    ]
}
```

**错误情况**：

```json
{
    "results": [
        {
            "tool": "unknown.tool",
            "result": null,
            "error": "Tool not found: unknown.tool. Available: filesystem.read_file, search.web"
        }
    ]
}
```

---

## 4. MCPManager 扩展

### 4.1 executeTool 方法

**文件**: `packages/agent/src/mcp/MCPManager.ts`

```typescript
/**
 * 执行单个 MCP 工具
 */
async executeTool(toolName: string, args: any): Promise<any> {
    if (!this.client) {
        await this.initialize();
    }

    if (!this.client) {
        throw new Error('MCP client not initialized. No MCP configuration found.');
    }

    const tools = await this.getAllTools();
    const targetTool = tools.find((t) => t.name === toolName);

    if (!targetTool) {
        const availableTools = tools.map((t) => t.name).join(', ');
        throw new Error(`Tool not found: ${toolName}. Available: ${availableTools || 'none'}`);
    }

    try {
        return await targetTool.invoke(args);
    } catch (error: any) {
        throw new Error(`Failed to execute MCP tool '${toolName}': ${error.message || String(error)}`);
    }
}
```

### 4.2 错误处理

- **客户端未初始化**：抛出错误 "MCP client not initialized"
- **工具不存在**：抛出错误并提示可用工具列表
- **执行失败**：包装原始错误信息

---

## 5. 集成方式

### 5.1 工厂集成

**文件**: `packages/agent/src/subagents/factory-v2.ts`

```typescript
// Command System middleware (always enabled for MCP tool discovery and execution)
const commandSystem = new CommandSystemMiddleware();
middleware.push(commandSystem);

// 注意：不再需要注册 MCP 工具到 CommandSystem
// MCP 工具通过 MCPManager 直接管理
```

### 5.2 标准工具

标准工具（read_file, glob_files 等）通过 `AgentPackage` 配置直接注册到 agent 的 tools 数组：

```typescript
const tools: DynamicStructuredTool[] = [];
const toolRegistry = pkg.tools;

for (const [toolId, params] of Object.entries(agentConfig.tools)) {
    const toolImpl = toolRegistry.getImplementation(toolId);
    if (toolImpl) {
        tools.push(/* 包装为 DynamicStructuredTool */);
    }
}
```

---

## 6. 系统提示词设计

### 6.1 Middleware 注入的提示词

```typescript
const systemPromptAddon = `

## MCP Tools

使用 MCP 工具需要两步：

1. **load_mcp_tools** - 查询可用的 MCP 工具
   - 返回所有 MCP 工具的列表和参数格式
   - 包含 MCP 连接状态

2. **execute_mcp_tool** - 执行 MCP 工具
   - 支持单个或多个工具批量执行
   - 格式：{commands: [{name, args}, ...]}

**重要**：
- 标准工具（read_file, glob_files）直接调用，不需要通过 MCP 命令
- MCP 工具需要先调用 load_mcp_tools 查询
- 再调用 execute_mcp_tool 执行
`;
```

### 6.2 静态描述原则

**核心原则**：

- ✅ 系统提示词和工具 description 完全静态
- ✅ 支持 Anthropic Prompt Caching
- ✅ 工具列表通过 `load_mcp_tools` 运行时查询
- ❌ 不在 description 中包含动态工具列表

**为什么必须静态？**

| 方面               | 动态描述（❌）          | 静态描述（✅）             |
| ------------------ | ----------------------- | -------------------------- |
| **缓存稳定性**     | 工具变化会打乱缓存      | description 始终固定       |
| **Prompt Caching** | 无法利用 Anthropic 缓存 | 完全支持缓存优化           |
| **工具查询**       | 需要重新生成描述        | 通过 `load_mcp_tools` 查询 |
| **可维护性**       | 逻辑复杂，需要动态生成  | 简单静态文本               |

---

## 7. 使用方式

### 7.1 Agent 使用 MCP 工具

**步骤 1：查询可用工具**

```typescript
load_mcp_tools();
// 返回：
// {
//   "tools": [...],
//   "status": {...}
// }
```

**步骤 2：执行工具**

```typescript
execute_mcp_tool({
    commands: [
        {
            name: 'filesystem.read_file',
            args: { path: '/path/to/file.txt' },
        },
    ],
});
```

### 7.2 Agent 使用标准工具

```typescript
// 直接调用，无需通过 CommandSystem
read_file({
    file_path: '/path/to/file.txt',
});
```

### 7.3 批量执行 MCP 工具

```json
{
    "commands": [
        {
            "name": "filesystem.read_file",
            "args": { "path": "/path/to/file1.txt" }
        },
        {
            "name": "filesystem.write_file",
            "args": { "path": "/path/to/file2.txt", "content": "hello" }
        },
        {
            "name": "search.web",
            "args": { "query": "AI development" }
        }
    ]
}
```

---

## 8. TUI 组件

### 8.1 zen-code (Ink.js)

**文件**: `zen-code/src/chat/tools/mcp/`

- `load_mcp_tools.tsx` - 显示 MCP 工具列表和状态
- `execute_mcp_tool.tsx` - 显示 MCP 工具执行结果

### 8.2 zen-worker (React DOM)

**文件**: `zen-worker/src/tools/mcp/`

- `load_mcp_tools.tsx` - 使用 ToolCard 组件显示
- `execute_mcp_tool.tsx` - 使用 ToolCard 组件显示

### 8.3 组件特性

✅ **load_mcp_tools**

- 显示连接状态（✓ 已连接 / ✗ 未连接）
- 显示服务器列表
- 显示工具数量
- 列出前 5 个工具（可扩展）
- 使用 LimitedOutput 显示完整结果

✅ **execute_mcp_tool**

- 显示执行的命令列表
- 显示每个命令的结果状态（✓ 成功 / ✗ 失败）
- 使用 LimitedOutput 显示详细输出
- 错误高亮显示

---

## 9. 测试

### 9.1 单元测试

**CommandSystemMiddleware 测试** (`packages/agent/src/__tests__/middlewares/commandSystem.test.ts`)：

- ✅ 构造函数验证（2 个工具）
- ✅ load_mcp_tools 执行（4 个测试用例）
- ✅ execute_mcp_tool 执行（6 个测试用例）
- ✅ Schema 验证（6 个测试用例）
- ✅ 中间件接口验证

**MCPManager 测试** (`packages/agent/src/__tests__/mcp/MCPManager.test.ts`)：

- ✅ executeTool 成功执行
- ✅ 工具不存在错误处理
- ✅ 执行错误处理
- ✅ 参数传递验证
- ✅ 单例模式验证
- ✅ 错误信息包含可用工具列表

### 9.2 测试覆盖

| 组件                    | 测试数量 | 状态        |
| ----------------------- | -------- | ----------- |
| CommandSystemMiddleware | 21       | ✅ 全部通过 |
| MCPManager              | 7        | ✅ 全部通过 |

### 9.3 运行测试

```bash
# 测试 CommandSystemMiddleware
bun test packages/agent/src/__tests__/middlewares/commandSystem.test.ts

# 测试 MCPManager
bun test packages/agent/src/__tests__/mcp/MCPManager.test.ts

# 测试所有 agent 测试
bun test packages/agent/src/__tests__/
```

---

## 10. 实现清单

### 10.1 核心文件

| 文件                                              | 状态 | 说明                  |
| ------------------------------------------------- | ---- | --------------------- |
| `packages/agent/src/mcp/MCPManager.ts`            | ✅   | 添加 executeTool 方法 |
| `packages/agent/src/middlewares/commandSystem.ts` | ✅   | 重构为 MCP 工具专用   |
| `packages/agent/src/subagents/factory-v2.ts`      | ✅   | 简化初始化            |

### 10.2 TUI 组件

| 文件                                               | 状态 | 说明     |
| -------------------------------------------------- | ---- | -------- |
| `zen-code/src/chat/tools/mcp/load_mcp_tools.tsx`   | ✅   | TUI 组件 |
| `zen-code/src/chat/tools/mcp/execute_mcp_tool.tsx` | ✅   | TUI 组件 |
| `zen-worker/src/tools/mcp/load_mcp_tools.tsx`      | ✅   | Web 组件 |
| `zen-worker/src/tools/mcp/execute_mcp_tool.tsx`    | ✅   | Web 组件 |

### 10.3 测试文件

| 文件                                                             | 状态 | 说明                         |
| ---------------------------------------------------------------- | ---- | ---------------------------- |
| `packages/agent/src/__tests__/middlewares/commandSystem.test.ts` | ✅   | CommandSystemMiddleware 测试 |
| `packages/agent/src/__tests__/mcp/MCPManager.test.ts`            | ✅   | MCPManager 测试              |

### 10.4 删除的文件

| 文件                                        | 原因                                         |
| ------------------------------------------- | -------------------------------------------- |
| `zen-code/src/chat/tools/batch_command.tsx` | 已被 load_mcp_tools 和 execute_mcp_tool 替代 |
| `zen-worker/src/tools/batch_command.tsx`    | 已被 load_mcp_tools 和 execute_mcp_tool 替代 |

---

## 11. 与旧版本的差异

### 11.1 旧版本（batch_command + list_available_commands）

```
所有工具（包括 MCP 工具和标准工具）通过 batch_command 调用：
- batch_command({commands: [{name: "read_file", ...}]})
- list_available_commands() 返回所有工具
```

### 11.2 新版本（load_mcp_tools + execute_mcp_tool）

```
MCP 工具：
- load_mcp_tools() 查询 MCP 工具
- execute_mcp_tool({commands: [...]}) 执行 MCP 工具

标准工具：
- 直接调用（read_file, glob_files 等）
- 无需通过 CommandSystemMiddleware
```

### 11.3 迁移影响

| 变更                         | 影响          | 处理方式                    |
| ---------------------------- | ------------- | --------------------------- |
| 移除 batch_command           | ❌ 不向后兼容 | Agent 需要适应新的 MCP 命令 |
| 移除 list_available_commands | ❌ 不向后兼容 | 使用 load_mcp_tools 替代    |
| 标准工具直接调用             | ✅ 向后兼容   | 无需修改                    |

---

## 12. 文档更新

### 12.1 更新文档

- ✅ `specs/dynamic-tool-command-system.md` - 本文档
- ✅ `specs/mcp-tools-refactor.md` - 重构规范

### 12.2 相关文档

- **MCP Tools 重构**: `specs/mcp-tools-refactor.md` - 完整的重构规范
- **项目结构**: 详见 `README.md`
- **开发命令**: 详见 `package.json`

---

## 13. 验收标准

### 13.1 功能验收

- [x] `load_mcp_tools` 返回正确的工具列表和状态
- [x] `execute_mcp_tool` 能正确执行 MCP 工具
- [x] `execute_mcp_tool` 支持批量执行
- [x] 错误处理覆盖所有边界情况
- [x] 所有单元测试通过

### 13.2 TUI 验收

- [x] TUI 组件正确渲染 MCP 工具信息
- [x] Web 组件正确渲染 MCP 工具信息
- [x] 工具注册正确更新

### 13.3 测试验收

- [x] CommandSystemMiddleware 测试全部通过（21/21）
- [x] MCPManager 测试全部通过（7/7）
- [x] 测试覆盖核心功能

---

## 14. 性能影响

### 14.1 优势

| 特性               | 收益                             |
| ------------------ | -------------------------------- |
| **职责清晰**       | MCP 工具和标准工具分离，易于维护 |
| **Prompt Caching** | 静态描述完全支持 Anthropic 缓存  |
| **批量执行**       | 减少 MCP 工具调用开销            |
| **错误隔离**       | MCP 工具错误不影响标准工具       |

### 14.2 示例对比

**旧版本（batch_command）**：

```
User: 使用 MCP 工具读取文件
AI: batch_command({
    commands: [
        {name: "filesystem.read_file", args: {...}}
    ]
})
```

**新版本（load_mcp_tools + execute_mcp_tool）**：

```
User: 使用 MCP 工具读取文件
AI: load_mcp_tools()  // 查询可用工具
AI: execute_mcp_tool({
    commands: [
        {name: "filesystem.read_file", args: {...}}
    ]
})
```

---

## 15. 总结

### 15.1 实现成果

✅ **完整的 MCP 工具系统**

- CommandSystemMiddleware 专注于 MCP 工具发现和执行
- MCPManager.executeTool 方法提供工具执行能力
- 静态描述，缓存友好

✅ **清晰的职责划分**

- MCP 工具通过 load_mcp_tools + execute_mcp_tool
- 标准工具直接调用
- 两者互不干扰

✅ **完善的测试覆盖**

- CommandSystemMiddleware 测试（21 个用例）
- MCPManager 测试（7 个用例）
- TUI 组件完整实现

### 15.2 关键决策

| 决策             | 理由                  |
| ---------------- | --------------------- |
| **MCP 工具专用** | 职责单一，易于维护    |
| **标准工具独立** | 直接调用，性能更好    |
| **两步流程**     | 发现 + 执行，灵活性高 |
| **静态描述**     | 支持 Prompt Caching   |

### 15.3 架构优势

- ✓ **解耦**: MCP 工具与标准工具分离
- ✓ **可扩展**: 易于添加新的 MCP 工具类型
- ✓ **可维护**: 清晰的职责划分
- ✓ **可测试**: 完整的单元测试覆盖

---

## 附录 A: 相关文件路径

```
packages/agent/
├── src/
│   ├── mcp/
│   │   └── MCPManager.ts              # 添加 executeTool 方法
│   ├── middlewares/
│   │   └── commandSystem.ts           # 重构为 MCP 工具专用
│   ├── subagents/
│   │   └── factory-v2.ts              # 简化初始化
│   └── __tests__/
│       ├── middlewares/
│       │   └── commandSystem.test.ts  # CommandSystemMiddleware 测试
│       └── mcp/
│           └── MCPManager.test.ts     # MCPManager 测试

zen-code/src/chat/tools/
├── index.ts                           # 移除 batch_command，添加 MCP 工具
├── mcp/
│   ├── load_mcp_tools.tsx             # TUI 组件
│   └── execute_mcp_tool.tsx           # TUI 组件
└── batch_command.tsx                  # 已删除

zen-worker/src/tools/
├── index.ts                           # 移除 batch_command，添加 MCP 工具
├── mcp/
│   ├── load_mcp_tools.tsx             # Web 组件
│   └── execute_mcp_tool.tsx           # Web 组件
└── batch_command.tsx                  # 已删除
```

---

## 附录 B: 完整使用示例

### B.1 查询并执行单个 MCP 工具

```typescript
// 步骤 1: 查询可用工具
const loadResult = await load_mcp_tools.invoke({});
const parsed = JSON.parse(loadResult);
console.log(
    'Available tools:',
    parsed.tools.map((t) => t.name),
);
// Output: ["filesystem.read_file", "search.web", ...]

// 步骤 2: 执行工具
const execResult = await execute_mcp_tool.invoke({
    commands: [
        {
            name: 'filesystem.read_file',
            args: { path: '/path/to/file.txt' },
        },
    ],
});
const execParsed = JSON.parse(execResult);
console.log('Result:', execParsed.results[0].result);
```

### B.2 批量执行多个 MCP 工具

```typescript
const result = await execute_mcp_tool.invoke({
    commands: [
        {
            name: 'filesystem.read_file',
            args: { path: '/path/to/file1.txt' },
        },
        {
            name: 'filesystem.write_file',
            args: {
                path: '/path/to/file2.txt',
                content: 'Hello, World!',
            },
        },
        {
            name: 'search.web',
            args: { query: 'AI development' },
        },
    ],
});

const parsed = JSON.parse(result);
parsed.results.forEach((r) => {
    if (r.error) {
        console.error(`[ERROR] ${r.tool}: ${r.error}`);
    } else {
        console.log(`[SUCCESS] ${r.tool}:`, r.result);
    }
});
```

---

**文档版本**: 2.0 **最后更新**: 2025-02-14 **状态**: ✅ 已完成（MCP Tools 重构）
