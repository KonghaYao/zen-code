---
name: standard-agent
description:
    Guide for using @langgraph-js/standard-agent package. Covers AgentPackage, tool registration, middleware
    configuration, storage backends, and agent factory patterns. Use when setting up a configuration-driven agent
    system.
---

# Standard Agent System

The `@langgraph-js/standard-agent` package provides a **configuration-driven agent system** with tool registry,
middleware system, and pluggable storage.

**Note**: This is an **optional** abstraction layer on top of LangChain. You can build agents without it using the
patterns from the [main skill](./SKILL.md). Use standard-agent when you need:

- Dynamic agent configuration from storage/database
- Tool and middleware registries
- Multi-agent management from configuration
- Configuration validation and serialization

## Core Concepts

### AgentPackage

The central configuration container for agents, tools, prompts, and middlewares.

```typescript
import { AgentPackage, MemoryStorage } from '@langgraph-js/standard-agent';

// Create package with memory storage
const storage = new MemoryStorage();
const pkg = new AgentPackage(storage);
```

**Key Features:**

- Manages CRUD operations for models, prompts, tools, middlewares, and agents
- Maintains runtime registries for tools and middlewares
- Provides validation and serialization
- Uses proxy methods for clean API

### Storage Backends

#### Memory Storage

```typescript
import { MemoryStorage } from '@langgraph-js/standard-agent';

const storage = new MemoryStorage();
const pkg = new AgentPackage(storage);
```

Features:

- In-memory storage (data lost on exit)
- Transaction support with rollback
- Perfect for testing and development

#### Custom Storage

Implement the `IStorage` interface:

```typescript
interface IStorage {
    // Models
    insertModel(data: ModelInput): Promise<void>;
    getModel(id: string): Promise<ModelRow | undefined>;
    getAllModels(): Promise<ModelRow[]>;
    updateModel(data: ModelInput): Promise<void>;
    deleteModel(id: string): Promise<void>;

    // Prompts
    insertPrompt(data: PromptInput): Promise<void>;
    getPrompt(id: string): Promise<PromptRow | undefined>;
    getPromptByName(name: string): Promise<PromptRow | undefined>;
    getAllPrompts(): Promise<PromptRow[]>;
    updatePrompt(data: PromptInput): Promise<void>;
    deletePrompt(id: string): Promise<void>;

    // Tools
    insertTool(data: ToolInput): Promise<void>;
    getTool(id: string): Promise<ToolRow | undefined>;
    getAllTools(): Promise<ToolRow[]>;
    updateTool(data: ToolInput): Promise<void>;
    deleteTool(id: string): Promise<void>;

    // Middlewares
    insertMiddleware(data: MiddlewareInput): Promise<void>;
    getMiddleware(id: string): Promise<MiddlewareRow | undefined>;
    getAllMiddlewares(): Promise<MiddlewareRow[]>;
    updateMiddleware(data: MiddlewareInput): Promise<void>;
    deleteMiddleware(id: string): Promise<void>;

    // Agents
    insertAgent(data: AgentInput): Promise<void>;
    getAgent(id: string): Promise<AgentWithRelations | undefined>;
    getAllAgents(): Promise<AgentWithRelations[]>;
    updateAgent(data: AgentInput): Promise<void>;
    deleteAgent(id: string): Promise<void>;

    // Transactions
    transaction<T>(fn: () => T | Promise<T>): Promise<T>;

    // Lifecycle
    close(): Promise<void>;
}
```

## Tool Management

### Tool Implementation Interface

```typescript
import { ToolImplementation } from '@langgraph-js/standard-agent';
import { z } from 'zod';

interface ToolImplementation<Params = unknown, Result = unknown> {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly paramsSchema?: z.ZodType<Params>;
    execute(params: Params): Promise<Result> | Result;
}
```

### Registering Tools

```typescript
import { tool } from 'langchain';

// 1. Add tool definition to storage
await pkg.addTool({
    id: 'read_file',
    name: 'read_file',
    description: 'Read file contents',
});

// 2. Register implementation in runtime registry
const readToolImpl: ToolImplementation = {
    id: 'read_file',
    name: 'read_file',
    description: 'Read file contents',
    paramsSchema: z.object({
        path: z.string(),
    }),
    execute: async (params) => {
        return fs.readFileSync(params.path, 'utf-8');
    },
};

pkg.tools.registerImplementation(readToolImpl);
```

### Wrapping LangChain Tools

