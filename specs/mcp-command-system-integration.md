# MCP Middleware → Independent Service Spec

> **状态**: ⚠️ 已废弃 / 已被更新设计替代
>
> - 此规格描述的 "MCP 改为独立单例服务" 方案已实现并进一步演进
> - 最终实现：`packages/standard-agent/src/middlewares/mcp.ts`（MCPMiddleware 统一类）
> - 参考：`mcp-middleware-integration.md`、`mcp-middleware-direct-inject.md`

## 目标

将 MCP Middleware 从中间件架构改造为独立单例服务，提供统一的工具管理和缓存机制。MCP 工具通过 LangChain
tool 接口暴露，与 Command System 完全解耦。

## 当前问题

1. **中间件耦合**：MCP 工具通过 Middleware 注入，与执行流程耦合
2. **无缓存机制**：每次都重新连接和获取工具列表
3. **工具管理分散**：MCP 工具与本地工具分离，没有统一管理
4. **无法动态刷新**：MCP 服务器配置变更需要重启
5. **性能开销**：重复的工具列表查询和连接建立

## 解决方案

### 1. MCPManager 单例服务

**文件**: `agents/code/mcp/MCPManager.ts`

```typescript
import { ClientConfig, MultiServerMCPClient } from '@langchain/mcp-adapters';

interface MCPConfig {
    mcpServers: ClientConfig['mcpServers'];
    cache?: {
        ttl?: number; // 工具缓存时间（秒），默认 300
        reconnectDelay?: number; // 重连延迟（毫秒），默认 5000
    };
}

/**
 * MCP Manager 单例服务
 * 基于 MultiServerMCPClient 实现，提供缓存和刷新机制
 */
class MCPManager {
    private static instance: MCPManager;
    private client: MultiServerMCPClient | null = null;
    private toolsCache: Map<string, any[]> = new Map();
    private lastRefresh: Map<string, number> = new Map();
    private config: MCPConfig | null = null;
    private cacheTTL: number = 300; // 默认 5 分钟

    private constructor() {}

    static getInstance(): MCPManager {
        if (!this.instance) {
            this.instance = new MCPManager();
        }
        return this.instance;
    }

    /**
     * 初始化 MultiServerMCPClient
     */
    async initialize(config: MCPConfig): Promise<void> {
        this.config = config;
        this.cacheTTL = config.cache?.ttl || 300;

        if (!config.mcpServers || Object.keys(config.mcpServers).length === 0) {
            return;
        }

        this.client = new MultiServerMCPClient({
            throwOnLoadError: true,
            prefixToolNameWithServerName: false,
            additionalToolNamePrefix: '',
            useStandardContentBlocks: true,
            onConnectionError: 'ignore',
            mcpServers: config.mcpServers,
        });

        // 预加载工具列表
        await this.refreshAll();
    }

    /**
     * 获取所有 MCP 工具（带缓存）
     */
    async getAllTools(): Promise<any[]> {
        if (!this.client) {
            return [];
        }

        // 检查缓存
        const cacheKey = 'all';
        const now = Date.now();
        const lastTime = this.lastRefresh.get(cacheKey) || 0;

        if (this.toolsCache.has(cacheKey) && now - lastTime < this.cacheTTL * 1000) {
            return this.toolsCache.get(cacheKey)!;
        }

        // 从 client 获取工具列表
        const tools = await this.client.getTools();
        this.toolsCache.set(cacheKey, tools);
        this.lastRefresh.set(cacheKey, now);

        return tools;
    }

    /**
     * 调用 MCP 工具
     * 通过 MultiServerMCPClient 内部机制自动路由到对应服务器
     */
    async callTool(toolName: string, args: any): Promise<any> {
        if (!this.client) {
            throw new Error('MCP client not initialized');
        }

        // MultiServerMCPClient 的工具已经包含了服务器信息
        // 直接通过工具名称调用
        const tools = await this.getAllTools();
        const tool = tools.find((t) => t.name === toolName);

        if (!tool) {
            throw new Error(`Tool ${toolName} not found`);
        }

        return await tool.invoke(args);
    }

    /**
     * 刷新所有服务器
     * 重新创建 MultiServerMCPClient 实例
     */
    async refreshAll(): Promise<void> {
        if (!this.config) {
            return;
        }

        // 关闭旧连接
        if (this.client) {
            await this.client.close();
        }

        // 清除缓存
        this.toolsCache.clear();
        this.lastRefresh.clear();

        // 重新初始化
        await this.initialize(this.config);
    }

    /**
     * 清理连接
     */
    async cleanup(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
        this.toolsCache.clear();
        this.lastRefresh.clear();
    }

    /**
     * 获取客户端状态
     */
    getStatus(): {
        isInitialized: boolean;
        toolCount: number;
        lastRefresh: number | null;
    } {
        const cacheKey = 'all';
        return {
            isInitialized: this.client !== null,
            toolCount: this.toolsCache.get(cacheKey)?.length || 0,
            lastRefresh: this.lastRefresh.get(cacheKey) || null,
        };
    }
}
```

