# Tavily MCP Server

## 概述

Tavily MCP Server 是一个基于 Model Context Protocol
(MCP) 的搜索工具服务器，提供了强大的网络搜索、内容提取、网页爬取和网站映射功能。

## 功能特性

### 1. tavily_search - 网络搜索工具

**功能**：使用 Tavily 的 AI 搜索引擎进行实时网络搜索，提供全面的搜索结果。

**主要参数**：

- `query` - 搜索查询（必需）
- `search_depth` - 搜索深度：basic/advanced/fast/ultra-fast
- `topic` - 搜索类别：general/news
- `max_results` - 最大结果数（5-20）
- `include_images` - 是否包含图片
- `include_raw_content` - 是否包含原始内容
- `include_domains` - 包含特定域名
- `exclude_domains` - 排除特定域名
- `country` - 国家过滤（优先显示该国内容）
- `time_range` - 时间范围：day/week/month/year
- `start_date`/`end_date` - 日期范围过滤

**使用场景**：

- 实时信息查询
- 新闻搜索
- 研究资料收集
- 竞品分析

### 2. tavily_extract - 内容提取工具

**功能**：从指定 URL 提取和处理网页原始内容。

**主要参数**：

- `urls` - URL 列表（必需）
- `extract_depth` - 提取深度：basic/advanced
- `include_images` - 是否包含图片
- `format` - 输出格式：markdown/text
- `include_favicon` - 是否包含网站图标
- `query` - 用户意图查询（用于重排序）

**使用场景**：

- 数据收集
- 内容分析
- 研究任务
- LinkedIn 等复杂页面提取

### 3. tavily_crawl - 网页爬取工具

**功能**：从指定基础 URL 开始的结构化网页爬取，像图一样展开。

**主要参数**：

- `url` - 起始 URL（必需）
- `max_depth` - 最大爬取深度
- `max_breadth` - 每层最大链接数
- `limit` - 总链接处理限制
- `instructions` - 自然语言指令
- `select_paths` - 路径模式过滤
- `select_domains` - 域名过滤
- `allow_external` - 是否允许外部链接
- `extract_depth` - 提取深度
- `format` - 输出格式

**使用场景**：

- 网站审计
- 内容发现
- 链接分析
- 网站结构理解

### 4. tavily_map - 网站映射工具

**功能**：创建网站 URL 的结构化映射，分析网站架构。

**主要参数**：

- `url` - 起始 URL（必需）
- `max_depth` - 最大映射深度
- `max_breadth` - 每层最大链接数
- `limit` - 总链接处理限制
- `instructions` - 自然语言指令
- `select_paths` - 路径模式过滤
- `select_domains` - 域名过滤
- `allow_external` - 是否允许外部链接

**使用场景**：

- 网站架构分析
- 内容组织理解
- 导航路径发现
- 网站审计

## 项目结构

```
packages/tavily-deno/
├── main.ts              # 主服务器实现
├── src/
│   └── sse.ts          # SSE 传输层实现
├── .env                # 环境配置
└── tsconfig.json       # TypeScript 配置
```

## 配置

### 环境变量

```bash
TAVILY_API_KEY=your_api_key_here
TAVILY_HOST=https://api.tavily.com  # 可选，默认为 https://api.tavily.com
PORT=3000                           # 可选，默认为 3000
DEFAULT_PARAMETERS={}               # 可选，默认参数 JSON 对象
```

### 项目配置

在主应用的配置文件中集成：

```json
{
    "mcp_config": {
        "tavily": {
            "command": "deno",
            "args": ["run", "--allow-net", "--allow-env", "packages/tavily-deno/main.ts"],
            "env": {
                "TAVILY_API_KEY": "your_api_key_here"
            }
        }
    }
}
```

## 使用方式

### 1. 启动服务器

```bash
# 使用 Deno 运行
deno run --allow-net --allow-env packages/tavily-deno/main.ts

# 或者使用项目脚本（如果已配置）
bun run packages/tavily-deno/main.ts
```

### 2. 通过 MCP 客户端调用

服务器提供以下端点：

- `http://localhost:3000/sse` - SSE 连接端点
- `http://localhost:3000/messages` - 消息接收端点
- `http://localhost:3000/health` - 健康检查端点

### 3. 在主应用中使用

通过 MCPManager 集成：

