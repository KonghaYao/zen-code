---
name: langgraph-development
description:
    Guide for building agents with LangChain/LangGraph in TypeScript. Covers createAgent, tools, and agent patterns. Use
    when creating agents, implementing tools, or setting up agent infrastructure.
---

# LangGraph Agent Development Guide

This guide covers building AI agents with LangChain/LangGraph, focusing on agent abstraction.

## Core Concepts

### State Management

使用 `StateSchema` 统一定义状态（替代旧的 `createState` + `Annotation` 双对象模式）：

```typescript
import { StateSchema, ReducedValue, MessagesValue } from '@langchain/langgraph';
import { z } from 'zod';

// 基本状态：简单字段直接用 Zod schema，无需额外 Annotation
export const MySchema = new StateSchema({
    messages: MessagesValue, // 预构建的 messages ReducedValue（含标准 reducer）
    my_field: z.string().default('value'),
    counter: z.number().default(0),
    data: z.object({ nested: z.boolean() }).default(() => ({ nested: true })),
});

// 自定义 reducer 字段（并发更新时合并而非覆盖）
export const ComplexSchema = new StateSchema({
    messages: MessagesValue,
    task_store: new ReducedValue(
        z.record(z.string(), z.any()).default(() => ({})),
        {
            reducer: (a: Record<string, any>, b: Record<string, any>) => ({ ...a, ...b }),
        },
    ),
    my_field: z.string().default('value'),
});

export type MyStateType = typeof MySchema.State;
```

**规则**：

- 普通字段（最后写入胜出）→ 直接用 Zod schema
- 需要合并/累积的字段 → 用 `new ReducedValue(schema, { reducer })`
- `messages` 字段 → 直接用预构建的 `MessagesValue`

## Agent Creation

### Basic Agent

```typescript
import { createAgent } from 'langchain';
import { tool } from '@langchain/core/tools';

const model = await initChatModel('gpt-4');

const agent = createAgent({
    name: 'MyAgent',
    model,
    systemPrompt: 'You are a helpful assistant',
    tools: [myTool1, myTool2],
    stateSchema: MySchema,
});
```

## Model Initialization

```typescript
import { ChatOpenAI } from '@langgraph-js/pro';
import { ChatAnthropic } from '@langchain/anthropic';

interface InitModelOptions {
    streamUsage?: boolean;
    enableThinking?: boolean;
}

export async function initChatModel(model: string, options: InitModelOptions = {}) {
    const { streamUsage = true, enableThinking = true } = options;

    if (model.includes('claude')) {
        return new ChatAnthropic({
            model,
            streamUsage,
            streaming: true,
            thinking: enableThinking
                ? {
                      budget_tokens: 1024,
                      type: 'enabled',
                  }
                : undefined,
        });
    } else {
        return new ChatOpenAI({
            model,
            streamUsage,
            modelKwargs: enableThinking
                ? {
                      thinking: { type: 'enabled' },
                  }
                : undefined,
        });
    }
}
```

## Tool Development

### Basic Tool

```typescript
import { tool } from 'langchain';
import { z } from 'zod';

export const myTool = tool(
    async ({ param1, param2 }) => {
        // Tool implementation
        return 'result';
    },
    {
        name: 'my_tool',
        description: 'Tool description',
        schema: z.object({
            param1: z.string(),
            param2: z.number().optional(),
        }),
    },
);
```

### Tool with Error Handling

```typescript
export const fetchDataTool = tool(
    async ({ url }) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            return { error: error.message };
        }
    },
    {
        name: 'fetch_data',
        description: 'Fetch data from URL',
        schema: z.object({
            url: z.string().url(),
        }),
    },
);
```

## Middleware

For comprehensive middleware patterns including request/response interception, prompt enhancement, Anthropic prompt
caching, and human-in-the-loop, see:

Never use LangChain middleware directly, use standard-agent middleware instead!

**[middleware.md](./middleware.md)**

## Agent Invocation

### Basic Invocation

```typescript
const result = await agent.invoke({
    messages: [new HumanMessage('Hello, how are you?')],
});
```

### Streaming

