# Standard Agent

基于 LangGraph 的配置驱动型代理系统，支持动态工具注册、中间件组合和多存储后端。

## 安装

```bash
npm install @langgraph-js/standard-agent
```

## 快速开始

### 创建你的第一个 Agent

```typescript
import { AgentPackage, StandardAgent } from '@langgraph-js/standard-agent';
import { MemoryStorage } from '@langgraph-js/standard-agent/storage';

// 1. 初始化存储和包
const storage = new MemoryStorage();
const pkg = new AgentPackage(storage);

// 2. 配置模型
await pkg.addModel({
    id: 'gpt-4',
    model_name: 'gpt-4-turbo',
    model_provider: 'openai',
    stream_usage: true,
    enable_thinking: false,
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
});

// 3. 配置提示词
await pkg.addPrompt({
    id: 'system',
    name: 'default',
    content: 'You are a helpful coding assistant.',
});

// 4. 注册工具
await pkg.addTool({
    id: 'tools/read_file',
    name: 'read_file',
    description: 'Read file contents from disk',
});

pkg.tools.registerImplementation({
    id: 'tools/read_file',
    name: 'read_file',
    description: 'Read file contents from disk',
    paramsSchema: z.object({ path: z.string() }),
    execute: async ({ path }) => {
        return fs.readFileSync(path, 'utf-8');
    },
});

// 5. 创建 Agent
await pkg.addAgent({
    id: 'assistant',
    name: 'Code Assistant',
    description: 'Helps with coding tasks',
    system_prompt: 'system',
    model: 'gpt-4',
    tools: { 'tools/read_file': true },
    middleware: {},
});

// 6. 使用 Agent
const agent = await pkg.getAgent('assistant');
console.log(agent.name); // 'Code Assistant'
console.log(agent.tools); // { 'tools/read_file': { enabled: true } }
```

### 创建 LangChain Agent

```typescript
import { createStandardAgentV2 } from '@langgraph-js/standard-agent/factory';

// 从 AgentPackage 创建可执行的 LangChain Agent
const langchainAgent = await createStandardAgentV2(
    'assistant',
    pkg,
    state, // Your state instance
    runtime, // Runtime context
);

// 调用 Agent
const result = await langchainAgent.invoke({
    messages: [new HumanMessage('Read the package.json file')],
});
```

## 核心概念

### AgentPackage

协调所有组件的中心控制器：

```
AgentPackage (协调层)
    ├── AgentRepository (CRUD 操作)
    ├── AgentValidator (依赖验证)
    ├── AgentSerializer (JSON 导入导出)
    ├── ToolRegistry (运行时工具注册)
    └── MiddlewareRegistry (运行时中间件注册)
```

**职责分离：**

- **Storage**: 数据持久化
- **Registry**: 运行时实现（execute 函数）
- **Package**: 协调所有组件

### StandardAgent

Agent 配置的包装类，提供标准化 API：

```typescript
const agent = await pkg.getAgent('assistant');

// 基本属性
agent.id; // 'assistant'
agent.name; // 'Code Assistant'
agent.description; // 'Helps with coding tasks'
agent.systemPromptId; // 'system'
agent.modelId; // 'gpt-4'

// 工具配置（标准化格式）
agent.tools;
// {
//   'tools/read_file': { enabled: true },
//   'tools/write_file': { enabled: true, customParams: { encoding: 'utf-8' } }
// }

// 便捷方法
agent.getToolConfig('tools/read_file'); // { enabled: true }
agent.getMiddlewareConfig('middleware/log'); // { enabled: true }
agent.toJSON(); // 导出原始格式
```

### 工具系统

**Schema 与实现分离：**

```typescript
// 1. 注册 Schema（持久化）
await pkg.addTool({
    id: 'tools/bash',
    name: 'terminal',
    description: 'Execute bash commands',
});

// 2. 注册实现（运行时）
pkg.tools.registerImplementation({
    id: 'tools/bash',
    name: 'terminal',
    description: 'Execute bash commands',
    paramsSchema: z.object({
        command: z.string(),
        timeout: z.number().optional(),
    }),
    execute: async ({ command, timeout }) => {
        // 实现逻辑
        return 'output';
    },
});
```

**LangChain 兼容：**

```typescript
import { fromLangChainTool } from '@langgraph-js/standard-agent/langchain';

const tool = fromLangChainTool(async ({ path }) => fs.readFileSync(path, 'utf-8'), {
    name: 'readFile',
    description: 'Read file contents',
    schema: z.object({ path: z.string() }),
});

pkg.tools.registerImplementation(tool);
```

### 中间件系统

