# MCP Tools 命令重构规范

> **状态**: ✅ 已完成（进一步重构为 MCPMiddleware 统一实现，见 `mcp-middleware-integration.md`） **创建日期**:
> 2025-02-14 **完成日期**: 2025-02-14 **最后验证**: 2026-03-06

---

## 1. 概述

### 1.1 背景

当前系统使用 `batch_command`
统一批量执行所有工具（包括 MCP 工具和系统工具）。为了更好地管理 MCP 工具的生命周期，需要将其拆分为两个专门的命令：

1. **load_mcp_tools** - 加载和查询 MCP 工具列表
2. **execute_mcp_tool** - 执行 MCP 工具

### 1.2 目标

- ✅ 明确区分 MCP 工具的发现和执行阶段
- ✅ 简化 CommandSystemMiddleware 的职责
- ✅ 提供更清晰的 MCP 工具状态查询能力
- ✅ 保持向后兼容的执行体验（支持批量执行）

### 1.3 影响范围

| 组件                      | 变更类型 | 说明                             |
| ------------------------- | -------- | -------------------------------- |
| `CommandSystemMiddleware` | 🔴 重构  | 移除 batch_command，新增两个命令 |
| `MCPManager`              | 🟡 扩展  | 添加工具查询接口                 |
| TUI 组件                  | 🔴 重构  | 新增两个工具的渲染组件           |
| 测试                      | 🔴 更新  | 更新所有相关测试用例             |

---

## 2. 设计决策

### 2.1 命令设计

#### 2.1.1 load_mcp_tools

**用途**：加载并返回所有可用的 MCP 工具列表

**参数**：

```typescript
{
    // 无参数
}
```

**返回格式**：

```typescript
{
  tools: Array<{
    name: string;           // 工具名称
    description: string;    // 工具描述
    schema: any;            // 工具参数 schema
    server: string;         // MCP 服务器名称
  }>;
  status: {
    isInitialized: boolean;
    toolCount: number;
    servers: string[];
  };
}
```

**使用场景**：

- Agent 需要了解有哪些 MCP 工具可用
- 需要获取工具的参数格式
- 需要检查 MCP 连接状态

#### 2.1.2 execute_mcp_tool

**用途**：执行一个或多个 MCP 工具

**参数**：

```typescript
{
    commands: Array<{
        name: string; // MCP 工具名称
        args: Record<string, any>; // 工具参数
    }>;
}
```

**返回格式**：

```typescript
{
    results: Array<{
        tool: string; // 工具名称
        result: any; // 执行结果
        error?: string; // 错误信息（如果有）
    }>;
}
```

**使用场景**：

- 执行单个 MCP 工具
- 批量执行多个 MCP 工具
- 跨多个 MCP 服务器的操作

### 2.2 系统工具处理

**决策**：`read_tool` 和 `glob_tool` 仍然通过 `CommandSystemMiddleware` 管理，但不再通过统一的批量命令调用。

**影响**：

- Agent 可以直接调用 `read_file`, `glob_files` 等标准工具
- MCP 工具需要先通过 `load_mcp_tools` 发现，再通过 `execute_mcp_tool` 调用

### 2.3 Prompt Caching

**决策**：新命令的 description 保持静态，支持 Anthropic Prompt Caching

**实现**：

- 工具列表不写入 description
- 通过 `load_mcp_tools` 运行时查询
- 符合现有 Prompt Caching 策略

---

## 3. API 设计

### 3.1 load_mcp_tools

```typescript
export const load_mcp_tools = tool(
    async () => {
        const mcpManager = MCPManager.getInstance();
        const status = await mcpManager.getStatus();
        const tools = await mcpManager.getAllTools();

        return JSON.stringify(
            {
                tools: tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    schema: t.schema,
                    server: t.name.split(':')[0] || 'unknown', // 从工具名提取服务器前缀
                })),
                status,
            },
            null,
            2,
        );
    },
    {
        name: 'load_mcp_tools',
        description: `加载并查询所有可用的 MCP 工具列表。

返回：
- tools: MCP 工具列表，每个工具包含 name, description, schema, server
- status: MCP 连接状态，包含 toolCount, servers 等

使用场景：
- 查询当前有哪些 MCP 工具可用
- 获取工具的参数格式
- 检查 MCP 连接状态

重要：工具列表是动态的，建议在需要时调用此命令获取最新信息。`,
        schema: z.object({}),
    },
);
```

### 3.2 execute_mcp_tool

