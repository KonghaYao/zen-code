# 动态工具 Command 系统设计文档

> **状态**: ✅ 已完成（已重构为 MCPMiddleware 统一实现） **最后验证**: 2026-03-06 **历史**:
>
> - v1.0 (2025-01-18): CommandSystemMiddleware + MCPManager 双模块设计
> - v2.0 (2025-02-14): 重构为 `load_mcp_tools` + `execute_mcp_tool` 命令系统
> - v3.0 (2025-02-17): 合并为统一 MCPMiddleware（CommandSystemMiddleware 已删除）

---

## 1. 当前架构（v3.0）

### 1.1 概述

CommandSystemMiddleware 和 MCPManager 已合并为统一的 **MCPMiddleware**，位于
`packages/standard-agent/src/middlewares/mcp.ts`。

项目层提供
**MCPWithConfigMiddleware**（`packages/agent/src/middlewares/mcpWithConfig.ts`），继承自 MCPMiddleware，自动从
`~/.zen-code/settings.json` 加载 MCP 服务器配置。

### 1.2 文件结构

```
packages/standard-agent/src/middlewares/
└── mcp.ts                         # MCPMiddleware 基类（框架层，通用）

packages/agent/src/middlewares/
└── mcpWithConfig.ts               # MCPWithConfigMiddleware（应用层，读取配置文件）

packages/agent/src/subagents/
└── factory-v2.ts                  # 工厂中直接 new MCPWithConfigMiddleware()
```

**已删除**（原架构残留）：

- ~~`packages/agent/src/middlewares/commandSystem.ts`~~ → 已删除
- ~~`packages/agent/src/mcp/MCPManager.ts`~~ → 已删除

### 1.3 工具接口

MCPMiddleware 提供两个工具（`directInject: false` 默认模式）：

| 工具               | 用途                          |
| ------------------ | ----------------------------- |
| `load_mcp_tools`   | 查询可用的 MCP 工具列表和状态 |
| `execute_mcp_tool` | 执行 MCP 工具（支持批量）     |

---

## 2. MCPMiddleware 类

```typescript
// packages/standard-agent/src/middlewares/mcp.ts

export interface MCPMiddlewareOptions {
    configProvider: () => Promise<MCPConfig | null | undefined>;
    cache?: {
        ttl?: number; // 工具缓存 TTL（秒，默认 300）
        reconnectDelay?: number; // 重连延迟（毫秒，默认 5000）
    };
    /**
     * 是否直接注入 MCP 工具到 agent tools 数组
     * - false（默认）: 包装为 load_mcp_tools + execute_mcp_tool 命令
     * - true: 直接将 MCP 工具暴露给 agent（适用于 zen-swarm 轻量场景）
     */
    directInject?: boolean;
}

export class MCPMiddleware implements AgentMiddleware {
    name = 'MCPMiddleware';
    // get tools() 根据 directInject 返回不同结果
    // wrapModelCall() 在 directInject=false 时注入使用说明
}
```

### 2.1 directInject 参数

| 场景            | `directInject: false`（默认）        | `directInject: true`                  |
| --------------- | ------------------------------------ | ------------------------------------- |
| `get tools()`   | `[load_mcp_tools, execute_mcp_tool]` | 实际 MCP 工具列表（StructuredTool[]） |
| `wrapModelCall` | 注入两步使用说明到 systemPrompt      | 不修改 systemPrompt                   |
| 适用场景        | zen-code（有 CommandSystem 概念）    | zen-swarm 等轻量 agent                |

---

## 3. MCPWithConfigMiddleware

```typescript
// packages/agent/src/middlewares/mcpWithConfig.ts

export class MCPWithConfigMiddleware extends MCPMiddleware {
    constructor(cache?: { ttl?: number; reconnectDelay?: number }) {
        super({
            configProvider: async () => MCPWithConfigMiddleware.loadConfigFromStore(),
            cache,
        });
    }

    // 从 ~/.zen-code/settings.json 的 mcp_config 字段加载配置
    private static async loadConfigFromStore(): Promise<MCPConfig | null>;
}
```