```typescript
// 1. 加载 MCP 工具列表
const tools = await load_mcp_tools();

// 2. 执行 Tavily 工具
const result = await execute_mcp_tool({
    commands: [
        {
            name: 'tavily_search',
            args: {
                query: '最新 AI 技术发展',
                search_depth: 'advanced',
                max_results: 10,
            },
        },
    ],
});
```

## 技术实现

### 架构设计

1. **MCP 协议实现**：
    - 基于 `@modelcontextprotocol/sdk`
    - 支持工具发现和调用
    - 使用 SSE 进行实时通信

2. **传输层**：
    - SSE (Server-Sent Events) 用于服务器到客户端的消息
    - HTTP POST 用于客户端到服务器的消息
    - Hono 框架提供 HTTP 服务器

3. **错误处理**：
    - API 密钥验证
    - 请求参数验证
    - 网络错误处理
    - 速率限制处理

### 核心类

```typescript
class TavilyClient {
    // MCP 服务器实例
    server: Server;

    // API 端点配置
    baseURLs = {
        search: HOST + '/search',
        extract: HOST + '/extract',
        crawl: HOST + '/crawl',
        map: HOST + '/map'
    };

    // SSE 传输管理
    private activeTransports = new Map<string, SSEServerTransport>();

    // 工具处理器
    setupToolHandlers() { ... }

    // HTTP 请求封装
    async makeRequest(endpoint: string, data: Record<string, unknown>) { ... }

    // 各工具实现
    async search(params: Record<string, unknown>) { ... }
    async extract(params: Record<string, unknown>) { ... }
    async crawl(params: Record<string, unknown>) { ... }
    async map(params: Record<string, unknown>) { ... }
}
```

## 集成到主应用

### 1. 配置集成

在 `packages/agent/src/subagents/factory.ts` 中：

```typescript
// 添加 MCP 工具到命令系统
if (config.middleware.mcp) {
    const mcpTools = await MCPManager.getInstance().getAllTools();
    commandTools.push(...mcpTools);
}
```

### 2. 工具调用

通过 CommandSystemMiddleware 提供的工具：

```typescript
// 加载 MCP 工具
const loadTool = middleware.tools.find((t) => t.name === 'load_mcp_tools');

// 执行 MCP 工具
const executeTool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
```

### 3. 配置管理

在 `packages/config/src/types/index.ts` 中：

```typescript
export interface AppConfig {
    // ... 其他配置
    mcp_config?: MCPConfig;
}

export interface MCPConfig {
    [key: string]: any;
}
```

## 安全考虑

1. **API 密钥保护**：
    - 通过环境变量管理
    - 不在代码中硬编码
    - 支持密钥轮换

2. **请求验证**：
    - 参数类型检查
    - 必需字段验证
    - 范围限制（如 max_results 5-20）

3. **速率限制**：
    - 处理 429 错误
    - 提供友好的错误信息

## 性能优化

1. **缓存机制**：
    - 工具列表缓存
    - 连接状态管理
    - 重连延迟配置

2. **并发处理**：
    - SSE 连接管理
    - 多会话支持
    - 异步请求处理

3. **资源清理**：
    - 连接关闭处理
    - 内存泄漏预防
    - 信号处理（SIGINT）

## 故障排除

### 常见问题

1. **API 密钥错误**：

    ```
    Error: TAVILY_API_KEY environment variable is required
    ```

    **解决**：在 `.env` 文件中设置 `TAVILY_API_KEY`

2. **连接失败**：

    ```
    Error: MCP client not initialized
    ```

    **解决**：检查 MCP 配置和网络连接

3. **工具未找到**：
    ```
    Error: Tool not found: tavily_search
    ```
    **解决**：确保 Tavily MCP 服务器已启动并正确配置

### 调试

```bash
# 查看服务器日志
deno run --allow-net --allow-env packages/tavily-deno/main.ts

# 测试健康检查
curl http://localhost:3000/health

# 查看可用工具
# 通过主应用的 load_mcp_tools 工具
```

## 扩展开发

### 添加新工具

1. 在 `main.ts` 的 `setupToolHandlers` 中添加工具定义
2. 实现对应的处理方法
3. 更新工具列表

### 自定义参数

通过 `DEFAULT_PARAMETERS` 环境变量设置默认值：

```bash
DEFAULT_PARAMETERS='{"search_depth": "advanced", "max_results": 15}'
```

## 参考资料

- [Tavily API 文档](https://docs.tavily.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Deno 文档](https://deno.land/)

## 许可证

Apache-2.0
