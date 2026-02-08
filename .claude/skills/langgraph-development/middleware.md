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

### Basic Middleware

```typescript
import { createMiddleware } from 'langchain';
import { AIMessage } from '@langchain/core/messages';

export const loggingMiddleware = createMiddleware({
    name: 'Logging',

    wrapModelCall: (request, handler) => {
        console.log('Request:', request);
        return handler(request);
    },
});
```

### Prompt Enhancement

```typescript
import { createMiddleware } from 'langchain';

export const promptEnhancer = createMiddleware({
    name: 'PromptEnhancer',

    wrapModelCall: (request, handler) => {
        const systemPromptAddon = `\n\nCurrent time: ${new Date().toISOString()}`;

        const modifiedSystemPrompt = request.systemPrompt
            ? request.systemPrompt + systemPromptAddon
            : systemPromptAddon;

        return handler({
            ...request,
            systemPrompt: modifiedSystemPrompt,
        });
    },
});
```

### Request/Response Interceptor

```typescript
import { createMiddleware } from 'langchain';

export const requestResponseInterceptor = createMiddleware({
    name: 'RequestResponseInterceptor',

    wrapModelCall: (request, handler) => {
        // Modify request
        const modifiedRequest = {
            ...request,
            systemPrompt: request.systemPrompt + '\n\nAdditional context.',
        };

        // Call next middleware
        const response = await handler(modifiedRequest);

        // Modify response
        return response;
    },
});
```

## Built-in Middleware

### Anthropic Prompt Caching

Optimizes API usage by caching prompt prefixes for Anthropic models.

```typescript
import { createMiddleware } from 'langchain';
import { z } from 'zod';
import { ContentBlock } from '@langchain/core/messages';

export const anthropicPromptCachingMiddleware = (
    options: {
        ttl?: '5m' | '1h';
        minMessages?: number;
    } = {},
) => {
    const { ttl = '5m', minMessages = 3 } = options;

    return createMiddleware({
        name: 'PromptCaching',
        contextSchema: z.object({
            enableCaching: z.boolean().default(true),
        }),

        wrapModelCall: (request, handler) => {
            const enableCaching = request.runtime.context.enableCaching ?? true;

            if (!enableCaching || request.messages.length < minMessages) {
                return handler(request);
            }

            const lastMessage = request.messages.at(-1);
            if (!lastMessage) {
                return handler(request);
            }

            const NewMessageConstructor = Object.getPrototypeOf(lastMessage).constructor;

            if (Array.isArray(lastMessage.content)) {
                const lastContent = lastMessage.content.at(-1);
                const newMessage = new NewMessageConstructor({
                    ...lastMessage,
                    content: [
                        ...lastMessage.content.slice(0, -1),
                        {
                            ...lastContent,
                            cache_control: {
                                type: 'ephemeral',
                                ttl,
                            },
                        } as ContentBlock,
                    ],
                });
                return handler({
                    ...request,
                    messages: [...request.messages.slice(0, -1), newMessage],
                });
            } else if (typeof lastMessage.content === 'string') {
                const newMessage = new NewMessageConstructor({
                    ...lastMessage,
                    content: [
                        {
                            type: 'text',
                            text: lastMessage.content,
                            cache_control: {
                                type: 'ephemeral',
                                ttl,
                            },
                        },
                    ],
                });
                return handler({
                    ...request,
                    messages: [...request.messages.slice(0, -1), newMessage],
                });
            }

            return handler(request);
        },
    });
};
```

#### Usage

```typescript
import { createAgent } from 'langchain';

const agent = createAgent({
    name: 'MyAgent',
    model,
    systemPrompt: 'You are a helpful assistant',
    tools: [myTool],
    stateSchema: MyState,
    middleware: [
        anthropicPromptCachingMiddleware({
            ttl: '1h',
            minMessages: 5,
        }),
    ],
});
```

### Human-in-the-Loop

Interrupt agent execution for human approval at specific points.

```typescript
import { humanInTheLoopMiddleware } from '@langgraph-js/auk';

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

## Advanced Patterns

### Context-Aware Middleware

```typescript
import { z } from 'zod';

