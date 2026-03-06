# MCP Config Panel Specification

> **状态**: ✅ 已实现（2026-03-06 验证 - `McpPanel.tsx` 和 `MCPStatusPanel.tsx` 均已实现）

## 概述

设计并实现 MCP (Model Context Protocol) 服务器配置面板，用于管理 MCP 服务器连接。

## 功能需求

### 核心功能

1. **查看 MCP 服务器列表**
    - 显示所有已配置的 MCP 服务器
    - 显示服务器 ID 和类型

2. **新增 MCP 服务器**
    - 支持添加新的 MCP 服务器配置
    - 支持多种配置方式

3. **编辑 MCP 服务器配置**
    - 修改现有 MCP 服务器的配置
    - 更新服务器参数

4. **删除 MCP 服务器**
    - 从配置中移除 MCP 服务器
    - 确认删除操作（最后一个服务器可删除但需要警告）

5. **测试 MCP 服务器连接**
    - 验证服务器配置是否正确
    - 尝试建立连接并返回结果

### 配置方式

使用 **JSON 编辑器** 进行配置：

- 直接输入 JSON 对象
- 自动解析并验证格式
- 提供错误提示
- 支持格式化和缩进

## 数据结构

### MCPConfig 格式

MCP 配置存储在 `AppConfig.mcp_config` 字段中，通过 `FileSystemConfigStore` 持久化到 `~/.zen-code/settings.json`。

```typescript
interface MCPConfig {
    [serverName: string]: MCPServerConfig;
}

interface MCPServerConfig {
    // stdio 模式
    command?: string; // 命令路径（如 "npx", "deno"）
    args?: string[]; // 命令参数
    env?: Record<string, string>; // 环境变量

    // SSE 模式
    url?: string; // 服务器 URL
    headers?: Record<string, string>; // HTTP 请求头
}
```

### 存储位置

- **用户配置**: `~/.zen-code/settings.json`
- **Config API**: `@codegraph/config` 包
- **访问方式**: `useSettings` hook → `config.mcp_config`

### 示例配置

#### stdio 模式示例

```json
{
    "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        "env": {
            "CUSTOM_VAR": "value"
        }
    },
    "tavily": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-tavily"],
        "env": {
            "TAVILY_API_KEY": "your-api-key"
        }
    }
}
```

#### SSE 模式示例

```json
{
    "custom-sse": {
        "url": "http://localhost:3000/sse",
        "headers": {
            "Authorization": "Bearer token",
            "X-Custom-Header": "value"
        }
    }
}
```

### 已有命令

项目已实现 `/mcp` 命令行工具，提供以下功能：

- `/mcp list` - 列出所有 MCP 服务器
- `/mcp add <name> <json>` - 添加服务器
- `/mcp remove <name>` - 删除服务器
- `/mcp get <name>` - 获取服务器详情

MCP 配置面板将提供图形化界面，补充命令行工具的不足。

## UI 设计

### 视图模式

采用简化的双视图设计：**列表视图** + **JSON 编辑视图**

#### 列表视图 (List View)

```
┌─────────────────────────────────────┐
│ MCP Servers                          │
├─────────────────────────────────────┤
│ > filesystem                        │
│   [stdio]                           │
│                                     │
│   tavily                            │
│   [stdio]                           │
│                                     │
│   custom-server                     │
│   [SSE]                             │
│                                     │
├─────────────────────────────────────┤
│ ↑↓ 导航  n 新增  d 删除  Esc 关闭   │
└─────────────────────────────────────┘
```

#### JSON 编辑视图 (JSON View) - 新增/编辑服务器

**新增模式:**

```
┌─────────────────────────────────────┐
│ Add MCP Server                       │
├─────────────────────────────────────┤
│ Server ID: my-server                 │
│                                     │
│ Config (JSON):                       │
│ {                                   │
│   "command": "npx",                 │
│   "args": ["-y", "..."],            │
│   "env": {                          │
│     "API_KEY": "xxx"                │
│   }                                 │
│ }                                   │
│                                     │
│ ✓ JSON 格式有效                      │
│                                     │
├─────────────────────────────────────┤
│ Enter 保存  Esc 取消                 │
└─────────────────────────────────────┘
```