When using `@langgraph-js/pure-graph` with `registerGraph()`, the framework automatically exposes streaming endpoints
via the HTTP API (`/api/langgraph`). No additional streaming code is required—the Hono adapter handles SSE (Server-Sent
Events) for real-time responses.

### With Config

```typescript
const result = await agent.invoke(
    { messages: [new HumanMessage('Hello')] },
    {
        configurable: {
            runtime_context: {
                userId: '123',
            },
        },
    },
);
```

### With Recursion Limit

```typescript
const result = await agent.invoke({ messages: [new HumanMessage('Hello')] }, { recursionLimit: 100 });
```

## Complete Server Setup

### Full LangGraph Server with Hono

```typescript
import { registerGraph } from '@langgraph-js/pure-graph';
import LGApp from '@langgraph-js/pure-graph/dist/adapter/hono';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serve } from 'bun';

// 1. Create your graph
import { graph } from './graphBuilder.js';

// 2. Register the graph
registerGraph('code', graph);

// 3. Create Hono app
const app = new Hono();

// Add middleware
app.use(logger());

// 4. Mount LangGraph API routes
app.route('/api/langgraph', LGApp);

// 5. Start server
const port = 8123;
console.log(`🚀 Server running on http://127.0.0.1:${port}`);

serve({
    fetch: app.fetch,
    port,
});
```

### Graph Builder with StateGraph

```typescript
import { Runtime } from 'langchain';
import { MySchema, MyStateType } from './state.js';
import { START, StateGraph } from '@langchain/langgraph';
import { createAgent } from 'langchain';

// Create agent
const model = await initChatModel('claude-3-5-sonnet');
const agent = createAgent({
    name: 'MyAgent',
    model,
    systemPrompt: 'You are a helpful assistant',
    tools: [myTool1, myTool2],
    stateSchema: MySchema,
});

// Build graph
export function createMyGraph() {
    return new StateGraph(MySchema)
        .addNode('agent', async (state: MyStateType, runtime: Runtime) => {
            const response = await agent.invoke(state, {
                recursionLimit: 100,
                configurable: runtime.configurable,
            });
            return response;
        })
        .addEdge(START, 'agent')
        .compile();
}

export const graph = createMyGraph();
```

## Testing

### Testing Agents

```typescript
import { describe, it, expect } from 'vitest';
import { FakeListChatModel } from '@langchain/core/utils/testing';

describe('MyAgent', () => {
    it('should respond to messages', async () => {
        const fakeModel = new FakeListChatModel({
            responses: ['Hello! How can I help you?'],
        });

        const agent = createAgent({
            name: 'TestAgent',
            model: fakeModel,
            tools: [myTool],
            stateSchema: MySchema,
        });

        const result = await agent.invoke({ messages: [] });
        expect(result.messages.length).toBeGreaterThan(0);
    });
});
```

### Testing Tools

```typescript
describe('myTool', () => {
    it('should return correct result', async () => {
        const result = await myTool.invoke({
            param1: 'test',
            param2: 42,
        });
        expect(result).toBe('result');
    });
});
```

## Common Patterns

### Multi-Agent System

```typescript
// Create specialized agents
const coderAgent = createAgent({
    name: 'Coder',
    model,
    systemPrompt: 'You are an expert software engineer',
    tools: [searchTool, codeEditTool],
    stateSchema: MySchema,
});

const reviewerAgent = createAgent({
    name: 'Reviewer',
    model,
    systemPrompt: 'You review code for bugs and best practices',
    tools: [readTool, analysisTool],
    stateSchema: MySchema,
});

// Use based on task
const result = await coderAgent.invoke({
    messages: [new HumanMessage('Write code for X')],
});
```

### Tool Selection Based on State

```typescript
const tools = state.is_in_task ? [commitTaskTool] : [addTaskTool, searchTool, analysisTool];

const agent = createAgent({
    name: 'DynamicAgent',
    model,
    systemPrompt: 'You are a helpful assistant',
    tools,
    stateSchema: MySchema,
});
```

### Error Recovery

```typescript
const result = await agent
    .invoke(
        { messages: [new HumanMessage('Do something')] },
        {
            signal: AbortSignal.timeout(30000), // 30s timeout
        },
    )
    .catch((error) => {
        console.error('Agent failed:', error);
        return { messages: [new AIMessage('Sorry, something went wrong.')] };
    });