**基于 MultiServerMCPClient 的优势**：

- 复用 LangChain 官方实现，减少维护成本
- 自动处理多服务器连接和工具路由
- 内置错误处理和重连机制
- 标准化的工具接口

**缓存策略**：

- 工具列表缓存时间：5 分钟（可配置）
- 连接复用：MultiServerMCPClient 内部管理
- 变更检测：配置文件变更触发刷新（重建 client）

### 2. 工具注册和暴露

**重要发现**：MultiServerMCPClient 的 `getTools()` 已经返回标准的 LangChain tools，无需额外转换！

**文件**: `agents/code/mcp/MCPManager.ts`（扩展）

```typescript
/**
 * 获取可直接用于 LangChain Agent 的工具列表
 * MultiServerMCPClient.getTools() 已经返回标准的 LangChain tools
 */
async getLangChainTools(): Promise<any[]> {
  return await this.getAllTools();
}
```

**直接使用**：

```typescript
// agents/code/graph.ts
import { MCPManager } from './mcp/MCPManager';

async function createGraph(config: Config) {
    // 初始化 MCP Manager
    const mcpManager = MCPManager.getInstance();
    await mcpManager.initialize({
        mcpServers: config.mcp_config,
        cache: { ttl: 300 },
    });

    // 直接获取 LangChain tools
    const mcpTools = await mcpManager.getLangChainTools();

    // 创建 Agent
    const agent = createReactAgent({
        llm: model,
        tools: [
            ...localTools, // 现有本地工具
            ...mcpTools, // MCP 工具（已经是 LangChain 格式）
        ],
        prompt: systemPrompt,
    });

    return agent;
}
```

**不再需要 MCPToolRegistry**：

- MultiServerMCPClient.getTools() 直接返回 LangChain tools
- 工具命名由 `prefixToolNameWithServerName` 控制
- 简化架构，减少转换层

### 3. Graph 集成

**文件**: `agents/code/graph.ts`

```typescript
import { MCPManager } from './mcp/MCPManager';

async function createGraph(config: Config) {
    // 初始化 MCP Manager（在创建 Agent 前）
    const mcpManager = MCPManager.getInstance();
    await mcpManager.initialize({
        mcpServers: config.mcp_config,
        cache: { ttl: 300 },
    });

    // 获取 MCP 工具（已经是 LangChain 格式）
    const mcpTools = await mcpManager.getLangChainTools();

    // 创建 Agent 时绑定所有工具（本地 + MCP）
    const agent = createReactAgent({
        llm: model,
        tools: [
            ...localTools, // 现有本地工具
            ...mcpTools, // MCP 工具（LangChain 格式）
        ],
        prompt: systemPrompt,
    });

    return agent;
}
```

### 4. 配置管理

**文件**: `tui/src/config/index.ts`（扩展现有）

```typescript
interface MCPConfig {
  servers: {
    [serverName: string]: {
      command: string;      // 启动命令
      args?: string[];      // 命令参数
      env?: Record<string, string>;  // 环境变量
      enabled?: boolean;    // 是否启用
    }
  }
  cache?: {
    ttl?: number;          // 工具缓存时间（秒），默认 300
    reconnectDelay?: number; // 重连延迟（毫秒），默认 5000
  }
}

// 示例配置
{
  "mcp_config": {
    "servers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
        "enabled": true
      },
      "github": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": { "GITHUB_TOKEN": "..." },
        "enabled": false  // 按需启用
      }
    },
    "cache": {
      "ttl": 300
    }
  }
}
```

### 5. 刷新机制

**触发条件**：

1. **手动刷新**：TUI 提供快捷键（如 `Ctrl+R`）
2. **配置变更**：监听 `~/.code-graph.json` 变更
3. **定时刷新**：可选的定时刷新间隔
4. **错误恢复**：工具调用失败时自动刷新该服务器

**TUI 集成**：

```typescript
// tui/src/chat/MCPControl.tsx
// 新增 MCP 状态显示和控制面板
// - 显示连接状态
// - 显示工具数量
// - 提供刷新按钮
// - 显示最近错误
```

### 6. 错误处理

```typescript
class MCPManager {
    private async callToolWithRetry(server: string, tool: string, args: any, retries = 3): Promise<any> {
        for (let i = 0; i < retries; i++) {
            try {
                return await this.callTool(server, tool, args);
            } catch (error) {
                if (i === retries - 1) throw error;

                // 最后一次重试前刷新连接
                if (i === retries - 2) {
                    await this.refreshServer(server);
                }

                await sleep(this.config.reconnectDelay);
            }
        }
    }
}
```

### 7. 移除 MCPMiddleware

**文件**: `agents/code/middlewares/MCPMiddleware.ts` → **删除**

**改造**: `agents/code/graph.ts`

```typescript
// 移除
- import { MCPMiddleware } from './middlewares/MCPMiddleware';
- { middleware: new MCPMiddleware(config.mcp_config) }

// 替换为启动时初始化
+ import { MCPManager } from './mcp/MCPManager';
+ await MCPManager.getInstance().initialize(config.mcp_config);
```