**编辑模式:**

```
┌─────────────────────────────────────┐
│ Edit MCP Server: filesystem          │
├─────────────────────────────────────┤
│ Config (JSON):                       │
│ {                                   │
│   "command": "npx",                 │
│   "args": ["-y", "..."],            │
│   "env": {                          │
│     "API_KEY": "xxx"                │
│   }                                 │
│ }                                   │
│                                     │
│ ✓ JSON 格式有效                      │
│                                     │
├─────────────────────────────────────┤
│ Enter 保存  Esc 取消                 │
└─────────────────────────────────────┘
```

**JSON 格式错误:**

```
┌─────────────────────────────────────┐
│ Add MCP Server                       │
├─────────────────────────────────────┤
│ Server ID: my-server                 │
│                                     │
│ Config (JSON):                       │
│ {                                   │
│   "command": "npx",                 │
│   "args": ["-y", "..."],            │
│     "env": {                        │ ← 语法错误
│     "API_KEY": "xxx"                │
│   }                                 │
│ }                                   │
│                                     │
│ ✗ JSON 格式错误: Unexpected token { │
│     在第 4 行第 5 列                 │
│                                     │
├─────────────────────────────────────┤
│ Enter 保存  Esc 取消                 │
└─────────────────────────────────────┘
```

### 快捷键

| 快捷键        | 功能           |
| ------------- | -------------- |
| ↑↓            | 导航列表       |
| n / N         | 新增服务器     |
| e / E / Enter | 编辑选中服务器 |
| d / D         | 删除选中服务器 |
| t / T         | 测试连接       |
| Tab           | 切换字段/模式  |
| Enter         | 保存           |
| Esc           | 取消/关闭      |

### 交互流程

1. **查看服务器**
    - 进入面板显示列表视图
    - 上下箭头选择服务器
    - 按 `e` 或 `Enter` 进入编辑

2. **新增服务器**
    - 按 `n` 进入 JSON 编辑视图
    - 输入服务器 ID 和 JSON 配置
    - 按 `Enter` 保存

3. **编辑服务器**
    - 选中服务器按 `e` 或 `Enter`
    - 在 JSON 编辑视图中修改配置
    - 按 `Enter` 保存

4. **删除服务器**
    - 选中服务器按 `d`
    - 确认后删除

5. **测试连接**
    - 选中服务器按 `t`
    - 显示连接测试结果

## 组件结构

```
zen-code/src/chat/components/
├── McpPanel.tsx                    # 主面板组件
└── forms/
    └── McpJsonEditor.tsx          # JSON 编辑器
```

### McpPanel 组件

```typescript
interface McpPanelProps {
    onClose: () => void;
}

// 状态
- view: 'list' | 'json'
- editMode: 'add' | 'edit'
- editingServer: string | null
- selectedIndex: number
- message: string | null

// 功能
- 服务器列表渲染
- 切换视图
- 新增/编辑/删除/测试
```

### McpForm 组件

```typescript
interface McpFormProps {
    mode: 'add' | 'edit';
    serverName?: string;
    serverConfig?: MCPServerConfig;
    onCancel: () => void;
    onSave: (name: string, config: MCPServerConfig) => void;
}

// 字段
- Server ID (string)
- Type (stdio | SSE) - 可切换
- Command (string, stdio only)
- Args (string, stdio only) - JSON 格式输入
- Environment Variables (Record<string, string>, stdio only) - 键值对输入
- URL (string, SSE only)
- Headers (Record<string, string>, SSE only) - JSON 格式输入
```

#### stdio 模式字段

1. **Server ID**: 唯一标识符，只能包含字母、数字、下划线
2. **Type**: 固定为 "stdio"（可切换到 SSE）
3. **Command**: 命令路径（如 "npx", "deno"）
4. **Args**: 命令参数，JSON 数组格式
5. **Environment Variables**: 环境变量列表
    - 每行一个，格式 `KEY=VALUE`

### McpJsonEditor 组件