---

## 4. 核心命令

### 4.1 load_mcp_tools

**用途**：加载并查询所有可用的 MCP 工具列表

**输入**：无参数

**返回**：

```json
{
    "tools": [
        {
            "name": "filesystem.read_file",
            "description": "Read a file",
            "schema": { ... }
        }
    ],
    "status": {
        "isInitialized": true,
        "toolCount": 3,
        "servers": ["filesystem", "search"]
    }
}
```

### 4.2 execute_mcp_tool

**用途**：执行一个或多个 MCP 工具（支持批量）

**输入**：

```json
{
    "commands": [
        { "name": "filesystem.read_file", "args": { "path": "/path/to/file.txt" } },
        { "name": "search.web", "args": { "query": "AI" } }
    ]
}
```

**返回**：

```json
{
    "results": [
        { "tool": "filesystem.read_file", "result": { "content": "..." } },
        { "tool": "search.web", "result": null, "error": "Tool not found" }
    ]
}
```

---

## 5. 集成方式

### 5.1 factory-v2.ts 集成

```typescript
// packages/agent/src/subagents/factory-v2.ts

// MCP middleware 始终启用（在 pkg.middlewares 循环后追加）
const mcpMiddleware = new MCPWithConfigMiddleware();
middleware.push(mcpMiddleware);
```

### 5.2 Agent 使用 MCP 工具流程

```
1. load_mcp_tools()          → 查询可用工具列表
2. execute_mcp_tool({...})   → 执行 MCP 工具
```

**标准工具**（read_file, glob_files 等）直接调用，无需通过 MCP 命令。

---

## 6. 系统提示词

`directInject: false` 时，MCPMiddleware 在 `wrapModelCall` 中注入如下说明（与 CLAUDE.md 中的文档一致）：

```
## MCP Tools

使用 MCP 工具需要两步：

1. **load_mcp_tools** - 查询可用的 MCP 工具
2. **execute_mcp_tool** - 执行 MCP 工具

重要：
- 标准工具（read_file, glob_files）直接调用，不需要通过 MCP 命令
- MCP 工具需要先调用 load_mcp_tools 查询
- 再调用 execute_mcp_tool 执行
```

---

## 7. TUI 组件

**文件**（已实现）：

- `zen-code/src/chat/tools/mcp/load_mcp_tools.tsx` - 显示 MCP 工具列表和状态
- `zen-code/src/chat/tools/mcp/execute_mcp_tool.tsx` - 显示 MCP 工具执行结果

**已删除**：

- ~~`zen-code/src/chat/tools/batch_command.tsx`~~ → 已删除

---

## 8. 测试

**测试文件**：

- `packages/standard-agent/src/__tests__/middlewares/mcp.test.ts` - MCPMiddleware 测试

```bash
bun test packages/standard-agent/src/__tests__/middlewares/mcp.test.ts
```

---

## 9. 版本历史（差异说明）

### v1.0 → v2.0（2025-02-14）

- 移除 `batch_command` + `list_available_commands`
- 引入 `load_mcp_tools` + `execute_mcp_tool`
- MCPManager 独立于 CommandSystemMiddleware

### v2.0 → v3.0（2025-02-17，`mcp-middleware-integration.md`）

- **合并** CommandSystemMiddleware 和 MCPManager 为 MCPMiddleware
- **删除** `packages/agent/src/middlewares/commandSystem.ts`
- **删除** `packages/agent/src/mcp/MCPManager.ts`
- **新建** `packages/standard-agent/src/middlewares/mcp.ts`
- **新建** `packages/agent/src/middlewares/mcpWithConfig.ts`
- 新增 `directInject` 参数支持轻量 agent 场景