export const rateLimitMiddleware = createMiddleware({
    name: 'RateLimit',
    contextSchema: z.object({
        userId: z.string(),
        requestCount: z.number().default(0),
    }),

    wrapModelCall: (request, handler) => {
        const { userId, requestCount } = request.runtime.context;

        // Check rate limit
        if (requestCount > 100) {
            throw new Error(`Rate limit exceeded for user ${userId}`);
        }

        return handler(request);
    },
});
```

### Conditional Execution

```typescript
export const conditionalLoggingMiddleware = createMiddleware({
    name: 'ConditionalLogging',
    contextSchema: z.object({
        enableLogging: z.boolean().default(false),
    }),

    wrapModelCall: (request, handler) => {
        const startTime = Date.now();

        return handler(request).then((response) => {
            if (request.runtime.context.enableLogging) {
                const duration = Date.now() - startTime;
                console.log(`Request completed in ${duration}ms`);
            }
            return response;
        });
    },
});
```

### Async Middleware

```typescript
export const asyncAuthMiddleware = createMiddleware({
    name: 'AsyncAuth',

    wrapModelCall: async (request, handler) => {
        // Perform async operation
        const isValid = await validateApiKey(request.runtime.config.apiKey);

        if (!isValid) {
            throw new Error('Invalid API key');
        }

        return handler(request);
    },
});
```

## Middleware Composition

### Chaining Middleware

```typescript
const agent = createAgent({
    name: 'MyAgent',
    model,
    systemPrompt: 'You are a helpful assistant',
    tools: [myTool],
    stateSchema: MyState,
    middleware: [
        loggingMiddleware, // First on request, last on response
        promptEnhancer, // Second on request, first on response
        anthropicPromptCachingMiddleware(), // Third on request, third on response
    ],
});
```

### Execution Order

Middleware executes in order for requests, and reverse order for responses:

```
Request → MW1 → MW2 → MW3 → Model → MW3 → MW2 → MW1 → Response
```

### Dynamic Middleware Selection

```typescript
function getMiddleware() {
    const middleware = [];

    // Always add logging
    middleware.push(loggingMiddleware);

    // Conditionally add caching
    if (process.env.ENABLE_CACHE === 'true') {
        middleware.push(anthropicPromptCachingMiddleware());
    }

    // Conditionally add human-in-the-loop
    if (process.env.YOLO_MODE !== 'true') {
        middleware.push(
            humanInTheLoopMiddleware({
                interruptOn: {
                    terminal: { allowedDecisions: ['approve', 'reject', 'edit'] },
                },
            }),
        );
    }

    return middleware;
}

const agent = createAgent({
    name: 'MyAgent',
    model,
    tools: [myTool],
    stateSchema: MyState,
    middleware: getMiddleware(),
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
        return applyCaching(handler(request), ttl);
    },
});
```

## Common Use Cases

### Logging and Monitoring

```typescript
export const monitoringMiddleware = createMiddleware({
    name: 'Monitoring',

    wrapModelCall: (request, handler) => {
        const startTime = Date.now();
        const requestId = generateId();

        console.log(`[${requestId}] Request started`);

        return handler(request)
            .then((response) => {
                const duration = Date.now() - startTime;
                console.log(`[${requestId}] Request completed in ${duration}ms`);
                return response;
            })
            .catch((error) => {
                const duration = Date.now() - startTime;
                console.error(`[${requestId}] Request failed after ${duration}ms:`, error);
                throw error;
            });
    },
});
```

### Rate Limiting

```typescript
const rateLimitStore = new Map<string, number[]>();

export const rateLimitMiddleware = createMiddleware({
    name: 'RateLimit',
    contextSchema: z.object({
        userId: z.string(),
        maxRequests: z.number().default(100),
        windowMs: z.number().default(60000), // 1 minute
    }),

    wrapModelCall: async (request, handler) => {
        const { userId, maxRequests, windowMs } = request.runtime.context;
        const now = Date.now();

        // Get existing timestamps for user
        const timestamps = rateLimitStore.get(userId) || [];

        // Filter out timestamps outside window
        const recentTimestamps = timestamps.filter((t) => now - t < windowMs);

        // Check if limit exceeded
        if (recentTimestamps.length >= maxRequests) {
            throw new Error(`Rate limit exceeded for user ${userId}`);
        }

        // Add current timestamp
        recentTimestamps.push(now);
        rateLimitStore.set(userId, recentTimestamps);

        return handler(request);
    },
});
```

### Response Transformation

```typescript
export const responseSanitizer = createMiddleware({
    name: 'ResponseSanitizer',

    wrapModelCall: (request, handler) => {
        return handler(request).then((response) => {
            // Sanitize response content
            if (response.text) {
                response.text = sanitizeText(response.text);
            }

            return response;
        });
    },
});

