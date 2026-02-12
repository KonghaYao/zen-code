# Standard Agent

基于内存的轻量级代理配置和执行系统。

## 核心概念

- **Agent**: 代理配置，包含名称、描述、系统提示、工具和中间件
- **ToolRegistry**: 工具注册表，管理工具的 Schema 和实现（支持运行时发现）
- **MiddlewareRegistry**: 中间件注册表，管理中间件的 Schema 和实现（支持运行时发现）
- **AgentRepository**: 简化的 CRUD 接口，返回 `StandardAgent` 实例
- **AgentValidator**: Agent 依赖验证器
- **AgentSerializer**: JSON 导入导出工具
- **AgentPackage**: 协调层，包装 Storage 并提供统一的 API
- **createStandardAgentV2**: Factory 函数，从 AgentPackage 创建 LangChain Agent
- **StandardAgent**: Agent 配置的包装类，提供标准化属性访问

## 基本使用

### 使用 StandardAgent 类

`StandardAgent` 是 Agent 配置的包装类，提供标准化的属性访问。

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

// 访问属性
console.log(agent.id); // 'agent-1'
console.log(agent.name); // 'Code Assistant'
console.log(agent.systemPromptId); // 'prompt-1'
console.log(agent.modelId); // 'model-1'

// 获取工具配置（标准化格式）
console.log(agent.tools);
// {
//   'tools/read_file': { enabled: true },
//   'tools/write_file': { enabled: true, customParams: { encoding: 'utf-8' } }
// }

// 获取中间件配置
console.log(agent.middleware);
// {
//   'middleware/logger': { enabled: true }
// }

// 获取单个配置
const toolConfig = agent.getToolConfig('tools/read_file');
// { enabled: true }

const middlewareConfig = agent.getMiddlewareConfig('middleware/logger');
// { enabled: true }

// 导出为 JSON
const json = agent.toJSON();
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
    presence_penalty: 0,
});

await pkg.addPrompt({ id: 'prompt-1', name: 'default', content: 'You are helpful.' });
await pkg.addAgent({
    id: 'agent-1',
    name: 'Assistant',
    description: 'Helpful',
    system_prompt: 'prompt-1',
    model: 'model-1',
    tools: {},
    middleware: {},
});

// 获取资源（异步）- 返回 StandardAgent 实例
const agent = await pkg.getAgent('agent-1');
console.log(agent instanceof StandardAgent); // true
console.log(agent.name); // 'Assistant'