```typescript
// 注册中间件 Schema
await pkg.addMiddleware({
    id: 'middleware/logger',
    name: 'Logger',
    description: 'Log all requests',
});

// 注册实现
pkg.middlewares.registerImplementation({
    id: 'middleware/logger',
    name: 'Logger',
    description: 'Log all requests',
    execute: async (context) => {
        console.log('Request:', context);
        return context;
    },
});

// 在 Agent 中使用
await pkg.addAgent({
    id: 'logged-agent',
    // ...
    middleware: {
        'middleware/logger': true,
    },
});
```

### 存储层

**内存存储（默认）：**

```typescript
import { MemoryStorage } from '@langgraph-js/standard-agent/storage';

const storage = new MemoryStorage();
const pkg = new AgentPackage(storage);
```

**事务支持：**

```typescript
await storage.transaction(async () => {
    await pkg.addModel({ ... });
    await pkg.addPrompt({ ... });
    // 出错自动回滚
});
```

**自定义存储：**

```typescript
import { BaseStorage } from '@langgraph-js/standard-agent/storage';

class DatabaseStorage extends BaseStorage {
    async insertModel(data) {
        /* 实现 */
    }
    async getModel(id) {
        /* 实现 */
    }
    // ... 实现其他方法
}
```

## 完整示例

### 带 LangGraph 的服务器

```typescript
import { registerGraph } from '@langgraph-js/pure-graph';
import { StateGraph, START } from '@langchain/langgraph';
import { AgentPackage } from '@langgraph-js/standard-agent';
import { createStandardAgentV2 } from '@langgraph-js/standard-agent/factory';

// 1. 配置 AgentPackage
const storage = new MemoryStorage();
const pkg = await setupAgentPackage(storage);

// 2. 创建 LangChain Agent
const agent = await createStandardAgentV2('assistant', pkg, state, runtime);

// 3. 构建 Graph
const graph = new StateGraph(MyState)
    .addNode('agent', async (state, runtime) => {
        return await agent.invoke(state, {
            configurable: runtime.configurable,
        });
    })
    .addEdge(START, 'agent')
    .compile();

// 4. 注册并启动服务器
registerGraph('assistant', graph);
```

### 多 Agent 系统

```typescript
// 创建专门的 Agent
await pkg.addAgent({
    id: 'coder',
    name: 'Coder',
    system_prompt: 'coder-prompt',
    model: 'gpt-4',
    tools: {
        'tools/read_file': true,
        'tools/write_file': true,
        'tools/terminal': true,
    },
    middleware: {
        'middleware/logger': true,
    },
});

await pkg.addAgent({
    id: 'reviewer',
    name: 'Reviewer',
    system_prompt: 'reviewer-prompt',
    model: 'claude-3-5-sonnet',
    tools: {
        'tools/read_file': true,
    },
    middleware: {},
});

// 动态选择 Agent
const agents = await pkg.listAgents();
const coderAgent = agents.find((a) => a.id === 'coder');
```

## API 参考

### AgentPackage

```typescript
class AgentPackage {
    // 属性
    readonly storage: IStorage;
    readonly tools: ToolRegistry;
    readonly middlewares: MiddlewareRegistry;

    // CRUD 代理
    getAgent(id: string): Promise<StandardAgent>;
    listAgents(): Promise<StandardAgent[]>;
    addAgent(data: AgentSchema): Promise<void>;

    // 验证
    validateAgent(id: string): Promise<ValidationResult>;

    // 序列化
    toJSON(): Promise<AgentPackageJSON>;

    // 工厂方法
    static fromStorage(storage: IStorage): Promise<AgentPackage>;
    static loadFromJSON(storage: IStorage, data: JSON): Promise<AgentPackage>;
}
```

### StandardAgent

```typescript
class StandardAgent {
    // 属性
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly systemPromptId: string;
    readonly modelId: string;
    readonly tools: Record<string, ToolConfig>;
    readonly middleware: Record<string, MiddlewareConfig>;

    // 方法
    getToolConfig(toolId: string): ToolConfig | undefined;
    getMiddlewareConfig(midId: string): MiddlewareConfig | undefined;
    toJSON(): AgentSchema;
}
```

## 测试

```bash
# 运行所有测试
npx vitest run --config vitest.standard-agent.config.ts

# 运行特定测试
npx vitest run src/standard-agent/__tests__/package.test.ts

# 查看覆盖率
npx vitest run --coverage --config vitest.standard-agent.config.ts
```

## 最佳实践

1. **Schema 与实现分离**：Storage 存配置，Registry 管实现
2. **使用 StandardAgent**：通过 `pkg.getAgent()` 获取，不直接操作数据
3. **验证依赖**：创建前调用 `validateAgent()` 确保完整性
4. **事务保护**：批量操作使用 `storage.transaction()`
5. **类型安全**：所有数据使用 Zod Schema 验证

## 相关资源

- [LangGraph Development Guide](../../.claude/skills/langgraph-development/SKILL.md) - Agent 开发完整指南
- [LangChain TypeScript](https://js.langchain.com/) - LangChain 官方文档
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/) - LangGraph 官方文档