```typescript
export const execute_mcp_tool_schema = z.object({
    commands: z
        .array(
            z.object({
                name: z.string().describe('MCP 工具名称'),
                args: z.record(z.string(), z.any()).describe('工具参数，JSON 对象格式'),
            }),
        )
        .describe('要执行的 MCP 工具列表'),
});

export const execute_mcp_tool = tool(
    async ({ commands }) => {
        const mcpManager = MCPManager.getInstance();
        const results: Array<{ tool: string; result: any; error?: string }> = [];

        for (const cmd of commands) {
            const { name, args } = cmd;

            try {
                // 通过 MCPManager 执行工具
                const result = await mcpManager.executeTool(name, args);
                results.push({ tool: name, result });
            } catch (error: any) {
                results.push({
                    tool: name,
                    result: null,
                    error: error.message || String(error),
                });
            }
        }

        // 格式化返回结果
        return JSON.stringify(
            {
                results,
            },
            null,
            2,
        );
    },
    {
        name: 'execute_mcp_tool',
        description: `执行一个或多个 MCP 工具。

使用格式：
- commands: MCP 工具数组，每个工具包含 name 和 args

示例：
- 执行单个工具: {commands: [{name: "filesystem.read_file", args: {path: "/path/to/file"}}]}
- 执行多个工具: {commands: [{name: "tool1", args: {...}}, {name: "tool2", args: {...}}]}

重要：
- 所有工具独立执行，失败不影响其他工具
- 返回结果按命令顺序排列
- 适合批量执行 MCP 相关操作`,
        schema: execute_mcp_tool_schema,
    },
);
```

### 3.3 MCPManager 扩展

```typescript
// 在 MCPManager 类中添加新方法

/**
 * 执行单个 MCP 工具
 */
async executeTool(toolName: string, args: any): Promise<any> {
    if (!this.client) {
        throw new Error('MCP client not initialized. Call initialize() first.');
    }

    const tools = await this.getAllTools();
    const targetTool = tools.find((t) => t.name === toolName);

    if (!targetTool) {
        throw new Error(`Tool not found: ${toolName}. Available: ${tools.map(t => t.name).join(', ')}`);
    }

    return await targetTool.invoke(args);
}
```

---

## 4. 实现清单

### Phase 1: 核心 Middleware 实现

- [ ] 4.1 扩展 `MCPManager`
    - [ ] 添加 `executeTool(toolName: string, args: any)` 方法
    - [ ] 添加 `getToolInfo(toolName: string)` 方法（可选）
    - [ ] 更新 TypeScript 类型定义
    - **文件**: `packages/agent/src/mcp/MCPManager.ts`

- [ ] 4.2 重构 `CommandSystemMiddleware`
    - [ ] 移除 `batch_command` 工具
    - [ ] 添加 `load_mcp_tools` 工具
    - [ ] 添加 `execute_mcp_tool` 工具
    - [ ] 更新 `wrapModelCall` 中的系统提示词
    - [ ] 移除 `registerTools` 方法（不再需要）
    - **文件**: `packages/agent/src/middlewares/commandSystem.ts`

- [ ] 4.3 更新 `factory-v2.ts`
    - [ ] 简化 CommandSystemMiddleware 初始化
    - [ ] 移除 MCP 工具注册到 CommandSystem 的逻辑
    - [ ] 只保留 `read_tool` 和 `glob_tool` 在 CommandSystem（如果需要）
    - **文件**: `packages/agent/src/subagents/factory-v2.ts`

### Phase 2: TUI 组件更新

- [ ] 5.1 创建 `load_mcp_tools` TUI 组件
    - [ ] 创建 `packages/agent/src/tools/mcp/load_mcp_tools.tsx`
    - [ ] 实现工具列表展示
    - [ ] 实现连接状态展示
    - [ ] 实现参数 schema 展示（可选）

- [ ] 5.2 创建 `execute_mcp_tool` TUI 组件
    - [ ] 创建 `packages/agent/src/tools/mcp/execute_mcp_tool.tsx`
    - [ ] 实现命令列表展示
    - [ ] 实现结果展示（复用 `LimitedOutput`）
    - [ ] 实现错误高亮

- [ ] 5.3 移除 `batch_command` TUI 组件
    - [ ] 删除 `zen-code/src/chat/tools/batch_command.tsx`
    - [ ] 删除 `zen-worker/src/tools/batch_command.tsx`
    - [ ] 更新工具注册

### Phase 3: 测试更新

- [ ] 6.1 更新 `CommandSystemMiddleware` 测试
    - [ ] 移除 `batch_command` 相关测试
    - [ ] 添加 `load_mcp_tools` 测试
    - [ ] 添加 `execute_mcp_tool` 测试
    - [ ] 更新 Mock MCPManager
    - **文件**: `packages/agent/src/__tests__/middlewares/commandSystem.test.ts`

- [ ] 6.2 添加 `MCPManager` 测试
    - [ ] 测试 `executeTool` 方法
    - [ ] 测试错误处理
    - [ ] 测试工具不存在的场景
    - **文件**: `packages/agent/src/__tests__/mcp/MCPManager.test.ts` (新建)