const allAgents = await pkg.listAgents();
allAgents.forEach((agent) => {
    console.log(agent.id, agent.name); // 每个 agent 都是 StandardAgent 实例
});

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
const data = {
    /* JSON 数据 */
};
const pkg2 = await AgentPackage.loadFromJSON(storage, data);
```

## 数据结构

### Agent 配置 (Schema)

```typescript
{
    id: string;
    name: string;
    description: string;
    system_prompt: string; // Prompt ID
    model: string; // Model ID
    tools: Record<string, boolean | any>; // true 或自定义参数
    middleware: Record<string, boolean | any>;
}
```

### StandardAgent 标准化配置

```typescript
{
    id: string;
    name: string;
    description: string;
    systemPromptId: string;
    modelId: string;
    tools: Record<
        string,
        {
            enabled: boolean;
            customParams?: any;
        }
    >;
    middleware: Record<
        string,
        {
            enabled: boolean;
            customParams?: any;
        }
    >;
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
const agent = await pkg.getAgent('agent-1'); // 返回 StandardAgent 实例
const allAgents = await pkg.listAgents(); // 返回 StandardAgent[]

// 访问 StandardAgent 属性
console.log(agent.name);
console.log(agent.tools);
console.log(agent.getToolConfig('tool-id'));

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
- `getAgent()` 和 `listAgents()` 返回 `StandardAgent` 实例，提供标准化 API
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
    ├── AgentRepository (CRUD 层) → 返回 StandardAgent 实例
    ├── AgentValidator (验证层)
    ├── AgentSerializer (序列化层)
    ├── ToolRegistry (运行时工具注册)
    └── MiddlewareRegistry (运行时中间件注册)
          ↓
    IStorage (持久化层接口)
          ↓
    MemoryStorage (内存实现)
```

### StandardAgent 类设计

`StandardAgent` 是 Agent 配置的包装类，提供：

- **标准化属性访问**: `id`, `name`, `description`, `systemPromptId`, `modelId`
- **标准化配置**: `tools` 和 `middleware` getter 返回统一格式 `{ enabled, customParams }`
- **便捷方法**: `getToolConfig()` 和 `getMiddlewareConfig()` 获取单个配置
- **JSON 导出**: `toJSON()` 返回原始 Schema 格式

```typescript
// 原始格式（Schema）
{
    tools: { 'tool-1': true, 'tool-2': { encoding: 'utf-8' } }
}

// 标准化格式（StandardAgent）
{
    tools: {
        'tool-1': { enabled: true },
        'tool-2': { enabled: true, customParams: { encoding: 'utf-8' } }
    }
}
```

### 职责分离

- **Storage**: 只负责数据持久化（Schema 引用关系）
- **Registry**: 只负责运行时实现（execute 函数）
- **Repository**: 简化的 CRUD 接口，返回 `StandardAgent` 实例
- **StandardAgent**: Agent 配置包装，提供标准化 API
- **Validator**: Agent 依赖完整性检查
- **Serializer**: JSON 导入导出
- **Package**: 协调上述所有组件

### 设计理念

1. **Schema 与实现分离**: Storage 存储配置，Registry 管理实现
2. **包装而非贫血**: StandardAgent 提供丰富的 API，不只是数据容器
3. **标准化访问**: 通过 getter 和方法提供一致的配置访问方式
4. **单一职责**: 每个类只负责一件事
5. **类型安全**: Zod Schema 验证所有数据流

## 使用 Factory V2 创建 LangChain Agent

`createStandardAgentV2` 是将 AgentPackage 配置转换为可执行 LangChain Agent 的工厂函数。

### 基本用法

```typescript
import { createStandardAgentV2 } from '../subagents/factory-v2.js';
import { AgentPackage } from './package.js';
import { MemoryStorage } from './storage/memory.js';

const storage = new MemoryStorage();
const pkg = new AgentPackage(storage);

// 假设已配置好 agent-1
const agent = await createStandardAgentV2(
    'agent-1',
    pkg,
    state, // CodeStateType
    runtime, // Runtime
);
```

### Factory V2 工作流程

1. **加载配置**: 从 AgentPackage 获取 `StandardAgent` 实例
2. **验证**: 使用 AgentValidator 验证依赖完整性
3. **初始化模型**: 根据 ModelConfig 初始化 LangChain ChatModel
4. **构建工具链**:
    - 从 `StandardAgent.tools` 过滤工具
    - 根据状态添加任务工具（add_task 或 commit_task）
    - 注册到 ToolRegistry
5. **构建中间件链**:
    - 从 `StandardAgent.middleware` 加载中间件
    - 自动添加 CommandSystemMiddleware（始终启用）
    - 添加 HumanInTheLoopMiddleware（根据 YOLO_MODE）
    - 添加 AnthropicPromptCachingMiddleware（如果使用 Anthropic）
6. **加载系统提示**: 合并 Prompt 内容和环境信息
7. **创建 Agent**: 调用 LangChain 的 `createAgent` 函数

### 工具过滤逻辑

```typescript
// factory-v2.ts 中的工具过滤
const tools: DynamicStructuredTool[] = [];
const toolRegistry = pkg.tools;

for (const [toolId, params] of Object.entries(agentConfig.tools)) {
    const toolImpl = toolRegistry.getImplementation(toolId);
    if (!toolImpl) {
        console.warn(`Tool ${toolId} not found in registry`);
        continue;
    }
    if (!toolImpl.name || !params) {
        continue;
    }
    tools.push(
        tool(toolImpl.execute, {
            name: toolImpl.name,
            description: toolImpl.description,
            schema: toolImpl.paramsSchema?.toJSONSchema() || toolImpl.paramsSchema,
        }) as any as DynamicStructuredTool,
    );
}
```

**注意**: `agentConfig.tools` 来自 StandardAgent 的 getter，已经标准化为 `{ [toolId]: { enabled, customParams } }`
格式。

### 中间件处理

```typescript
// CommandSystem 始终启用，用于工具发现
const commandSystem = new CommandSystemMiddleware();
const commandTools = [read_tool, glob_tool];
const mcpTools = await MCPManager.getInstance().getAllTools();
commandTools.push(...(mcpTools as any));
commandSystem.registerTools(commandTools);
middleware.push(commandSystem);

// HumanInTheLoop 根据环境变量决定
if (process.env.YOLO_MODE !== 'true') {
    middleware.push(
        humanInTheLoopMiddleware({
            interruptOn: {
                ask_user_questions: {
                    allowedDecisions: ['approve', 'reject', 'edit'],
                },
                terminal: { allowedDecisions: ['approve', 'reject', 'edit'] },
            },
        }),
    );
}
```

### 获取可用 Agent ID

```typescript
import { getAvailableAgentIds } from '../subagents/factory-v2.js';

const agentIds = await getAvailableAgentIds(pkg);
console.log('Available agents:', agentIds);
```

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
