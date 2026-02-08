---
name: standard-agent
description: Guide for using @langgraph-js/standard-agent package. Covers AgentPackage, tool registration, middleware configuration, storage backends, and agent factory patterns. Use when setting up a configuration-driven agent system.
---

# Standard Agent System

The `@langgraph-js/standard-agent` package provides a configuration-driven agent system with tool registry, middleware system, and pluggable storage.

## Core Concepts

### AgentPackage

The central configuration container for agents, tools, and prompts.

```typescript
import { AgentPackage, MemoryStorage } from '@langgraph-js/standard-agent';

// Create package with memory storage
const storage = new MemoryStorage();
const pkg = new AgentPackage({ storage });
```

### Storage Backends

#### Memory Storage

```typescript
import { MemoryStorage } from '@langgraph-js/standard-agent';

const storage = new MemoryStorage();
const pkg = new AgentPackage({ storage });
```

#### File System Storage

```typescript
import { FileStorage } from '@langgraph-js/standard-agent';
import { promises as fs } from 'fs';
import path from 'path';

const storage = new FileStorage({
  directory: path.join(process.cwd(), '.agent-config'),
  read: async (path) => {
    const data = await fs.readFile(path, 'utf-8');
    return JSON.parse(data);
  },
  write: async (path, data) => {
    await fs.writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
  },
});

const pkg = new AgentPackage({ storage });
```

## Tool Management

### Adding Tools

```typescript
import { fromLangChainTool } from '@langgraph-js/standard-agent';

// Define a tool using LangChain pattern
const searchTool = fromLangChainTool(
  async ({ query }) => {
    return { results: [] };
  },
  {
    name: 'search',
    description: 'Search documents',
    schema: z.object({ query: z.string() }),
  }
);

// Register tool with package
await pkg.addTool({
  id: 'search',
  name: 'search',
  description: 'Search documents',
});

pkg.tools.registerImplementation(searchTool);
```

### Getting Tools

```typescript
// Get tool implementation
const toolImpl = pkg.tools.getImplementation('search');
if (toolImpl) {
  const result = await toolImpl.execute({ query: 'test' });
}

// Get all registered tools
const allTools = pkg.tools.getAllImplementations();
```

### Tool Configuration in Agents

```typescript
await pkg.addAgent({
  id: 'agents/coder',
  name: 'Coding Agent',
  modelId: 'gpt-4',
  systemPromptId: 'prompts/coder',
  tools: {
    search: true,      // Enable search
    code_edit: true,   // Enable code_edit
  },
  middleware: {
    logging: true,     // Enable logging middleware
  },
});
```

## Middleware Management

### Adding Middleware

```typescript
import { createMiddleware } from 'langchain';

const loggingMiddleware = createMiddleware({
  name: 'Logging',
  wrapModelCall: (request, handler) => {
    console.log('Request:', request);
    return handler(request);
  },
});

await pkg.addMiddleware({
  id: 'logging',
  name: 'Logging Middleware',
  description: 'Logs all requests and responses',
});

pkg.middlewares.registerImplementation({
  id: 'logging',
  execute: async (params) => loggingMiddleware,
});
```

### Middleware with Parameters

```typescript
await pkg.addMiddleware({
  id: 'prompt-caching',
  name: 'Prompt Caching',
  description: 'Anthropic prompt caching',
});

pkg.middlewares.registerImplementation({
  id: 'prompt-caching',
  execute: async (params) => {
    const { ttl = '5m', minMessages = 3 } = params.customParams || {};
    return anthropicPromptCachingMiddleware({ ttl, minMessages });
  },
});
```

### Middleware Configuration in Agents

```typescript
await pkg.addAgent({
  id: 'agents/coder',
  name: 'Coding Agent',
  modelId: 'gpt-4',
  systemPromptId: 'prompts/coder',
  tools: { search: true },
  middleware: {
    logging: {
      enabled: true,
      logLevel: 'debug',
    },
    'prompt-caching': {
      enabled: true,
      customParams: {
        ttl: '1h',
        minMessages: 5,
      },
    },
  },
});
```