function sanitizeText(text: string): string {
    // Remove sensitive information
    return text
        .replace(/password:\s*\S+/gi, 'password: [REDACTED]')
        .replace(/api[_-]?key:\s*\S+/gi, 'api_key: [REDACTED]');
}
```

## Best Practices

1. **Naming**: Use descriptive names that indicate to middleware's purpose
2. **Order Matters**: Place middleware in correct order for your use case
3. **Context**: Use context for runtime configuration, not static configuration
4. **Error Handling**: Wrap async operations in try/catch
5. **Performance**: Minimize work in the request path
6. **Testing**: Test middleware independently and in combination
7. **Documentation**: Document context schema and behavior
8. **Side Effects**: Be careful with side effects that affect subsequent requests
9. **Logging**: Add logging for debugging middleware execution
10. **Type Safety**: Use Zod schemas for all context and configuration

## Common Issues

### Middleware Not Executing

```typescript
// Ensure middleware is properly added to agent
const agent = createAgent({
    name: 'MyAgent',
    model,
    middleware: [myMiddleware], // Correct
});

// NOT this:
const agent = createAgent({
    name: 'MyAgent',
    model,
    // middleware array missing
});
```

### Wrong Execution Order

```typescript
// Middleware 1 executes first on request, last on response
const middleware = [
    requestModifier, // First on request, last on response
    responseModifier, // Second on request, first on response
];
```

### Context Not Available

```typescript
// Ensure context schema is defined
const contextAwareMiddleware = createMiddleware({
    name: 'ContextAware',
    contextSchema: z.object({ userId: z.string() }), // Required

    wrapModelCall: (request, handler) => {
        console.log(request.runtime.context.userId); // Now available
        return handler(request);
    },
});

// And pass context when invoking
await agent.invoke(
    { messages: [] },
    {
        configurable: {
            runtime_context: { userId: '123' },
        },
    },
);
```

### Async Issues

```typescript
// Always handle async properly
const asyncMiddleware = createMiddleware({
    name: 'Async',
    wrapModelCall: async (request, handler) => {
        // Await async operations
        const result = await someAsyncOperation();

        // Return handler result
        return handler({ ...request, extra: result });
    },
});
```

## Testing

### Testing Middleware

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('loggingMiddleware', () => {
    it('should log requests', async () => {
        const mockHandler = vi.fn().mockResolvedValue({ text: 'response' });
        const middleware = createMiddleware({
            name: 'Logging',
            wrapModelCall: (request, handler) => handler(request),
        });

        const logSpy = vi.spyOn(console, 'log');

        await middleware.wrapModelCall({ messages: [] }, mockHandler);

        expect(logSpy).toHaveBeenCalled();
    });
});
```

### Testing Middleware Composition

```typescript
describe('Middleware Chain', () => {
    it('should execute in correct order', async () => {
        const executionOrder: string[] = [];

        const mw1 = createMiddleware({
            name: 'MW1',
            wrapModelCall: async (request, handler) => {
                executionOrder.push('MW1-request');
                const response = await handler(request);
                executionOrder.push('MW1-response');
                return response;
            },
        });

        const mw2 = createMiddleware({
            name: 'MW2',
            wrapModelCall: async (request, handler) => {
                executionOrder.push('MW2-request');
                const response = await handler(request);
                executionOrder.push('MW2-response');
                return response;
            },
        });

        const handler = async () => ({ text: 'response' });

        await mw1.wrapModelCall({ messages: [] }, async (req) => await mw2.wrapModelCall(req, handler));

        expect(executionOrder).toEqual(['MW1-request', 'MW2-request', 'MW2-response', 'MW1-response']);
    });
});
```

## Installation

```bash
npm install langchain @langchain/core @langgraph-js/auk zod
```
