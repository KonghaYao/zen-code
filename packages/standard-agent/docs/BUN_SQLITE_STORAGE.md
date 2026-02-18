# BunSqliteStorage

基于 Bun 内置 SQLite 的持久化存储实现。

## 特性

- ✅ 基于 Bun 的 `bun:sqlite` 模块，无需额外依赖
- ✅ 持久化存储，数据保存到磁盘
- ✅ 完整的 CRUD 操作支持
- ✅ 外键约束保证数据完整性
- ✅ 事务支持
- ✅ 自动索引优化查询性能

## 快速开始

### 基本用法

```typescript
import { BunSqliteStorage } from '@langgraph-js/standard-agent';

// 使用默认路径 (~/.zen-code/agents.db)
const storage = BunSqliteStorage.default();
await storage.initialize();

// 使用自定义路径
const customStorage = new BunSqliteStorage('./custom.db');
await customStorage.initialize();
```

### 与 AgentPackage 集成

```typescript
import { AgentPackage, BunSqliteStorage } from '@langgraph-js/standard-agent';

const storage = BunSqliteStorage.default();
await storage.initialize();

const agentPackage = new AgentPackage(storage);
```

## API 参考

### 构造函数

```typescript
constructor(dbPath?: string)
```

- `dbPath`: 数据库文件路径。默认 `~/.zen-code/agents.db`，使用 `:memory:` 可创建内存数据库

### 静态方法

```typescript
static getDefaultPath(): string
```

获取默认数据库路径。

```typescript
static default(): BunSqliteStorage
```

创建使用默认路径的存储实例。

### 初始化

```typescript
async initialize(): Promise<void>
```

创建数据库表结构和索引。

### 生命周期

```typescript
async close(): Promise<void>
```

关闭数据库连接。

## 数据库结构

```sql
-- 模型表
CREATE TABLE models (
    id TEXT PRIMARY KEY,
    model_name TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    stream_usage INTEGER NOT NULL DEFAULT 0,
    enable_thinking INTEGER NOT NULL DEFAULT 0,
    temperature REAL NOT NULL DEFAULT 0.7,
    max_tokens INTEGER NOT NULL DEFAULT 4096,
    top_p REAL NOT NULL DEFAULT 1.0,
    frequency_penalty REAL NOT NULL DEFAULT 0.0,
    presence_penalty REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 提示词表
CREATE TABLE prompts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 工具表
CREATE TABLE tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    parameters TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 中间件表
CREATE TABLE middlewares (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    parameters TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Agent 表
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    system_prompt_id TEXT NOT NULL,
    model_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (system_prompt_id) REFERENCES prompts(id),
    FOREIGN KEY (model_id) REFERENCES models(id)
);

-- Agent-Tools 关联表
CREATE TABLE agent_tools (
    agent_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    custom_params TEXT,
    PRIMARY KEY (agent_id, tool_id),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
);

-- Agent-Middlewares 关联表
CREATE TABLE agent_middlewares (
    agent_id TEXT NOT NULL,
    middleware_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    custom_params TEXT,
    PRIMARY KEY (agent_id, middleware_id),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (middleware_id) REFERENCES middlewares(id) ON DELETE CASCADE
);
```

## 完整示例

```typescript
import {
    AgentPackage,
    BunSqliteStorage,
    ModelSchema,
    PromptSchema,
    ToolSchema,
    AgentSchema,
} from '@langgraph-js/standard-agent';

// 1. 创建存储
const storage = BunSqliteStorage.default();
await storage.initialize();

// 2. 创建模型
const model: ModelSchema = {
    id: 'model-1',
    model_name: 'gpt-4',
    model_provider: 'openai',
    stream_usage: true,
    enable_thinking: false,
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
};
await storage.insertModel(model);

// 3. 创建提示词
const prompt: PromptSchema = {
    id: 'prompt-1',
    name: 'system-prompt',
    content: 'You are a helpful assistant.',
    metadata: null,
};
await storage.insertPrompt(prompt);

// 4. 创建工具
const tool: ToolSchema = {
    id: 'tool-1',
    name: 'read-file',
    description: 'Read a file from the filesystem',
};
await storage.insertTool(tool);

// 5. 创建 Agent
const agent: AgentSchema = {
    id: 'agent-1',
    name: 'My Assistant',
    description: 'A helpful assistant',
    system_prompt: 'prompt-1',
    model: 'model-1',
    tools: {
        'tool-1': true,
    },
    middleware: {},
};
await storage.insertAgent(agent);

// 6. 查询 Agent
const retrievedAgent = await storage.getAgent('agent-1');
console.log(retrievedAgent);

// 7. 创建 AgentPackage
const agentPackage = new AgentPackage(storage);
```

## 内存数据库（用于测试）

```typescript
// 使用内存数据库进行测试
const storage = new BunSqliteStorage(':memory:');
await storage.initialize();

// 执行测试...
await storage.close();
```

## 性能考虑

- 持久化存储有 I/O 开销，适合生产环境
- 测试环境使用 `:memory:` 避免文件操作
- 已创建索引优化常用查询
- 事务操作保证数据一致性

## 迁移指南

从 `MemoryStorage` 迁移到 `BunSqliteStorage`：

```typescript
// 之前
import { AgentPackage, MemoryStorage } from '@langgraph-js/standard-agent';
const storage = new MemoryStorage();

// 之后
import { AgentPackage, BunSqliteStorage } from '@langgraph-js/standard-agent';
const storage = BunSqliteStorage.default();
await storage.initialize();
```

## 注意事项

1. **必须调用 `initialize()`**：首次使用前必须调用初始化方法
2. **路径权限**：确保有权限读写数据库文件
3. **并发安全**：SQLite 默认配置下支持并发读，但写操作是串行的
4. **关闭连接**：应用退出前调用 `close()` 关闭连接
