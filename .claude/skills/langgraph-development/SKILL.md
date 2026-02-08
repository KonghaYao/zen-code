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

```typescript
import { createDefaultAnnotation, createState } from '@langgraph-js/pro';
import { MessagesAnnotation, Annotation } from '@langchain/langgraph';
import { z } from 'zod';

// Create agent state with annotations
export const MyState = createState().build({
    my_field: createDefaultAnnotation(() => 'value'),
    counter: createDefaultAnnotation(() => 0),
    data: createDefaultAnnotation(() => ({ nested: true })),
});

// Use MessagesAnnotation as base for message handling
export const MessageState = createState(MessagesAnnotation).build({
    my_field: createDefaultAnnotation(() => 'value'),
});

// Custom reducer for merge behavior
export const ComplexState = createState().build({
    task_store: Annotation({
        reducer: (a, b: any) => ({ ...a, ...b }),
        default: () => ({}),
    }),
});

// Optional validation schema
export const MyStateSchema = z.object({
    my_field: z.string().optional(),
    counter: z.number().optional(),
});

export type MyStateType = typeof MyState.State;
```

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
    stateSchema: MyState,
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

**[middleware.md](./middleware.md)**

## Configuration-Driven Agents

For a powerful configuration-driven agent system with tool registry, middleware configuration, and storage backends,
see:

**[standard-agent.md](./standard-agent.md)**

The `@langgraph-js/standard-agent` package provides:

-   AgentPackage for centralized configuration
-   Tool and middleware registries
-   Pluggable storage backends (memory, file system)
-   Multi-agent management
-   Configuration validation

## Agent Invocation

### Basic Invocation

```typescript
const result = await agent.invoke({
    messages: [new HumanMessage('Hello, how are you?')],
});
```

### Streaming

```typescript
async function* streamAgent() {
    const stream = await agent.stream({
        messages: [{ role: 'user', content: 'Hello' }],
    });

    for await (const chunk of stream) {
        yield chunk;
    }
}

// Usage
for await (const chunk of streamAgent()) {
    console.log(chunk);
}
```

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
            stateSchema: MyState,
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
    stateSchema: MyState,
});

const reviewerAgent = createAgent({
    name: 'Reviewer',
    model,
    systemPrompt: 'You review code for bugs and best practices',
    tools: [readTool, analysisTool],
    stateSchema: MyState,
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
    stateSchema: MyState,
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

1. **Use createState().build()**: Create state with annotations
2. **createDefaultAnnotation**: Always use for default values
3. **Async Initialization**: Always await model initialization
4. **Error Handling**: Wrap agent calls in try/catch
5. **Tool Focus**: Keep tools single-purpose and well-named
6. **Testing**: Test agents and tools independently
7. **Streaming**: Support streaming for better UX
8. **Documentation**: Add JSDoc for complex functions
9. **Configuration**: Use AgentPackage for complex systems

## Common Issues

### Type errors with tools

```typescript
// Use type assertion
const tools = [myTool1 as any, myTool2 as any];
```

### Agent not responding

```typescript
// Check if tools are properly registered
console.log('Available tools:', tools.map(t => t.name));

// Try with simpler model
const debugModel = await initChatModel('gpt-4o-mini');
const debugAgent = createAgent({ ... });
```

### State not updating

```typescript
// Ensure state has proper annotations
const MyState = createState().build({
    my_field: createDefaultAnnotation(() => 'default'),
});

// Check state type matches
const agent = createAgent({
    stateSchema: MyState, // Not typeof MyState
});
```

## Installation

### Core Dependencies

```bash
npm install langchain @langchain/core @langchain/langgraph @langchain/openai @langchain/anthropic @langgraph-js/pro zod
```

### Development Dependencies

```bash
npm install --save-dev typescript vitest
```

## Resources

-   [LangChain TypeScript](https://js.langchain.com/)
-   [@langgraph-js](https://open-langgraph-server.agent-aura.top/docs/getting-started/overview)
-   [Middleware Guide](./middleware.md) - Comprehensive middleware patterns
-   [Standard Agent System](./standard-agent.md) - Configuration-driven agents