```

## File Organization

### Recommended Structure

```
src/
├── agents/
│   ├── index.ts          # Agent factory functions
│   ├── coder.ts          # Coding agent
│   └── reviewer.ts       # Review agent
├── tools/
│   ├── index.ts          # Export all tools
│   ├── search.ts
│   └── code.ts
├── middlewares/
│   ├── index.ts
│   ├── logging.ts
│   └── cache.ts
├── state.ts              # State definitions
└── models.ts             # Model initialization
```

## Best Practices

1. **使用 `StateSchema`**：单一对象同时承担类型定义和运行时行为，不再需要 Zod schema + Annotation 双对象
2. **普通字段用 Zod schema**：`z.string().default('...')` 即可，无需 `createDefaultAnnotation`
3. **并发更新字段用 `ReducedValue`**：fanout/并行节点写同一 key 时必须定义 reducer，否则报
   `INVALID_CONCURRENT_GRAPH_UPDATE`
4. **`messages` 直接用 `MessagesValue`**：预构建，无需手写 reducer
5. **Async Initialization**：始终 await 模型初始化
6. **Error Handling**：agent 调用包裹在 try/catch 中
7. **Tool Focus**：每个 tool 单一职责，命名清晰
8. **Testing**：agent 和 tool 独立测试
9. **Streaming**：支持流式输出以改善 UX
10. **Configuration**：复杂系统使用 AgentPackage

## Common Issues

### 并发更新报错 INVALID_CONCURRENT_GRAPH_UPDATE

fanout 或并行节点同时写入同一字段时，需要用 `ReducedValue` 定义合并逻辑：

```typescript
// 错误：并行节点都写 results，会报错
export const BadSchema = new StateSchema({
    results: z.array(z.string()).default(() => []),
});

// 正确：使用 ReducedValue 定义 reducer
export const GoodSchema = new StateSchema({
    results: new ReducedValue(
        z.array(z.string()).default(() => []),
        {
            reducer: (existing, update: string[]) => existing.concat(update),
        },
    ),
});
```

### Type errors with tools

```typescript
// Use type assertion
const tools = [myTool1 as any, myTool2 as any];
```

### State not updating

```typescript
// 确保 StateSchema 传入 createAgent 和 StateGraph 是同一个实例
export const MySchema = new StateSchema({ ... });

const agent = createAgent({ stateSchema: MySchema, ... });
const graph = new StateGraph(MySchema);
```

## Installation

### Core Dependencies

```bash
npm install langchain @langchain/core @langchain/langgraph @langchain/openai @langchain/anthropic zod
```

### Development Dependencies

```bash
npm install --save-dev typescript vitest
```

## Frontend Development

For building chat interfaces and UI components that connect to LangGraph backend, see:

**[frontend-sdk.md](./frontend-sdk.md)**

The `@langgraph-js/sdk` package provides:

- `ChatProvider` React component for wrapping your app
- `useChat()` hook for accessing chat state and mutations
- Message rendering components (human, AI, tool messages)
- Agent selection and dynamic switching
- Streaming support via Server-Sent Events

**When to use**: Building web UIs, chat interfaces, or dashboards for LangGraph agents.

## Configuration-Driven Agents (Optional)

For production systems requiring dynamic configuration, tool registries, and multi-agent management from storage, see:

**[standard-agent.md](./standard-agent.md)**

The `@langgraph-js/standard-agent` package provides an abstraction layer with:

- AgentPackage for centralized configuration
- Tool and middleware registries
- Pluggable storage backends (memory, file system, database)
- Multi-agent management from configuration

**When to use**: Database-driven configuration, multi-agent routing, dynamic tool/middleware loading. For simple agents,
use the patterns above directly.

## Resources

- [LangChain TypeScript](https://js.langchain.com/)
- [@langgraph-js](https://langchain-ai.github.io/langgraph/)
- [Middleware Guide](./middleware.md) - Comprehensive middleware patterns
- [Standard Agent System](./standard-agent.md) - Configuration-driven agents
- [Model Metadata](./model-metadata.md) - Model configuration and metadata management
