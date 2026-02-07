# Standard Agent

基于内存的轻量级代理配置和执行系统。

## 核心概念

-   **Agent**: 代理配置，包含名称、描述、系统提示、工具和中间件
-   **ToolRegistry**: 工具注册表，管理工具的 Schema 和实现
-   **MiddlewareRegistry**: 中间件注册表，管理中间件的 Schema 和实现
-   **AgentRepository**: 简化的 CRUD 接口，直接返回类型化数据
-   **AgentValidator**: Agent 依赖验证器
-   **AgentSerializer**: JSON 导入导出工具

## 基本使用

### 创建 Agent

```typescript
import { StandardAgent } from './agent.js';

const agent = new StandardAgent({
    id: 'agent-1',
    name: 'Code Assistant',
    description: 'Helps with coding tasks',
    system_prompt: 'prompt-1',
    model: 'model-1',
    tools: {
        'tools/read_file': true,
        'tools/write_file': { encoding: 'utf-8' },
    },
    middleware: {
        'middleware/logger': true,
    },
});
```

### 使用 AgentPackage

```typescript
import { AgentPackage } from './package.js';
import { MemoryStorage } from './storage/memory.js';

const storage = new MemoryStorage();

// 创建 package 并添加资源
const pkg = new AgentPackage(storage);

// 所有操作都是异步的
await pkg.addModel({ 
    id: 'model-1', 
    model_name: 'gpt-4', 
    model_provider: 'openai',
    stream_usage: true,
    enable_thinking: false,
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
});

await pkg.addPrompt({ id: 'prompt-1', name: 'default', content: 'You are helpful.' });
await pkg.addAgent({ 
    id: 'agent-1', 
    name: 'Assistant', 
    description: 'Helpful', 
    system_prompt: 'prompt-1', 
    model: 'model-1', 
    tools: {}, 
    middleware: {} 
});

// 获取资源（异步）
const agent = await pkg.getAgent('agent-1');
const allAgents = await pkg.listAgents();

// 验证 Agent 依赖
const validation = await pkg.validateAgent('agent-1');
if (!validation.valid) {
    console.error('Validation errors:', validation.errors);
}
```

### 注册和执行工具

```typescript
import { ToolRegistry } from './registry.js';
import { z } from 'zod';

const toolRegistry = new ToolRegistry();

// 注册实现
toolRegistry.registerImplementation({
    id: 'tools/read_file',
    name: 'Read File',
    description: 'Read file contents',
    paramsSchema: z.object({ path: z.string() }),
    execute: async ({ path }) => {
        return `Contents of ${path}`;
    },
});

// 执行工具
const result = await toolRegistry.execute('tools/read_file', { path: './file.txt' });
```

### 注册和执行中间件

```typescript
import { MiddlewareRegistry } from './registry.js';

const middlewareRegistry = new MiddlewareRegistry();

// 注册实现
middlewareRegistry.registerImplementation({
    id: 'middleware/logger',
    name: 'Logger',
    description: 'Log requests',
    execute: async (context) => {
        console.log('Request:', context);
        return context;
    },
});

// 执行中间件
await middlewareRegistry.execute('middleware/logger', { action: 'read' });
```

### JSON 导入导出

```typescript
import { AgentPackage } from './package.js';
import { MemoryStorage } from './storage/memory.js';

const storage = new MemoryStorage();

// 导出到 JSON
const pkg = new AgentPackage(storage);
const json = await pkg.toJSON();
console.log(json);

// 从 JSON 导入（自动创建 AgentPackage）
const data = { /* JSON 数据 */ };
const pkg2 = await AgentPackage.loadFromJSON(storage, data);
```

## 数据结构

### Agent 配置

```typescript
interface AgentConfig {
    id: string;
    name: string;
    description: string;
    system_prompt: string; // Prompt ID
    model: string; // Model ID
    tools: Record<string, boolean | any>;
    middleware: Record<string, boolean | any>;
}
```

## LangChain 兼容

直接使用与 `@langchain/core/tools/tool()` 完全一致的签名定义工具。

### 基本使用

```typescript
import { fromLangChainTool } from './langchain.js';
import { z } from 'zod';
import fs from 'fs';

// 与 LangChain 的 tool() 签名完全一致
const readFileTool = fromLangChainTool(
    async ({ path }) => {
        return fs.readFileSync(path, 'utf-8');
    },
    {
        name: 'readFile',
        description: 'Read file contents',
        schema: z.object({ path: z.string() }),
    },
);

toolRegistry.registerImplementation(readFileTool);
```

### Bash Tool 示例

```typescript
import { fromLangChainTool } from './langchain.js';
import { z } from 'zod';

const bashTool = fromLangChainTool(
    async ({ command, timeout, run_in_background, kill_process_id, get_output_id, filter }) => {
        // Implementation...
        return 'output';
    },
    {
        name: 'terminal',
        description: 'Executes commands in a persistent shell session (Bash on Linux/macOS, CMD on Windows)',
        schema: z.object({
            description: z.string().describe('what you want to do'),
            command: z.string().optional().describe('The command to execute'),
        }),
    },
);

toolRegistry.registerImplementation(bashTool);
```

