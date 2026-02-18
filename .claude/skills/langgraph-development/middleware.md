---
name: middleware
description:
    Guide for creating and using middleware with LangChain agents. Covers request/response interception, prompt
    enhancement, Anthropic prompt caching, and human-in-the-loop patterns.
---

# Middleware Guide

Middleware intercept and modify agent requests and responses, enabling cross-cutting concerns like logging, prompt
enhancement, caching, and human approval.

## Creating Middleware

### Available Hooks

| Hook            | Type                         | Description                     |
| --------------- | ---------------------------- | ------------------------------- |
| `name`          | `string`                     | Identifier                      |
| `stateSchema`   | `ZodType`                    | Persistent state                |
| `contextSchema` | `ZodType`                    | Runtime context (not persisted) |
| `tools`         | `Tool[]`                     | Additional tools                |
| `beforeAgent`   | `(state, runtime) => state`  | Once at start                   |
| `beforeModel`   | `(state, runtime) => state`  | Before each model call          |
| `wrapModelCall` | `(req, handler) => response` | Wrap model execution            |
| `afterModel`    | `(state, runtime) => state`  | After each model call           |
| `wrapToolCall`  | `(req, handler) => result`   | Wrap tool execution             |
| `afterAgent`    | `(state, runtime) => state`  | Once at end                     |

### Basic Example

```typescript
import { createMiddleware } from 'langchain';
import { z } from 'zod';

const middleware = createMiddleware({
    name: 'Logging',
    stateSchema: z.object({ count: z.number().default(0) }),
    contextSchema: z.object({ userId: z.string() }),

    beforeAgent: (state) => ({ count: (state.count || 0) + 1 }),

    wrapModelCall: async (req, handler) => {
        console.log('User:', req.runtime.context.userId);
        return handler(req);
    },

    wrapToolCall: async (req, handler) => {
        console.log('Tool:', req.tool.name);
        return handler(req);
    },

    afterAgent: (state) => console.log('Total:', state.count),
});
```

## Built-in Middlewares

For production-ready middleware implementations, see
**[standard-agent-middlewares.md](./standard-agent-middlewares.md)**.

The `@langgraph-js/standard-agent` package provides:

- **MCP Middleware** - Model Context Protocol integration
- **Anthropic Prompt Caching** - Cost optimization for Claude models
- **AgentsMd Middleware** - Project documentation injection
- **Skills Middleware** - Progressive skills disclosure
- **SubAgents Middleware** - Task delegation to specialized agents
- **Human-in-the-Loop** - Interrupt-based approval workflow

### Human-in-the-Loop

For interrupt-based approval, see **[standard-agent-middlewares.md](./standard-agent-middlewares.md)**.

```typescript
import { humanInTheLoopMiddleware } from '@langgraph-js/standard-agent';

const interruptMiddleware = humanInTheLoopMiddleware({
    interruptOn: {
        terminal: {
            allowedDecisions: ['approve', 'reject', 'edit'],
        },
    },
});

const agent = createAgent({
    name: 'MyAgent',
    model,
    systemPrompt: 'You are a helpful assistant',
    tools: [myTool],
    stateSchema: MyState,
    middleware: [interruptMiddleware],
});
```

## Runtime Context

### Using Context

```typescript
import { z } from 'zod';

const contextAwareMiddleware = createMiddleware({
    name: 'ContextAware',
    contextSchema: z.object({
        userId: z.string(),
        sessionId: z.string(),
        environment: z.enum(['dev', 'prod']).default('dev'),
    }),

    wrapModelCall: (request, handler) => {
        const { userId, sessionId, environment } = request.runtime.context;

        console.log(`User ${userId} in ${environment} environment`);

        return handler(request);
    },
});

const agent = createAgent({
    name: 'MyAgent',
    model,
    tools: [myTool],
    stateSchema: MyState,
    middleware: [contextAwareMiddleware],
    contextSchema: z.object({
        userId: z.string(),
        sessionId: z.string(),
        environment: z.enum(['dev', 'prod']).default('dev'),
    }),
});

// Usage
await agent.invoke(
    { messages: [new HumanMessage('Hello')] },
    {
        configurable: {
            runtime_context: {
                userId: '123',
                sessionId: 'abc',
                environment: 'prod',
            },
        },
    },
);
```

### Context for Middleware-Specific Settings

```typescript
const cachingMiddleware = createMiddleware({
    name: 'Caching',
    contextSchema: z.object({
        enableCaching: z.boolean().default(true),
        ttl: z.enum(['5m', '1h']).default('5m'),
    }),

    wrapModelCall: (request, handler) => {
        const { enableCaching, ttl } = request.runtime.context;

        if (!enableCaching) {
            return handler(request);
        }

        // Apply caching with specific TTL
        // Note: For production prompt caching, see standard-agent-middlewares.md
        return applyCaching(handler(request), ttl);
    },
});
```

## Installation

```bash
# Core middleware support
npm install langchain @langchain/core zod

# For production middlewares (HITL, MCP, Caching, etc.)
npm install @langgraph-js/standard-agent
```