## Prompt Management

### Adding Prompts

```typescript
await pkg.addPrompt({
  id: 'prompts/coder',
  content: `You are an expert software engineer.

You help users write, review, and debug code.

Rules:
- Write clean, maintainable code
- Add comments for complex logic
- Follow project conventions`,
});
```

### Getting Prompts

```typescript
const promptConfig = await pkg.getPrompt('prompts/coder');
console.log(promptConfig.content);
```

## Agent Configuration

### Creating Agents

```typescript
await pkg.addAgent({
  id: 'agents/coder',
  name: 'Coding Agent',
  modelId: 'gpt-4',
  systemPromptId: 'prompts/coder',
  tools: {
    search: true,
    code_edit: true,
    read_file: true,
  },
  middleware: {
    logging: true,
  },
});
```

### Getting Agent Config

```typescript
const agentConfig = await pkg.getAgent('agents/coder');
console.log(agentConfig.name);           // 'Coding Agent'
console.log(agentConfig.modelId);         // 'gpt-4'
console.log(agentConfig.tools);           // { search: true, code_edit: true, ... }
console.log(agentConfig.middleware);       // { logging: true }
```

### Validating Agents

```typescript
const validation = await pkg.validateAgent('agents/coder');

if (!validation.valid) {
  console.error('Agent validation failed:', validation.errors);
  validation.errors.forEach(err => {
    console.error(`- ${err.path}: ${err.message}`);
  });
}
```

### Listing Agents

```typescript
const agents = await pkg.listAgents();
agents.forEach(agent => {
  console.log(`${agent.id}: ${agent.name}`);
});
```

## Agent Factory

### Creating Agents from Package

```typescript
import { createAgent, tool } from 'langchain';

async function createAgentFromPackage(
  agentId: string,
  pkg: AgentPackage,
  state: MyStateType
) {
  const agentConfig = await pkg.getAgent(agentId);

  if (!agentConfig) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  // Validate configuration
  const validation = await pkg.validateAgent(agentId);
  if (!validation.valid) {
    throw new Error(`Invalid agent: ${validation.errors.join(', ')}`);
  }

  // Load prompt
  const promptConfig = await pkg.getPrompt(agentConfig.systemPromptId);
  if (!promptConfig) {
    throw new Error(`Prompt not found: ${agentConfig.systemPromptId}`);
  }

  // Initialize model
  const model = await initChatModel(agentConfig.modelId);

  // Build tools from configuration
  const tools = [];
  for (const [toolId, params] of Object.entries(agentConfig.tools)) {
    const toolImpl = pkg.tools.getImplementation(toolId);
    if (!toolImpl || !params) {
      continue;
    }

    tools.push(tool(toolImpl.execute, {
      name: toolImpl.name,
      description: toolImpl.description,
      schema: toolImpl.paramsSchema?.toJSONSchema(),
    }) as any);
  }

  // Build middleware from configuration
  const middleware = [];
  for (const [middlewareId, params] of Object.entries(agentConfig.middleware)) {
    const impl = pkg.middlewares.getImplementation(middlewareId);
    if (impl && params) {
      middleware.push(await impl.execute(params.customParams || {}));
    }
  }

  // Create agent
  return createAgent({
    name: agentConfig.name,
    model,
    systemPrompt: promptConfig.content,
    tools,
    stateSchema: MyState,
    middleware,
  });
}
```

### Multi-Agent System

```typescript
// Create multiple specialized agents
const coderAgent = await createAgentFromPackage('agents/coder', pkg, state);
const reviewerAgent = await createAgentFromPackage('agents/reviewer', pkg, state);
const debuggerAgent = await createAgentFromPackage('agents/debugger', pkg, state);

// Route to appropriate agent based on task
function selectAgent(taskType: string) {
  switch (taskType) {
    case 'code':
      return coderAgent;
    case 'review':
      return reviewerAgent;
    case 'debug':
      return debuggerAgent;
    default:
      return coderAgent;
  }
}

const agent = selectAgent('code');
const result = await agent.invoke({
  messages: [new HumanMessage('Write a function to sort arrays')],
});
```