## 类型安全

所有数据结构使用 Zod Schema 验证，确保类型安全。

```typescript
import { AgentSchema, ToolSchema, PromptSchema } from './index.js';

const valid = AgentSchema.parse(data); // 验证并返回类型化数据
```

## 存储层

存储层提供持久化能力。当前提供内存存储实现，可通过实现 `IStorage` 接口扩展其他后端。

### 使用内存存储

```typescript
import { MemoryStorage } from './storage/memory.js';

const storage = new MemoryStorage();

// 插入资源
await storage.insertModel({
    id: 'model-1',
    model_name: 'gpt-4',
    model_provider: 'openai',
    stream_usage: true,
    enable_thinking: false,
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
});

await storage.insertPrompt({
    id: 'prompt-1',
    name: 'default',
    content: 'You are a helpful assistant.'
});

await storage.insertAgent({
    id: 'agent-1',
    name: 'Assistant',
    description: 'Helpful assistant',
    system_prompt: 'prompt-1',
    model: 'model-1',
    tools: {},
    middleware: {}
});

// 查询资源
const agent = await storage.getAgent('agent-1');
const allAgents = await storage.getAllAgents();

// 事务支持
await storage.transaction(async () => {
    await storage.insertModel({ ... });
    await storage.insertPrompt({ ... });
    // 如果出错，自动回滚
});
```

### 加载到 AgentPackage

`AgentPackage` 建立在 Storage 之上，协调 Repository、Validator、Serializer 和 Registry。

```typescript
import { AgentPackage } from './package.js';
import { MemoryStorage } from './storage/memory.js';

const storage = new MemoryStorage();

// 方式 1：直接包装存储（推荐）
const pkg = new AgentPackage(storage);

// 方式 2：工厂方法（自动注册运行时 schemas）
const pkg = await AgentPackage.fromStorage(storage);

// 使用 pkg（所有操作都是异步的）
const agent = await pkg.getAgent('agent-1');
const allAgents = await pkg.listAgents();

// 验证
const validation = await pkg.validateAgent('agent-1');

// 导出
const json = await pkg.toJSON();
```

**关键设计**：
- `AgentPackage` 协调多个子系统：
  - **AgentRepository**: CRUD 操作
  - **AgentValidator**: 依赖验证
  - **AgentSerializer**: JSON 导入导出
  - **ToolRegistry/MiddlewareRegistry**: 运行时工具发现（不持久化）
- 所有 CRUD 操作委托给 Repository
- 存储层只负责持久化，Registry 负责运行时实现

### 自定义存储

实现 `IStorage` 接口即可支持自定义存储后端：

```typescript
import { BaseStorage } from './storage/abstract.js';

class CustomStorage extends BaseStorage {
    async insertModel(data) {
        /* 实现 */
    }
    async getModel(id) {
        /* 实现 */
    }
    // ... 实现其他方法
}

const storage = new CustomStorage();
```

## 架构设计

### 分层架构

```
AgentPackage (协调层)
    ├── AgentRepository (CRUD 层)
    ├── AgentValidator (验证层)
    ├── AgentSerializer (序列化层)
    ├── ToolRegistry (运行时工具注册)
    └── MiddlewareRegistry (运行时中间件注册)
          ↓
    IStorage (持久化层接口)
          ↓
    MemoryStorage (内存实现)
```

### 职责分离

- **Storage**: 只负责数据持久化（Schema 引用关系）
- **Registry**: 只负责运行时实现（execute 函数）
- **Repository**: 简化的 CRUD 接口，返回 Schema 类型
- **Validator**: Agent 依赖完整性检查
- **Serializer**: JSON 导入导出
- **Package**: 协调上述所有组件

### 设计理念

1. **Schema 与实现分离**: Storage 存储配置，Registry 管理实现
2. **避免贫血模型**: 删除 Entity 层，直接使用 Schema 类型
3. **单一职责**: 每个类只负责一件事
4. **类型安全**: Zod Schema 验证所有数据流

## 测试

项目包含完整的单元测试覆盖：

```bash
# 运行所有测试
npx vitest run --config vitest.standard-agent.config.ts

# 运行特定测试文件
npx vitest run src/standard-agent/__tests__/package.test.ts

# 查看测试覆盖率
npx vitest run --coverage --config vitest.standard-agent.config.ts
```

**测试文件：**
- `memory-storage.test.ts` - MemoryStorage 完整测试（29 个测试）
- `repository.test.ts` - AgentRepository CRUD 测试（22 个测试）
- `validator.test.ts` - AgentValidator 验证逻辑测试（8 个测试）
- `serializer.test.ts` - AgentSerializer 序列化测试（12 个测试）
- `package.test.ts` - AgentPackage 集成测试（21 个测试）

**覆盖的关键场景：**
- 资源的 CRUD 操作
- 外键约束和关联关系
- Agent 依赖验证
- JSON 序列化和反序列化
- 事务回滚机制
- 错误处理和边界情况