```typescript
import { Tool } from 'langchain';

async function registerLangChainTool(pkg: AgentPackage, tool: Tool) {
    // Add tool schema to storage
    await pkg.addTool({
        id: tool.name,
        name: tool.name,
        description: tool.description,
    });

    // Create ToolImplementation wrapper
    const toolImpl: ToolImplementation = {
        id: tool.name,
        name: tool.name,
        description: tool.description,
        paramsSchema: tool.schema,
        execute: async (params) => {
            const result = await tool.invoke(params);
            // Handle ToolMessage return type
            if (result && typeof result === 'object' && 'content' in result) {
                return result.content;
            }
            return result;
        },
    };

    pkg.tools.registerImplementation(toolImpl);
}
```

### Getting Tools

```typescript
// Get tool implementation
const toolImpl = pkg.tools.getImplementation('read_file');
if (toolImpl) {
    const result = await toolImpl.execute({ path: '/path/to/file' });
}

// Check if implementation exists
if (pkg.tools.hasImplementation('read_file')) {
    // Tool is available
}

// List all implementations
const allTools = pkg.tools.listImplementations();
```

## Middleware System

Standard-agent provides **production-ready middleware classes** that implement LangChain's `AgentMiddleware` interface.
These can be used directly with `createAgent`.

**For complete documentation**, see: **[standard-agent-middlewares.md](./standard-agent-middlewares.md)**

### Quick Example

```typescript
import { createAgent } from 'langchain';
import { AgentsMdMiddleware, SkillsMiddleware, anthropicPromptCachingMiddleware } from '@langgraph-js/standard-agent';

const agent = createAgent({
    name: 'MyAgent',
    model,
    systemPrompt: 'You are helpful',
    tools: [],
    middleware: [
        new AgentsMdMiddleware({ projectRoot: process.cwd() }),
        new SkillsMiddleware({ projectSkillsDir: './.claude/skills' }),
        anthropicPromptCachingMiddleware({ ttl: '1h' }),
    ],
});
```

### Available Middlewares

**AgentsMdMiddleware** - Injects AGENTS.md/CLAUDE.md documentation **SkillsMiddleware** - Progressive disclosure of
skills **SubAgentsMiddleware** - Task delegation to specialized agents **AnthropicPromptCachingMiddleware** - Optimizes
Anthropic API costs **createMCPMiddleware** - Model Context Protocol integration

**See [standard-agent-middlewares.md](./standard-agent-middlewares.md)** for:

- Complete documentation for each middleware
- Constructor parameters and options
- Usage examples and best practices
- Progressive disclosure pattern

## Model Management

### Adding Models

```typescript
await pkg.addModel({
    id: 'claude-3-5-sonnet',
    model_name: 'claude-3-5-sonnet',
    model_provider: 'anthropic',
    stream_usage: true,
    enable_thinking: true,
    temperature: 0.1,
    max_tokens: 4000,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
});
```

### Getting Models

```typescript
const model = await pkg.getModel('claude-3-5-sonnet');
if (model) {
    console.log(model.model_name); // 'claude-3-5-sonnet'
    console.log(model.model_provider); // 'anthropic'
}

const allModels = await pkg.listModels();
```

## Prompt Management

### Adding Prompts

```typescript
await pkg.addPrompt({
    id: 'prompts/coder',
    name: 'coder',
    content: `You are an expert software engineer.

You help users write, review, and debug code.

Rules:
- Write clean, maintainable code
- Add comments for complex logic
- Follow project conventions`,
    metadata: {
        version: 1,
        author: 'team',
    },
});
```

### Getting Prompts

```typescript
// Get by ID
const prompt = await pkg.getPrompt('prompts/coder');
console.log(prompt.content);

// Get by name
const promptByName = await pkg.getPromptByName('coder');

const allPrompts = await pkg.listPrompts();
```

## Agent Configuration

### Agent Schema

```typescript
const agentConfig = {
    id: string;                    // Unique agent ID (e.g., 'agents/coder')
    name: string;                  // Display name
    description: string;           // Agent description
    model: string;                 // Model ID to use
    system_prompt: string;         // Prompt ID to use
    tools: {                       // Tool configuration map
        [toolId: string]: boolean | { customParams?: any };
    };
    middleware: {                  // Middleware configuration map
        [middlewareId: string]: boolean | { customParams?: any };
    };
};
```

### Creating Agents