- [ ] 6.3 集成测试
    - [ ] 测试 Agent 调用 `load_mcp_tools`
    - [ ] 测试 Agent 调用 `execute_mcp_tool`
    - [ ] 测试完整工作流程

### Phase 4: 文档更新

- [ ] 7.1 更新 `dynamic-tool-command-system.md`
    - [ ] 移除 `batch_command` 说明
    - [ ] 添加 `load_mcp_tools` 和 `execute_mcp_tool` 说明
    - [ ] 更新架构图

- [ ] 7.2 创建 `mcp-tools-guide.md`
    - [ ] MCP 工具使用指南
    - [ ] 示例代码
    - [ ] 最佳实践

---

## 5. 测试策略

### 5.1 单元测试

#### 5.1.1 MCPManager 测试

```typescript
describe('MCPManager', () => {
    describe('executeTool', () => {
        it('should execute tool successfully');
        it('should throw error if client not initialized');
        it('should throw error if tool not found');
        it('should handle tool execution errors');
    });
});
```

#### 5.1.2 CommandSystemMiddleware 测试

```typescript
describe('CommandSystemMiddleware', () => {
    describe('load_mcp_tools', () => {
        it('should load and return MCP tools');
        it('should include tool schemas');
        it('should include status information');
        it('should handle empty MCP configuration');
    });

    describe('execute_mcp_tool', () => {
        it('should execute single MCP tool');
        it('should execute multiple MCP tools');
        it('should handle tool not found error');
        it('should handle tool execution error');
        it('should return results in order');
    });
});
```

### 5.2 集成测试

```typescript
describe('MCP Tools Integration', () => {
    it('should load tools and execute them');
    it('should handle MCP disconnection gracefully');
    it('should work with real MCP servers');
});
```

### 5.3 测试用例优先级

| 优先级 | 测试场景                        | 说明     |
| ------ | ------------------------------- | -------- |
| P0     | MCPManager.executeTool 成功执行 | 核心功能 |
| P0     | load_mcp_tools 返回正确格式     | API 契约 |
| P0     | execute_mcp_tool 执行单个工具   | 基本用例 |
| P0     | execute_mcp_tool 执行多个工具   | 批量执行 |
| P1     | 工具不存在时的错误处理          | 边界情况 |
| P1     | MCP 未初始化时的错误处理        | 边界情况 |
| P2     | TUI 组件渲染正确                | UI 测试  |

---

## 6. 迁移指南

### 6.1 Agent 行为变化

#### 变化前（使用 batch_command）

```
User: 使用 MCP 工具读取文件
AI: batch_command({
  commands: [
    {name: "filesystem.read_file", args: {path: "/path/to/file"}}
  ]
})
```

#### 变化后（使用新的 MCP 命令）

```
User: 使用 MCP 工具读取文件
AI: load_mcp_tools()
→ 返回 MCP 工具列表

AI: execute_mcp_tool({
  commands: [
    {name: "filesystem.read_file", args: {path: "/path/to/file"}}
  ]
})
```

### 6.2 系统工具调用

**变化前**：所有工具通过 `batch_command`

**变化后**：

- 标准工具（read_file, glob_files）直接调用
- MCP 工具通过 `load_mcp_tools` + `execute_mcp_tool`

### 6.3 向后兼容性

⚠️ **此重构不向后兼容**

- 旧的 `batch_command` 将被移除
- Agent 需要调整调用方式
- 建议通过 Prompt 指导 Agent 适应新命令

### 6.4 迁移步骤

1. **Phase 1**: 实现新命令（旧命令仍可用）
2. **Phase 2**: 更新系统提示词，引导 Agent 使用新命令
3. **Phase 3**: 观察 Agent 行为，测试新命令
4. **Phase 4**: 移除 `batch_command` 及相关代码

---

## 7. 风险评估

### 7.1 技术风险

| 风险                    | 概率 | 影响 | 缓解措施                     |
| ----------------------- | ---- | ---- | ---------------------------- |
| MCPManager 扩展引入 bug | 中   | 高   | 充分测试，保留旧逻辑作为回退 |
| Agent 不适应新命令      | 高   | 中   | 通过系统提示词明确引导       |
| TUI 组件不兼容          | 低   | 低   | 保持渲染逻辑一致             |

### 7.2 时间风险

| 任务                     | 预估时间     | 缓冲时间      |
| ------------------------ | ------------ | ------------- |
| Phase 1: 核心 Middleware | 2-3 小时     | +1 小时       |
| Phase 2: TUI 组件        | 1-2 小时     | +1 小时       |
| Phase 3: 测试            | 2-3 小时     | +1 小时       |
| Phase 4: 文档            | 1 小时       | +0.5 小时     |
| **总计**                 | **6-9 小时** | **+3.5 小时** |