```typescript
interface McpJsonEditorProps {
    mode: 'add' | 'edit';
    serverName?: string;
    serverConfig?: MCPServerConfig;
    onCancel: () => void;
    onSave: (name: string, config: MCPServerConfig) => void;
}

// 新增模式字段
- Server ID (string) - 服务器唯一标识符

// 编辑模式字段
- 无需 Server ID（使用原有名称）

// 共有字段
- Config (string) - JSON 配置文本
  - 使用 MultiLineTextInput 多行输入
  - 实时验证 JSON 格式
  - 显示错误位置和原因

// 功能
- JSON 文本输入（使用 MultiLineTextInput）
- 实时格式验证
- 错误提示（包含行号和列号）
- 自动格式化（保存时）
```

## 技术实现

### 状态管理

使用 TanStack Query Hooks（遵循项目约定）：

```typescript
// zen-code/src/chat/hooks/useMcpConfig.ts
export function useMcpConfig() {
    const { config, updateConfig } = useSettings();
    return {
        mcpConfig: config?.mcp_config || {},
        updateMcpConfig: async (newConfig: MCPConfig) => {
            await updateConfig({ mcp_config: newConfig });
        },
    };
}
```

### 数据流

```
用户操作 → 组件状态 → TanStack Query → Config API → FileSystemConfigStore → JSON 文件
```

### 配置更新

- 新增服务器: `{ ...existing, [newName]: newConfig }`
- 编辑服务器: `{ ...existing, [name]: updatedConfig }`
- 删除服务器: `{ ...existing, [name]: undefined }` (过滤掉)
- 重命名服务器: 先删除旧，再添加新

### JSON 验证

```typescript
interface JSONValidationResult {
    isValid: boolean;
    error?: {
        message: string;
        line?: number;
        column?: number;
    };
    config?: MCPServerConfig;
}

function validateConfigJSON(jsonString: string): JSONValidationResult {
    try {
        const parsed = JSON.parse(jsonString);

        // 验证必须是对象
        if (typeof parsed !== 'object' || parsed === null) {
            return {
                isValid: false,
                error: { message: '配置必须是 JSON 对象' },
            };
        }

        // 验证是有效的 MCP 服务器配置
        // 至少包含 command 或 url 其中之一
        if (!parsed.command && !parsed.url) {
            return {
                isValid: false,
                error: {
                    message: '配置必须包含 "command" (stdio) 或 "url" (SSE)',
                },
            };
        }

        return {
            isValid: true,
            config: parsed as MCPServerConfig,
        };
    } catch (error) {
        // 尝试解析错误位置
        const errorMessage = error instanceof Error ? error.message : String(error);
        const lineMatch = errorMessage.match(/position (\d+)/);
        const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined;

        return {
            isValid: false,
            error: { message: `JSON 格式错误: ${errorMessage}`, line },
        };
    }
}
```

### JSON 格式化

```typescript
function formatConfigJSON(config: MCPServerConfig, indent: number = 2): string {
    return JSON.stringify(config, null, indent);
}
```

### 连接测试

```typescript
async function testMcpConnection(
    serverName: string,
    config: MCPServerConfig,
): Promise<{ success: boolean; message: string; tools?: string[] }> {
    try {
        // 1. 创建临时 MCPClient
        const client = new MultiServerMCPClient({
            throwOnLoadError: true,
            mcpServers: { [serverName]: config },
        });

        // 2. 尝试获取工具列表（验证连接）
        const tools = await client.getTools();

        // 3. 关闭连接
        await client.close();

        // 4. 返回结果
        return {
            success: true,
            message: `连接成功，发现 ${tools.length} 个工具`,
            tools: tools.map((t) => t.name),
        };
    } catch (error) {
        return {
            success: false,
            message: `连接失败: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