```typescript
await pkg.addAgent({
    id: 'agents/coder',
    name: 'Coding Agent',
    description: 'Expert software engineering assistant',
    model: 'claude-3-5-sonnet',
    system_prompt: 'prompts/coder',
    tools: {
        read_file: true, // Enable with defaults
        write_file: true,
        terminal: {
            customParams: {
                // Enable with custom params
                allowedCommands: ['ls', 'cat'],
            },
        },
    },
    middleware: {
        logging: true, // Enable with defaults
        'prompt-caching': {
            customParams: {
                // Enable with custom params
                ttl: '1h',
            },
        },
    },
});
```

### Getting Agent Config

```typescript
const agentConfig = await pkg.getAgent('agents/coder');
console.log(agentConfig.name); // 'Coding Agent'
console.log(agentConfig.model); // 'claude-3-5-sonnet'
console.log(agentConfig.tools); // { read_file: true, ... }
console.log(agentConfig.middleware); // { logging: true, ... }
```

### Validating Agents

```typescript
const validation = await pkg.validateAgent('agents/coder');

if (!validation.valid) {
    console.error('Agent validation failed:');
    validation.errors.forEach((err) => {
        console.error(`- ${err.path}: ${err.message}`);
    });
}

// Validate all agents
const allValidations = await pkg.validateAll();
```

### Listing Agents

```typescript
const agents = await pkg.listAgents();
agents.forEach((agent) => {
    console.log(`${agent.id}: ${agent.name}`);
});
```

## Built-in Middleware

The `@langgraph-js/standard-agent` package provides production-ready middleware classes for LangChain agents.

**See [standard-agent-middlewares.md](./standard-agent-middlewares.md)** for complete documentation.

### Available Middleware

**SubAgents Middleware** (`SubAgentsMiddleware`)

- Enables task delegation to specialized subagents
- Progressive disclosure of available agents
- Context parameters: `agents`, `createAgent`

**Skills Middleware** (`SkillsMiddleware`)

- Progressive disclosure of project and user skills
- Context parameters: `skillsDir`, `projectSkillsDir`, `assistantId`

**AgentsMd Middleware** (`AgentsMdMiddleware`)

- Injects AGENTS.md or CLAUDE.md documentation
- Context parameters: `projectRoot`

**MCP Middleware** (`createMCPMiddleware`)

- Integrates with Model Context Protocol servers
- Context parameters: `configProvider`, `cache`

**Anthropic Prompt Caching** (`anthropicPromptCachingMiddleware`)

- Optimizes Anthropic API usage with prompt caching
- Context parameters: `ttl`, `minMessages`

### Quick Example

```typescript
import { SubAgentsMiddleware, SkillsMiddleware } from '@langgraph-js/standard-agent';

// Register SubAgents middleware
await pkg.addMiddleware({
    id: 'subagents',
    name: 'SubAgents',
    description: 'Task delegation to specialized agents',
});
pkg.middlewares.registerImplementation({
    id: 'subagents',
    name: 'SubAgents',
    description: 'Task delegation',
    execute: async (context) => {
        return new SubAgentsMiddleware({
            agents: context.agents,
            createAgent: context.createAgent,
        });
    },
});

// Use in agent config
await pkg.addAgent({
    id: 'agents/manager',
    name: 'Manager',
    model: 'claude-3-5-sonnet',
    system_prompt: 'prompts/default',
    tools: { read_file: true },
    middleware: {
        subagents: {
            customParams: {
                agents: [{ id: 'research', name: 'Research Agent', description: 'Research expert' }],
                createAgent: async (taskId, args, state) => {
                    return createAgentForTask(args.subagent_id);
                },
            },
        },
    },
});
```

**See [standard-agent-middlewares.md](./standard-agent-middlewares.md)** for:

- Complete documentation for each middleware class
- Constructor parameters and usage examples
- Progressive disclosure pattern explanation
- Best practices and common patterns

## Agent Factory

### Creating Agents from Package