## 实现步骤

### Phase 1: MCPManager 单例

- [ ] 创建 `MCPManager` 类
- [ ] 实现单例模式
- [ ] 实现服务器连接管理
- [ ] 实现工具列表缓存

### Phase 2: Graph 集成

- [ ] 修改 `graph.ts` 移除 MCPMiddleware
- [ ] 使用 MCPManager 初始化 MCP 客户端
- [ ] 将 MCP 工具直接绑定到 Agent

### Phase 3: 缓存和刷新机制

- [ ] 实现工具列表 TTL 缓存
- [ ] 实现配置变更监听
- [ ] 实现错误自动重连和刷新

### Phase 4: TUI 集成

- [ ] 添加 MCP 状态显示
- [ ] 添加手动刷新快捷键
- [ ] 添加 MCP 配置界面（可选）

### Phase 5: 清理和测试

- [ ] 移除 `MCPMiddleware`
- [ ] 更新 `graph.ts` 初始化流程
- [ ] 测试各 MCP 服务器兼容性
- [ ] 性能测试和优化

## 配额预估

**开发时间**: 2-3 天

- Phase 1: 4-6 小时
- Phase 2: 3-4 小时
- Phase 3: 3-4 小时
- Phase 4: 4-6 小时
- Phase 5: 2-3 小时

**测试覆盖**：

- 单元测试：MCPManager 类
- 集成测试：LangChain tool 调用流程
- E2E 测试：真实 MCP 服务器（filesystem, github）

## 优势

1. **性能提升**：工具列表缓存，连接复用
2. **架构解耦**：MCP 与 Command System 完全分离，通过 LangChain 接口桥接
3. **灵活性增强**：动态刷新，按需启用
4. **标准化接口**：所有工具（本地 + MCP）统一为 LangChain tool 格式
5. **可观测性**：独立的 MCP 状态管理和错误追踪
6. **易于扩展**：新增 MCP 工具无需修改 Command System

## 架构对比

### 改造前（MCP Middleware）

```
User Request
    ↓
Agent
    ↓
MCPMiddleware ← 注入 MCP 工具
    ↓
CommandSystem (本地工具)
    ↓
Result
```

### 改造后（独立服务）

```
User Request
    ↓
Agent
    ├→ LocalTools (LangChain tools)
    └→ MCPTools (LangChain tools, 由 MCPToolRegistry 提供)
    ↓
Result

MCPManager (单例服务)
    ├→ 连接管理
    ├→ 工具缓存
    └→ 刷新机制
    ↓
MCPToolRegistry (桥接层)
    └→ MCP 工具 → LangChain tools
```

## 向后兼容

- Agent 使用 LangChain 接口无感知变化
- 配置文件向后兼容（扩展 `mcp_config` 字段）
- 本地工具保持不变

## 风险和缓解

| 风险                 | 缓解措施                                       |
| -------------------- | ---------------------------------------------- |
| MCP 服务器连接不稳定 | MultiServerMCPClient 内置重试 + 降级到本地工具 |
| 工具缓存不一致       | TTL 自动过期 + 手动刷新                        |
| 并发调用冲突         | MultiServerMCPClient 内部管理                  |
| 内存泄漏             | 定期 cleanup() + 进程退出自动清理              |
| 工具名称冲突         | 配置 `prefixToolNameWithServerName: true`      |

## 与现有代码对比

### 改造前 (MCPMiddleware)

```typescript
// agents/code/middlewares/mcp.ts
export async function MCPMiddleware(options?: ClientConfig['mcpServers']) {
    const client = new MultiServerMCPClient({
        mcpServers: options,
    });
    return createMiddleware({
        tools: await client.getTools(),
        afterAgent() {
            client.close();
        },
    });
}

// graph.ts
const graph = await createGraph(config, [{ middleware: await MCPMiddleware(config.mcp_config) }]);
```

### 改造后 (MCPManager)

```typescript
// agents/code/mcp/MCPManager.ts
class MCPManager {
    private client: MultiServerMCPClient | null = null;
    async initialize(config: MCPConfig): Promise<void> {
        this.client = new MultiServerMCPClient({
            mcpServers: config.mcpServers,
        });
    }
    async getLangChainTools(): Promise<any[]> {
        return await this.client!.getTools();
    }
}

// graph.ts
const mcpManager = MCPManager.getInstance();
await mcpManager.initialize({ mcpServers: config.mcp_config });
const mcpTools = await mcpManager.getLangChainTools();

const agent = createReactAgent({
    tools: [...localTools, ...mcpTools],
});
```

**核心改进**：

1. 单例模式：全局唯一实例，避免重复连接
2. 缓存机制：工具列表缓存，减少重复查询
3. 生命周期管理：显式 cleanup()，而非依赖 middleware afterAgent
4. 刷新机制：支持动态刷新，无需重启

## 后续优化

1. **工具元数据**：缓存工具描述、参数定义
2. **权限控制**：按服务器限制工具访问
3. **负载均衡**：多个相同服务器实例分发
4. **监控指标**：调用次数、成功率、延迟统计