```

#### 测试流程

1. 用户选中服务器并按 `t`
2. 创建临时 `MultiServerMCPClient` 实例
3. 尝试调用 `getTools()` 验证连接
4. 显示测试结果：
    - 成功: 显示 "连接成功，发现 X 个工具"
    - 失败: 显示错误信息
5. 可选：列出可用工具名称

#### 测试结果显示

**成功场景:**

```
┌─────────────────────────────────────┐
│ 测试连接: filesystem                 │
├─────────────────────────────────────┤
│ ✓ 连接成功                           │
│ 发现 2 个工具:                        │
│   - filesystem.read_file            │
│   - filesystem.write_file           │
│                                     │
├─────────────────────────────────────┤
│ Enter 关闭                           │
└─────────────────────────────────────┘
```

**失败场景:**

```
┌─────────────────────────────────────┐
│ 测试连接: filesystem                 │
├─────────────────────────────────────┤
│ ✗ 连接失败                           │
│ 错误: Command not found: npx         │
│                                     │
│ 建议检查:                            │
│   - 命令路径是否正确                  │
│   - 命令是否已安装                    │
│   - 权限是否足够                      │
│                                     │
├─────────────────────────────────────┤
│ Enter 关闭  r 重试                   │
└─────────────────────────────────────┘
```

#### 常见错误提示

| 错误信息                    | 可能原因       | 解决方案         |
| --------------------------- | -------------- | ---------------- |
| `Command not found: npx`    | npx 未安装     | 安装 Node.js     |
| `EACCES: permission denied` | 权限不足       | 添加执行权限     |
| `ENOTFOUND`                 | 网络错误 (SSE) | 检查 URL 和网络  |
| `Timeout`                   | 连接超时       | 检查服务是否运行 |
| `Invalid JSON`              | 配置格式错误   | 检查 JSON 语法   |

#### 测试超时

```typescript
const TEST_TIMEOUT = 10000; // 10 秒超时

async function testMcpConnectionWithTimeout(...): Promise<Result> {
    return Promise.race([
        testMcpConnection(serverName, config),
        new Promise<Result>((_, reject) =>
            setTimeout(() => reject(new Error('连接超时 (10s)')), TEST_TIMEOUT)
        ),
    ]);
}
```

## 设计参考

- **ProviderPanel**: 列表+表单双视图结构
- **ModelPanel**: 配置管理参考
- **KnowledgePanel**: 列表视图交互
- **MultiLineTextInput**: 多行文本输入（ink-pro）

## 待确认问题

1. ~~连接测试的具体实现方式（是否需要实际连接还是仅验证配置格式）~~ → 已确定使用 `MultiServerMCPClient` 实际连接测试
2. ~~JSON 编辑器的默认格式化选项（2 空格 vs 4 空格）~~ → 已确定为 2 空格
3. ~~是否需要导入/导出配置功能~~ → 不需要
4. ~~是否需要配置模板/预设~~ → 已在附录中提供常用模板

## 开发步骤

1. 创建 `McpPanel.tsx` 主面板
2. 创建 `McpForm.tsx` 表单组件
3. 创建 `McpJsonEditor.tsx` JSON 编辑器
4. 实现 TanStack Query hooks
5. 实现配置 CRUD 操作
6. 实现连接测试功能
7. 添加验证和错误处理
8. 测试和优化

## 后续扩展

- 服务器状态监控（连接状态、工具数量等）
- 工具列表查看
- 配置导入/导出
- 配置预设和模板
- 批量操作

## 附录: 配置模板

### 常用 MCP 服务器模板

#### Filesystem Server

```json
{
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"]
}
```

#### Tavily Search Server

```json
{
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-tavily"],
    "env": {
        "TAVILY_API_KEY": "your-api-key-here"
    }
}
```

#### Brave Search Server

```json
{
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
    "env": {
        "BRAVE_API_KEY": "your-api-key-here"
    }
}
```

#### GitHub Server

```json
{
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
        "GITHUB_TOKEN": "your-github-token"
    }
}
```

#### SQLite Server

```json
{
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-sqlite"],
    "env": {
        "DATABASE_PATH": "/path/to/database.db"
    }
}
```

#### Puppeteer Server

```json
{
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
}
```

#### Custom SSE Server

```json
{
    "url": "http://localhost:3000/sse",
    "headers": {
        "Authorization": "Bearer your-token",
        "X-Custom-Header": "value"
    }
}
```

## 参考文档

- [MCP Protocol Spec](https://modelcontextprotocol.io/docs)
- [LangChain MCP Adapters](https://github.com/langchain-ai/langchain-mcp-adapters)
- [MCP Server SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- 项目现有实现: `/mcp` 命令 (`zen-code/src/chat/commands/extended.ts`)
- 项目现有实现: `MCPMiddleware` (`packages/agent/src/middlewares/mcp.ts`)