## Configuration Schemas

### Tool Schema

```typescript
const toolConfig = {
  id: string;           // Unique tool ID
  name: string;          // Display name
  description: string;   // Tool description
};
```

### Middleware Schema

```typescript
const middlewareConfig = {
  id: string;                  // Unique middleware ID
  name: string;                // Display name
  description: string;         // Middleware description
};
```

### Agent Schema

```typescript
const agentConfig = {
  id: string;                    // Unique agent ID (e.g., 'agents/coder')
  name: string;                  // Display name
  modelId: string;               // Model to use
  systemPromptId: string;        // Prompt ID to use
  tools: {                       // Tool configuration map
    [toolId: string]: boolean | object;
  };
  middleware: {                  // Middleware configuration map
    [middlewareId: string]: boolean | object;
  };
};
```

## Best Practices

1. **Use IDs Hierarchically**: Use `agents/coder`, `agents/reviewer` pattern
2. **Validate Before Use**: Always call `validateAgent()` before creating agents
3. **Version Your Configs**: Use `v1/coder`, `v2/coder` for breaking changes
4. **Reimplementations**: Register tool implementations, not just definitions
5. **Middleware Parameters**: Use `customParams` for flexible configuration
6. **Storage Choice**: Use MemoryStorage for dev, FileStorage for production
7. **Error Handling**: Check for null when getting tools/middleware/agents
8. **Type Safety**: Define Zod schemas for all tool inputs
9. **Documentation**: Document custom params for middleware
10. **Consistency**: Follow naming conventions across tools, middleware, agents

## Common Patterns

### Dynamic Tool Loading

```typescript
async function loadTools(pkg: AgentPackage, agentConfig: any) {
  const tools = [];

  for (const [toolId, params] of Object.entries(agentConfig.tools)) {
    const toolImpl = pkg.tools.getImplementation(toolId);
    if (toolImpl && params) {
      tools.push(tool(toolImpl.execute, {
        name: toolImpl.name,
        description: toolImpl.description,
        schema: toolImpl.paramsSchema?.toJSONSchema(),
      }) as any);
    }
  }

  return tools;
}
```

### Runtime Tool Switching

```typescript
const coderTools = await loadTools(pkg, coderConfig);
const reviewerTools = await loadTools(pkg, reviewerConfig);

const coderAgent = createAgent({
  name: 'Coder',
  model,
  systemPrompt: coderPrompt,
  tools: coderTools,
});

const reviewerAgent = createAgent({
  name: 'Reviewer',
  model,
  systemPrompt: reviewerPrompt,
  tools: reviewerTools,
});
```

### Configuration Migration

```typescript
async function migrateConfig(pkg: AgentPackage) {
  // Migrate from old format
  const oldAgents = await pkg.listAgents();

  for (const agent of oldAgents) {
    const config = await pkg.getAgent(agent.id);

    // Remove deprecated tool
    if ('deprecated_tool' in config.tools) {
      delete config.tools.deprecated_tool;
      await pkg.updateAgent(agent.id, config);
    }

    // Add new middleware
    if (!config.middleware['prompt-caching']) {
      config.middleware['prompt-caching'] = { enabled: true };
      await pkg.updateAgent(agent.id, config);
    }
  }
}
```

## Testing

### Testing Tool Registration

```typescript
describe('Tool Registration', () => {
  it('should register and retrieve tool', async () => {
    const pkg = new AgentPackage({ storage: new MemoryStorage() });

    await pkg.addTool({
      id: 'test-tool',
      name: 'Test Tool',
      description: 'Test tool',
    });

    const toolImpl = pkg.tools.getImplementation('test-tool');
    expect(toolImpl).toBeDefined();
  });
});
```

### Testing Agent Creation

```typescript
describe('Agent Creation', () => {
  it('should create agent from package', async () => {
    const agent = await createAgentFromPackage('agents/test', pkg, state);

    expect(agent).toBeDefined();
    expect(agent.name).toBe('Test Agent');
  });
});
```

## Installation

```bash
npm install @langgraph-js/standard-agent langchain @langchain/core zod
```
