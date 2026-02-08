---
name: langgraph-development
description: Guide for building LangChain/LangGraph projects in TypeScript. Covers modern @langgraph-js/* packages, StateGraph, AgentMiddleware, createAgent, tool development, AgentPackage configuration, and monorepo patterns. Use when creating new agents, implementing tools, designing workflows, or setting up LangGraph infrastructure in TypeScript monorepos.
---

# LangGraph Development Guide

## Overview

This skill provides comprehensive guidance for building modern LangChain/LangGraph applications using TypeScript, with specific patterns and practices from the CodeGraph project.

## Core Architecture

### LangGraph State Management

```typescript
import { AgentState, createState } from '@langgraph-js/pro';
import { MessagesAnnotation } from '@langchain/langgraph';

// Create custom state with annotations
export const MyState = AgentState.extend({
  my_field: z.string().default('value'),
});

// Alternative: Using createState with annotations
export const MyAnnotation = createState(MessagesAnnotation).build({
  my_field: createDefaultAnnotation(() => 'value')
});

export type MyStateType = typeof MyAnnotation.State;
```

### Building Graphs

```typescript
import { StateGraph, START } from '@langchain/langgraph';

export function createMyGraph() {
  return new StateGraph(MyState)
    .addNode('process', async (state, runtime) => {
      // Node logic
      return { output: 'result' };
    })
    .addEdge(START, 'process')
    .compile();
}
```

### Switch Branch Routing

```typescript
const switchBranch = {
  mode_a: async (state) => ({ mode: 'a' }),
  mode_b: async (state) => ({ mode: 'b' }),
} as const;

// In graph node
if (state.switch_command === 'mode_a') {
  return switchBranch.mode_a(state);
}
```

## Agent Creation

### createAgent Pattern

```typescript
import { createAgent, AgentMiddleware, tool } from 'langchain';

export function createMyAgent() {
  return createAgent({
    name: 'MyAgent',
    model: await initChatModel('gpt-4'),
    systemPrompt: 'You are a helpful assistant',
    tools: [myTool],
    stateSchema: MyState,
    middleware: [myMiddleware],
  });
}
```

### AgentMiddleware Implementation

```typescript
export class MyMiddleware implements AgentMiddleware {
  name = 'MyMiddleware';
  stateSchema = undefined;
  contextSchema = undefined;
  tools = [];

  async wrapModelCall(request, handler) {
    // Modify request before model call
    return await handler(modifiedRequest);
  }
}
```

## Tool Development

### Standard Tool Creation

```typescript
import { tool } from '@langchain/core/tools';
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

### Tool Adapter Pattern (for LangChain Tools)

```typescript
// From standard-agent package
import { fromLangChainTool } from '@langgraph-js/standard-agent';

export const standardTool = fromLangChainTool(
  async (input) => {
    // Implementation
    return result;
  },
  {
    name: 'tool_name',
    description: 'Tool description',
    schema: z.object({ param: z.string() }),
  },
);
```

## AgentPackage System

The AgentPackage system provides unified configuration for agents:

```typescript
import { AgentPackage } from '@langgraph-js/standard-agent';

// Load package
const pkg = await loadDefaultConfigs();

// Get agent configuration
const agentConfig = await pkg.getAgent('agents/default');

// Get prompt configuration
const promptConfig = await pkg.getPrompt(agentConfig.systemPromptId);

// Get tool implementation
const toolImpl = pkg.tools.getImplementation('tool_id');

// Validate agent
const validation = await pkg.validateAgent('agents/default');
```

### StandardAgent Class

```typescript
import { StandardAgent } from '@langgraph-js/standard-agent';

const agent = new StandardAgent(agentConfig);

agent.id;           // Agent ID
agent.name;         // Agent name
agent.tools;        // Tool configuration map
agent.middleware;   // Middleware configuration map
agent.getToolConfig('tool_id');      // Get specific tool config
agent.getMiddlewareConfig('mid_id'); // Get specific middleware config
```

## Monorepo Patterns

### Package Structure

```
code-graph/
├── packages/
│   ├── agent/           # LangGraph agent implementation
│   ├── standard-agent/  # AgentPackage system
│   └── config/          # Storage and configuration
├── zen-code/            # TUI application
└── pnpm-workspace.yaml
```

### Import Patterns

```typescript
// From local packages
import { createAgent } from 'langchain';  // Re-exported
import { AgentPackage } from '@langgraph-js/standard-agent';
import { TaskStoreManager } from '@codegraph/config';

// From langchain packages
import { tool } from '@langchain/core/tools';
import { StateGraph } from '@langchain/langgraph';
```

## Model Initialization

```typescript
import { ChatOpenAI } from '@langgraph-js/pro';
import { ChatAnthropic } from '@langchain/anthropic';

interface InitChatModelOptions {
  modelProvider?: 'openai' | 'anthropic';
  streamUsage?: boolean;
  enableThinking?: boolean;
}

export async function initChatModel(model: string, options: InitChatModelOptions = {}) {
  const { modelProvider, enableThinking = true } = options;

  if (modelProvider === 'anthropic') {
    return new ChatAnthropic({
      model,
      streamUsage: true,
      streaming: true,
      thinking: enableThinking ? {
        budget_tokens: 1024,
        type: 'enabled',
      } : undefined,
    });
  } else {
    return new ChatOpenAI({
      model,
      streamUsage: true,
      modelKwargs: enableThinking ? {
        thinking: { type: 'enabled' },
      } : undefined,
    });
  }
}
```

## Testing Patterns

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyGraph', () => {
  it('should process state correctly', async () => {
    const graph = createMyGraph();
    const result = await graph.invoke({ input: 'test' });
    expect(result).toBeDefined();
  });
});
```

## Common Patterns

### Human-in-the-Loop Middleware

```typescript
import { humanInTheLoopMiddleware } from '@langgraph-js/auk';

middleware.push(humanInTheLoopMiddleware({
  interruptOn: {
    terminal: { allowedDecisions: ['approve', 'reject', 'edit'] },
  },
}));
```

### Dynamic Tool Registration

```typescript
// Filter tools based on agent configuration
const tools: DynamicStructuredTool[] = [];
for (const [toolId, params] of Object.entries(agentConfig.tools)) {
  const toolImpl = toolRegistry.getImplementation(toolId);
  if (toolImpl && params) {
    tools.push(tool(toolImpl.execute, {
      name: toolImpl.name,
      description: toolImpl.description,
      schema: toolImpl.paramsSchema?.toJSONSchema(),
    }) as any);
  }
}
```

### System Prompt Enhancement

```typescript
// Add environment info to system prompt
const systemPrompt = basePrompt + `\n\n${await getEnvInfo(state)}`;

// Add middleware-specific content
const modifiedSystemMessage = new SystemMessage(basePrompt + middlewareSection);
```

## Dependencies

### Required Packages

```json
{
  "@langchain/core": "^1.1.15",
  "@langchain/langgraph": "^1.1.0",
  "@langchain/openai": "^1.2.2",
  "@langchain/anthropic": "^1.3.15",
  "@langgraph-js/pro": "latest",
  "@langgraph-js/standard-agent": "workspace:*",
  "@langgraph-js/pure-graph": "^2.10.0",
  "zod": "^4"
}
```

### Development Dependencies

```json
{
  "typescript": "^5.9.3",
  "vitest": "^4.0.18"
}
```

## File Organization

### Agent Package Structure

```
packages/agent/src/
├── state.ts              # State definitions
├── graphBuilder.ts       # Graph construction
├── initChatModel.ts      # Model initialization
├── tools/                # Tool implementations
│   ├── filesystem_tools/
│   ├── bash_tools/
│   └── task_tools/
├── middlewares/          # Middleware implementations
│   ├── skills.ts
│   ├── memories.ts
│   └── commandSystem.ts
└── subagents/            # Subagent configuration
    ├── config.ts
    └── factory-v2.ts
```

### Standard Agent Package Structure

```
packages/standard-agent/src/
├── index.ts              # Main exports
├── agent.ts              # StandardAgent class
├── package.ts            # AgentPackage class
├── registry.ts           # Tool/middleware registry
├── schemas.ts            # Zod validation schemas
├── repository.ts         # Storage abstraction
├── validator.ts          # Configuration validation
└── langchain.ts          # Tool adapter
```

## Key Concepts

### 1. Progressive Middleware Chain

Middleware is executed in order, each can modify requests/responses:

```
Request → Middleware1 → Middleware2 → Model → Middleware2 → Middleware1 → Response
```

### 2. Tool Registry Pattern

Tools are registered globally and filtered per agent:

```typescript
// Register tools globally
toolRegistry.registerImplementation(myTool);

// Filter by agent config
const tools = agentConfig.tools
  .filter((id) => toolRegistry.hasImplementation(id))
  .map((id) => toolRegistry.getImplementation(id));
```

### 3. Two-Level Task Architecture

Tasks are organized in fixed 2-level hierarchy:

```
Root Task
├── Task Group A (parallel)  # Different agents work in parallel
│   ├── Task 1
│   └── Task 2
└── Task Group B (serial)    # Sequential tasks within group
    └── Task 3
```

### 4. State Annotation System

Use `createDefaultAnnotation` for default values:

```typescript
export const MyAnnotation = createState().build({
  field1: createDefaultAnnotation(() => 'default'),
  field2: createDefaultAnnotation(() => 0),
  field3: createDefaultAnnotation(() => ({ nested: true })),
});
```

## Best Practices

1. **Type Safety**: Use Zod schemas for all tool inputs and state fields
2. **Async Initialization**: All model and package initialization should be async
3. **Error Handling**: Wrap async operations in try-catch with meaningful error messages
4. **Middleware Composition**: Build reusable middleware that can be combined
5. **Tool Granularity**: Keep tools focused and single-purpose
6. **State Immutability**: Always return new state objects, don't mutate
7. **Progressive Disclosure**: Only load full skill/content when needed
8. **Testing**: Test graph nodes and middleware independently
9. **Documentation**: Add JSDoc comments for complex functions
10. **Consistency**: Follow naming conventions from the codebase

## Common Issues and Solutions

### Issue: Type errors with tool()

```typescript
// Use type assertion when needed
tools.push(tool(...) as any as DynamicStructuredTool);
```

### Issue: Middleware order matters

```typescript
// Middleware is executed in reverse order on response
middleware.push(promptCachingMiddleware);  // Runs first on response
middleware.push(humanInTheLoopMiddleware); // Runs second on response
```

### Issue: Dynamic tools in agent config

```typescript
// Convert to correct LangGraph tool format
for (const [toolId, params] of Object.entries(agentConfig.tools)) {
  const impl = toolRegistry.getImplementation(toolId);
  if (impl && params) {
    tools.push(tool(impl.execute, {
      name: impl.name,
      description: impl.description,
      schema: impl.paramsSchema?.toJSONSchema(),
    }) as any as DynamicStructuredTool);
  }
}
```

### Issue: State updates not persisting

```typescript
// Always return new state object from nodes
return { ...state, field: newValue };  // ✅ Correct
state.field = newValue;                 // ❌ Won't work
return state;
```

## Integration Examples

### Full Agent Creation with AgentPackage

```typescript
export async function createStandardAgentV2(
  agentId: string,
  pkg: AgentPackage,
  state: CodeStateType,
  runtime: Runtime,
) {
  // Load and validate config
  const agentConfig = await pkg.getAgent(agentId);
  const validation = await pkg.validateAgent(agentId);
  if (!validation.valid) {
    throw new Error(`Invalid agent: ${validation.errors.join(', ')}`);
  }

  // Initialize model
  const model = await initChatModel(state.main_model, {
    modelProvider: process.env.MODEL_PROVIDER,
    enableThinking: state.enable_thinking,
  });

  // Build tools
  const tools: DynamicStructuredTool[] = [];
  for (const [toolId, params] of Object.entries(agentConfig.tools)) {
    const toolImpl = pkg.tools.getImplementation(toolId);
    if (toolImpl && params) {
      tools.push(tool(toolImpl.execute, {
        name: toolImpl.name,
        description: toolImpl.description,
        schema: toolImpl.paramsSchema?.toJSONSchema(),
      }) as any as DynamicStructuredTool);
    }
  }

  // Build middleware
  const middleware: AgentMiddleware[] = [];
  for (const [midId, params] of Object.entries(agentConfig.middleware)) {
    const impl = pkg.middlewares.getImplementation(midId);
    if (impl && params) {
      middleware.push(await impl.execute(params.customParams || {}));
    }
  }

  // Load prompt
  const promptConfig = await pkg.getPrompt(agentConfig.systemPromptId);
  const systemPrompt = promptConfig.content + `\n\n${await getEnvInfo(state)}`;

  // Create agent
  return createAgent({
    name: agentConfig.name,
    model,
    systemPrompt,
    tools,
    stateSchema: CodeState,
    middleware,
  });
}
```

## References

For more details on specific components, see:

- `packages/agent/src/state.ts` - State management patterns
- `packages/agent/src/graphBuilder.ts` - Graph construction examples
- `packages/agent/src/subagents/factory-v2.ts` - Agent creation with AgentPackage
- `packages/standard-agent/src/` - AgentPackage system implementation
- `packages/agent/src/middlewares/` - Middleware examples
- `packages/agent/src/tools/` - Tool implementations
