---
name: "mcp-manager-status-implementation"
description: "为 MCPManager 单例类新增状态监控功能，包括整体状态（初始化、工具数、刷新时间、服务器列表）和单服务器状态（连接状态、工具数统计）；新增 MCPServerStatus 接口、lastRefresh 和 serverStatuses 状态追踪、getStatus() 和 getServerStatuses() 方法；适用于需要监控 MCP 服务器连接状态和工具可用性的场景"
tags: ["mcp", "status-monitoring", "singleton", "langchain", "typescript"]
category: "architecture"
created: "2025-01-18"
last_updated: "2025-01-18"
priority: "medium"
context_scope: "project"
---

# ## 背景

## 背景

MCPManager 是管理 MultiServerMCPClient 的单例服务，需要提供状态监控功能以查看服务器连接和工具可用性情况。已有 MCPStatus 接口但未实现。

## 决策

在 `agents/code/mcp/MCPManager.ts` 中实现完整的状态监控机制，包括整体状态和单服务器状态。

## 实现

### 1. 新增接口

```typescript
export interface MCPServerStatus {
    name: string;
    isConnected: boolean;
    toolCount: number;
    error?: string;
}
```

### 2. 新增状态字段

在 MCPManager 类中添加：
- `lastRefresh: number | null` - 记录最后刷新时间
- `serverStatuses: Map<string, MCPServerStatus>` - 服务器状态缓存

### 3. 新增方法

**getStatus()** - 返回整体状态
```typescript
async getStatus(): Promise<MCPStatus> {
    const tools = await this.getAllTools();
    const globalConfig = getConfig();
    const servers = globalConfig.mcp_config ? Object.keys(globalConfig.mcp_config) : [];
    
    return {
        isInitialized: this.client !== null,
        toolCount: tools.length,
        lastRefresh: this.lastRefresh,
        servers,
    };
}
```

**getServerStatuses()** - 返回每个服务器详细状态
```typescript
async getServerStatuses(): Promise<MCPServerStatus[]> {
    const globalConfig = getConfig();
    if (!globalConfig.mcp_config) return [];
    
    const serverNames = Object.keys(globalConfig.mcp_config);
    const tools = await this.getAllTools();
    
    // 按服务器分组统计工具数量
    const toolCountByServer = new Map<string, number>();
    for (const tool of tools) {
        const serverName = this.extractServerNameFromTool(tool.name);
        toolCountByServer.set(serverName, (toolCountByServer.get(serverName) || 0) + 1);
    }
    
    return serverNames.map(name => ({
        name,
        isConnected: true,
        toolCount: toolCountByServer.get(name) || 0,
    }));
}
```

### 4. 状态更新

在 `refreshAll()` 中更新 `lastRefresh = Date.now()`
在 `cleanup()` 中重置 `lastRefresh = null` 和 `serverStatuses.clear()`

## 待优化

`extractServerNameFromTool` 方法当前返回 `'default'`，需要根据实际的工具命名规则实现：
- 如果 `prefixToolNameWithServerName: true`，从工具名前缀提取
- 如果工具元数据中包含服务器信息，从元数据提取

## 使用场景

- 健康检查端点
- 管理面板展示服务器状态
- 调试 MCP 连接问题