```typescript
import { createAgent, tool } from 'langchain';
import { initChatModel } from './utils/initChatModel';

async function createAgentFromPackage(agentId: string, pkg: AgentPackage, state: any) {
    // Load agent configuration
    const agentConfig = await pkg.getAgent(agentId);
    if (!agentConfig) {
        throw new Error(`Agent not found: ${agentId}`);
    }

    // Validate configuration
    const validation = await pkg.validateAgent(agentId);
    if (!validation.valid) {
        throw new Error(`Invalid agent: ${JSON.stringify(validation.errors)}`);
    }

    // Load prompt
    const promptConfig = await pkg.getPrompt(agentConfig.system_prompt);
    if (!promptConfig) {
        throw new Error(`Prompt not found: ${agentConfig.system_prompt}`);
    }

    // Initialize model
    const model = await initChatModel(agentConfig.model);

    // Build tools from configuration
    const tools = [];
    for (const [toolId, params] of Object.entries(agentConfig.tools)) {
        const toolImpl = pkg.tools.getImplementation(toolId);
        if (!toolImpl || !params) {
            continue;
        }

        // Wrap ToolImplementation as LangChain tool
        const langChainTool = tool(
            async (input) => {
                const result = await toolImpl.execute(input);
                if (result && typeof result === 'object' && 'content' in result) {
                    return result.content;
                }
                return result;
            },
            {
                name: toolImpl.name,
                description: toolImpl.description,
                schema: toolImpl.paramsSchema,
            },
        );

        tools.push(langChainTool);
    }

    // Build middleware from configuration
    const middleware = [];
    for (const [middlewareId, params] of Object.entries(agentConfig.middleware)) {
        const impl = pkg.middlewares.getImplementation(middlewareId);
        if (impl && params) {
            const context = typeof params === 'boolean' ? {} : params.customParams || {};
            middleware.push(await impl.execute(context));
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

### Loading from Storage

```typescript
// Load existing package from storage
const pkg = await AgentPackage.fromStorage(storage);

// This automatically loads and registers:
// - All tool schemas
// - All middleware schemas
// - All model schemas
```

### JSON Import/Export

```typescript
// Export to JSON
const json = await pkg.toJSON();

// Import from JSON
const newPkg = await AgentPackage.loadFromJSON(storage, json);
```

## Best Practices

1. **Use Hierarchical IDs**: `agents/coder`, `agents/reviewer`, `tools/filesystem/read`
2. **Validate Before Use**: Always call `validateAgent()` before creating agents
3. **Register Separately**: Use `addTool()` for storage, `registerImplementation()` for runtime
4. **Type Safety**: Define Zod schemas for all tool/middleware parameters
5. **Error Handling**: Check for null/undefined when getting tools/middleware/agents
6. **Storage Choice**: Use MemoryStorage for dev, implement IStorage for production
7. **Middleware Params**: Use `customParams` for flexible configuration
8. **Progressive Disclosure**: Follow the pattern for skills, memories, subagents
9. **Tool Wrapping**: Handle ToolMessage return type when wrapping LangChain tools

## Common Patterns

### Dynamic Tool Loading

```typescript
async function loadTools(pkg: AgentPackage, agentConfig: any) {
    const tools = [];

    for (const [toolId, params] of Object.entries(agentConfig.tools)) {
        const toolImpl = pkg.tools.getImplementation(toolId);
        if (toolImpl && params) {
            tools.push(
                tool(async (input) => await toolImpl.execute(input), {
                    name: toolImpl.name,
                    description: toolImpl.description,
                    schema: toolImpl.paramsSchema,
                }),
            );
        }
    }

    return tools;
}
```

### Multi-Agent System

```typescript
// Create multiple specialized agents
const coderAgent = await createAgentFromPackage('agents/coder', pkg, state);
const reviewerAgent = await createAgentFromPackage('agents/reviewer', pkg, state);

// Route to appropriate agent
function selectAgent(taskType: string) {
    switch (taskType) {
        case 'code':
            return coderAgent;
        case 'review':
            return reviewerAgent;
        default:
            return coderAgent;
    }
}
```

### Configuration Migration

```typescript
async function migrateConfig(pkg: AgentPackage) {
    const agents = await pkg.listAgents();

    for (const agent of agents) {
        const config = await pkg.getAgent(agent.id);

        // Remove deprecated tool
        if ('old_tool' in config.tools) {
            delete config.tools.old_tool;
            await pkg.repository.updateAgent(config);
        }

        // Add new middleware
        if (!config.middleware['new-middleware']) {
            config.middleware['new-middleware'] = true;
            await pkg.repository.updateAgent(config);
        }
    }
}
```

## Installation

```bash
npm install @langgraph-js/standard-agent langchain @langchain/core @langchain/langgraph zod
```

## Resources

- [LangChain TypeScript](https://js.langchain.com/)
- [@langgraph-js Documentation](https://langchain-ai.github.io/langgraph/)
- [Main Skill](./SKILL.md) - Core LangGraph development guide
- [Middleware Guide](./middleware.md) - Comprehensive middleware patterns