---

## 8. 验收标准

### 8.1 功能验收

- [ ] `load_mcp_tools` 返回正确的工具列表和状态
- [ ] `execute_mcp_tool` 能正确执行 MCP 工具
- [ ] `execute_mcp_tool` 支持批量执行
- [ ] 错误处理覆盖所有边界情况
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过

### 8.2 性能验收

- [ ] `load_mcp_tools` 响应时间 < 1s（有缓存）或 < 3s（无缓存）
- [ ] `execute_mcp_tool` 单个工具执行时间与 MCP 工具一致
- [ ] 批量执行无额外性能损耗

### 8.3 文档验收

- [ ] 更新相关 specs 文档
- [ ] 更新 API 文档
- [ ] 更新使用指南

---

## 9. 未来扩展

### 9.1 可能的改进

- [ ] 添加 MCP 工具缓存机制
- [ ] 支持增量加载工具列表
- [ ] 添加工具执行历史记录
- [ ] 支持工具执行超时配置
- [ ] 添加工具执行限流

### 9.2 集成点

- MCP 工具权限管理
- MCP 工具使用统计
- MCP 工具监控和告警

---

## 10. 相关文件清单

### 10.1 需要修改的文件

| 文件                                                             | 变更类型 |
| ---------------------------------------------------------------- | -------- |
| `packages/agent/src/mcp/MCPManager.ts`                           | 🟡 扩展  |
| `packages/agent/src/middlewares/commandSystem.ts`                | 🔴 重构  |
| `packages/agent/src/subagents/factory-v2.ts`                     | 🟡 更新  |
| `packages/agent/src/__tests__/middlewares/commandSystem.test.ts` | 🔴 更新  |
| `zen-code/src/chat/tools/batch_command.tsx`                      | 🔴 删除  |
| `zen-worker/src/tools/batch_command.tsx`                         | 🔴 删除  |

### 10.2 需要新建的文件

| 文件                                                  | 说明            |
| ----------------------------------------------------- | --------------- |
| `packages/agent/src/__tests__/mcp/MCPManager.test.ts` | MCPManager 测试 |
| `packages/agent/src/tools/mcp/load_mcp_tools.tsx`     | TUI 组件        |
| `packages/agent/src/tools/mcp/execute_mcp_tool.tsx`   | TUI 组件        |

### 10.3 需要更新的文档

| 文件                                   | 说明                     |
| -------------------------------------- | ------------------------ |
| `specs/dynamic-tool-command-system.md` | 更新架构说明             |
| `docs/mcp-tools-guide.md`              | MCP 工具使用指南（新建） |

---

## 11. 示例代码

### 11.1 完整的使用流程

```typescript
// 1. Agent 首先查询可用的 MCP 工具
const tools = await load_mcp_tools.invoke({});
const parsed = JSON.parse(tools);
console.log('Available MCP tools:', parsed.tools);

// 2. Agent 选择工具并执行
const result = await execute_mcp_tool.invoke({
    commands: [
        {
            name: 'filesystem.read_file',
            args: { path: '/path/to/file.txt' },
        },
        {
            name: 'filesystem.list_directory',
            args: { path: '/path/to/dir' },
        },
    ],
});
console.log('Execution result:', JSON.parse(result));
```

### 11.2 系统提示词片段

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

---

## 附录 A: 问题与讨论

### A.1 为什么移除 batch_command？

**答**：

- 职责更清晰：MCP 工具和系统工具分开管理
- 便于调试：可以独立测试 MCP 工具加载和执行
- 更好的错误隔离：MCP 工具错误不影响系统工具
- 符合单一职责原则

### A.2 为什么 execute_mcp_tool 支持批量执行？

**答**：

- 保持与原 `batch_command` 相同的体验
- 支持跨服务器的批量操作
- 减少往返次数

### A.3 如何处理 MCP 工具命名冲突？

**答**：

- 当前 MCPManager 使用 `prefixToolNameWithServerName: false`
- 通过工具名称本身区分
- 如果需要，可以在返回的工具列表中添加 `server` 字段

---

## 附录 B: 测试覆盖率目标

| 组件                    | 目标覆盖率 |
| ----------------------- | ---------- |
| MCPManager              | > 80%      |
| CommandSystemMiddleware | > 85%      |
| TUI 组件                | > 70%      |

---

## 附录 C: 变更日志

| 日期       | 版本  | 变更内容 |
| ---------- | ----- | -------- |
| 2025-02-14 | 1.0.0 | 初始版本 |

---

**文档版本**: 1.0.0 **最后更新**: 2025-02-14 **状态**: 📋 待实现
