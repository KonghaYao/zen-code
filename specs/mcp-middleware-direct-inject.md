# MCPMiddleware directInject 参数

> **状态**: ✅ 已实现（2026-03-06 验证 - `packages/standard-agent/src/middlewares/mcp.ts` 中已实现）

## 背景

当前 `MCPMiddleware` 将 MCP 工具包装为两个高阶工具（`load_mcp_tools` +
`execute_mcp_tool`），适合有 CommandSystem 的复杂 agent 场景。但对于 zen-swarm 等无 CommandSystem 的轻量 agent，需要将 MCP 工具直接注入到 agent
tools 数组中。

## 需求

为 `MCPMiddleware` 添加 `directInject?: boolean` 参数，控制 MCP 工具的暴露方式。

## 参数定义

```typescript
export interface MCPMiddlewareOptions {
    configProvider: () => Promise<MCPConfig | null | undefined>;
    cache?: { ttl?: number; reconnectDelay?: number };

    /**
     * Whether to inject MCP tools directly into agent tools array.
     * - false (default): Wrap as load_mcp_tools + execute_mcp_tool commands
     * - true: Expose MCP tools directly as agent tools (bypass CommandSystem)
     */
    directInject?: boolean;
}
```

## 行为对比

| 场景            | `directInject: false`（默认）        | `directInject: true`                  |
| --------------- | ------------------------------------ | ------------------------------------- |
| `get tools()`   | `[load_mcp_tools, execute_mcp_tool]` | 实际 MCP 工具列表（StructuredTool[]） |
| `wrapModelCall` | 注入两步使用说明到 systemPrompt      | 不修改 systemPrompt（直接透传）       |
| 初始化失败      | 空工具列表                           | 静默失败，返回空数组 `[]`             |
| 适用场景        | 有 CommandSystem 的复杂 agent        | 轻量 agent、zen-swarm 等              |

## 实现要点

1. `MCPMiddlewareOptions` 新增 `directInject?: boolean`（默认 `false`）
2. `get tools()` 根据 `directInject` 分支返回：
    - `false`: 现有的 `[loadMcpToolsTool, executeMcpToolTool]`
    - `true`: 调用 `getAllTools()` 返回的实际 MCP 工具（注意异步问题，见下）
3. `wrapModelCall` 中：
    - `directInject: false`: 现有逻辑不变
    - `directInject: true`: 不注入 MCP 说明文字，直接透传 request
4. 初始化失败时静默，`tools` 返回 `[]`

## 异步 tools 问题

由于 `get tools()` 是同步 getter，而 MCP 工具需要异步获取，需要在适当时机（如 `wrapModelCall`
前）确保工具已加载并缓存到实例变量，`get tools()` 直接返回缓存。

## 文件

- 实现：`packages/standard-agent/src/middlewares/mcp.ts`
- 测试：`packages/standard-agent/src/__tests__/middlewares/mcp.test.ts`
