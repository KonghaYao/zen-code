# Zen Swarm Middlewares

Zen Swarm 提供了一套完整的中间件系统，用于扩展 agent 的功能。

## 可用中间件

### FilesystemMiddleware (@langgraph-js/agent-middlewares)

**文件系统操作中间件**

提供完整的文件和目录操作能力：

- `read_file` - 读取文件内容（支持分页读取）
- `write_file` - 写入文件内容
- `edit_file` - 字符串替换编辑
- `glob_files` - 文件名模式匹配
- `search_files_rg` - 使用 ripgrep 进行文本搜索
- `folder_operations` - 文件夹操作（创建、列表、存在检查）

所有路径基于 agent state 中的 `cwd` 解析相对路径。

```typescript
import { FilesystemMiddleware } from '@langgraph-js/agent-middlewares';

const fsMiddleware = new FilesystemMiddleware();
```

### TerminalMiddleware (@langgraph-js/agent-middlewares)

**终端命令执行中间件**

提供强大的命令行执行能力：

- 前台命令执行
- 后台进程管理
- 输出检索和过滤
- 跨平台支持（Bash/CMD）
- 进程控制（kill）

```typescript
import { TerminalMiddleware } from '@langgraph-js/agent-middlewares';

const terminalMiddleware = new TerminalMiddleware();
```

### MCPWithConfigMiddleware

**MCP 服务器连接中间件**

连接到 MCP (Model Context Protocol) 服务器，动态加载外部工具。

```typescript
import { MCPWithConfigMiddleware } from './middlewares/mcp.js';

const mcpMiddleware = new MCPWithConfigMiddleware();
```

### MemoriesMiddleware

**记忆系统中间件**

实现渐进式披露的记忆系统：

- 从 YAML frontmatter 加载记忆元数据
- 将记忆列表注入系统提示
- 支持用户级和项目级记忆

```typescript
import { MemoriesMiddleware } from './middlewares/memories.js';

const memoriesMiddleware = new MemoriesMiddleware({
    memoriesDir: '~/.claude/my-agent/memories',
    assistantId: 'my-agent',
    projectMemoriesDir: './.claude/memories',
});
```

### createSubAgentsMiddleware(pkg)

**子代理中间件**

支持任务委托给专门的子代理。

```typescript
import { createSubAgentsMiddleware } from './middlewares/subagents.js';

const subagentsMiddleware = await createSubAgentsMiddleware(agentPackage);
```

## 使用示例

### 基本使用

```typescript
import { createAgent } from '@langchain-js/standard-agent';
import { FilesystemMiddleware, TerminalMiddleware } from '@langgraph-js/agent-middlewares';

const agent = createAgent({
    model: yourModel,
    systemPrompt: 'You are a coding assistant.',
    tools: [], // 工具由中间件提供
    middleware: [new FilesystemMiddleware(), new TerminalMiddleware()],
});
```

## 架构原则

1. **工具层 vs 中间件层分离**
    - 工具层：运行时工具（交互、任务）→ `src/tools/`
    - 中间件层：跨领域功能（文件系统、终端、记忆、MCP、子代理）→ `src/middlewares/`

2. **共享中间件包**
    - `@langgraph-js/agent-middlewares` 提供通用中间件
    - FilesystemMiddleware 和 TerminalMiddleware 可在 agent 和 zen-swarm 中共享
    - zen-swarm 特定中间件（MCPWithConfigMiddleware, MemoriesMiddleware）保留在本地
