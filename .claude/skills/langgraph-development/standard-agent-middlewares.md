---
name: standard-agent-middlewares
description:
    Available middleware classes in @langgraph-js/standard-agent. These are LangChain AgentMiddleware implementations
    ready to use directly.
---

# Standard Agent Middlewares

The `@langgraph-js/standard-agent` package provides **production-ready middleware classes** that implement LangChain's
`AgentMiddleware` interface. These can be used directly with `createAgent` without any configuration system.

## Available Middlewares

### 1. MCP Middleware

Integrates with Model Context Protocol (MCP) servers for tool discovery and execution.

```typescript
import { createMCPMiddleware } from '@langgraph-js/standard-agent';

const mcpMiddleware = createMCPMiddleware({
    configProvider: async () => ({
        servers: {
            filesystem: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/directory'],
            },
            // Add more MCP servers...
        },
    }),
    cache: {
        ttl: 300, // Cache tools for 5 minutes
        reconnectDelay: 5000,
    },
});
```

**Parameters:**

- `configProvider`: Async function returning MCP server configuration
- `cache.ttl`: Tool cache TTL in seconds (default: 300)
- `cache.reconnectDelay`: Reconnect delay in ms (default: 5000)

**What it does:**

- Automatically initializes MCP server connections
- Exposes `load_mcp_tools` and `execute_mcp_tool` tools
- Supports batch tool execution
- Graceful handling of missing/unavailable servers

---

### 2. Anthropic Prompt Caching

Optimizes Anthropic API usage by caching prompt prefixes, reducing costs by up to 90%.

```typescript
import { anthropicPromptCachingMiddleware } from '@langgraph-js/standard-agent';

const cachingMiddleware = anthropicPromptCachingMiddleware({
    ttl: '5m', // Cache duration: '5m' or '1h'
    minMessagesToCache: 5, // Minimum messages before caching
    enableCaching: true, // Enable/disable caching
    unsupportedModelBehavior: 'warn', // 'ignore' | 'warn' | 'raise'
});
```

**Parameters:**

- `ttl`: Cache duration - `'5m'` or `'1h'` (default: `'5m'`)
- `minMessagesToCache`: Minimum messages before caching (default: 3)
- `enableCaching`: Master switch (default: true)
- `unsupportedModelBehavior`: How to handle non-Anthropic models (default: 'warn')

**What it does:**

- Automatically adds cache control headers to Anthropic requests
- Caches system prompts and early messages
- Ignores non-Anthropic models gracefully
- Reduces API costs significantly

**When to use:**

- Always when using Anthropic models with long prompts
- When system prompts don't change frequently
- To reduce token usage and costs

---

### 3. AgentsMd Middleware

Injects AGENTS.md or CLAUDE.md project documentation into the system prompt.

```typescript
import { AgentsMdMiddleware } from '@langgraph-js/standard-agent';

const docsMiddleware = new AgentsMdMiddleware({
    projectRoot: '/path/to/project', // Defaults to process.cwd()
});
```

**Parameters:**

- `projectRoot`: Path to project root (default: `process.cwd()`)

**What it does:**

- Loads AGENTS.md or CLAUDE.md from project root
- CLAUDE.md takes precedence if both exist
- Injects documentation into system prompt
- Progressive disclosure - agent knows docs exist and reads when needed

**File locations:**

```
/project-root/
├── AGENTS.md     # Project documentation
└── CLAUDE.md     # Alternative name (takes precedence)
```

**When to use:**

- When your project has AGENTS.md or CLAUDE.md guidelines
- To provide project-specific context to agents

---

### 4. Skills Middleware

Implements progressive disclosure of project and user skills.

```typescript
import { SkillsMiddleware } from '@langgraph-js/standard-agent';

const skillsMiddleware = new SkillsMiddleware({
    skillsDir: '~/.claude/agent-name/skills', // User-level skills
    assistantId: 'agent-name', // For path references
    projectSkillsDir: './.claude/skills', // Project-level skills
});
```

**Parameters:**

- `skillsDir`: Path to user-level skills directory (optional)
- `assistantId`: Agent identifier for path references (optional)
- `projectSkillsDir`: Project-level skills directory (default: `'./.claude/skills'`)

**What it does:**

- Scans skills directories for SKILL.md files
- Parses YAML frontmatter (name, description)
- Injects skills list into system prompt
- Progressive disclosure - agent reads full skill when relevant
- Project skills override user skills

**Directory structure:**

```
~/.claude/agent-name/skills/         # User-level
├── web-research/
│   └── SKILL.md
└── code-review/
    └── SKILL.md

./.claude/skills/                     # Project-level
└── project-specific/
    └── SKILL.md
```

**When to use:**

- When you have skill libraries for specialized tasks
- To provide domain-specific knowledge to agents

---

### 5. SubAgents Middleware

Enables task delegation to specialized subagents with progressive disclosure.

```typescript
import { SubAgentsMiddleware } from '@langgraph-js/standard-agent';

const subAgentsMiddleware = new SubAgentsMiddleware({
    agents: [
        {
            id: 'research',
            name: 'Research Agent',
            description: 'Expert at web research and data gathering',
        },
        {
            id: 'analysis',
            name: 'Analysis Agent',
            description: 'Expert at data analysis and visualization',
        },
        {
            id: 'writing',
            name: 'Writing Agent',
            description: 'Expert at writing and editing content',
        },
    ],
    createAgent: async (taskId, args, parentState) => {
        // Create or retrieve subagent instance
        const subagentId = args.subagent_id;
        return await createSubAgent(subagentId, parentState);
    },
});
```

**Parameters:**

- `agents`: Array of available subagents
- `createAgent`: Factory function to create subagent instances
- `stateSchema`: Optional state schema for task tool
- `contextSchema`: Optional context schema for task tool

**What it does:**

- Adds a `task` tool for delegating work
- Shows available subagents in system prompt
- Manages task state and results
- State isolation between parent and subagents
- Progressive disclosure of subagent capabilities

**When to use:**

- When you have specialized agents for different tasks
- To enable task delegation and parallel processing

---

### 6. Human-in-the-Loop (HITL)

Interrupts agent execution for human approval at specific points.

```typescript
import { humanInTheLoopMiddleware } from '@langgraph-js/standard-agent';

const hitlMiddleware = humanInTheLoopMiddleware({
    interruptOn: {
        write_file: {
            allowedDecisions: ['approve', 'edit'],
            description: '⚠️ File write requires approval',
        },
        terminal: {
            allowedDecisions: ['approve', 'reject', 'edit'],
        },
        read_file: false, // Auto-approve
    },
});
```

**Parameters:**

- `interruptOn[toolName]`: Configuration for each tool
    - `allowedDecisions`: `['approve', 'reject', 'edit', 'respond']`
    - `description`: Custom approval message
    - `argsSchema`: JSON schema for edited arguments
- `descriptionPrefix`: Default prefix for approval messages

**Decision Types:**

- `approve` - Execute as-is
- `reject` - Cancel with feedback
- `edit` - Modify arguments before execution
- `respond` - Provide alternative response

**What it does:**

- Pauses agent execution before tool calls
- Returns `__interrupt__` in response for client handling
- Resumes with approval, edits, or rejection
- Configurable per-tool or global ("terminal")

**When to use:**

- Dangerous operations (file writes, database changes)
- Sensitive actions (API calls, payments)
- Production safeguards
- Interactive workflows

---

## Using Middlewares Directly

All standard-agent middlewares implement LangChain's `AgentMiddleware` interface:

```typescript
import { createAgent } from 'langchain';
import {
    createMCPMiddleware,
    anthropicPromptCachingMiddleware,
    AgentsMdMiddleware,
    SkillsMiddleware,
    SubAgentsMiddleware,
    humanInTheLoopMiddleware,
} from '@langgraph-js/standard-agent';

const model = await initChatModel('claude-3-5-sonnet-20241022');

const agent = createAgent({
    name: 'MyAgent',
    model,
    systemPrompt: 'You are a helpful assistant',
    tools: [],
    middleware: [
        new AgentsMdMiddleware({ projectRoot: process.cwd() }),
        new SkillsMiddleware({ projectSkillsDir: './.claude/skills' }),
        new SubAgentsMiddleware({
            agents: [...],
            createAgent: async (taskId, args, state) => {...},
        }),
        humanInTheLoopMiddleware({
            interruptOn: {
                write_file: { allowedDecisions: ['approve', 'edit'] },
            },
        }),
        anthropicPromptCachingMiddleware({ ttl: '1h' }),
        createMCPMiddleware({ configProvider: async () => ({...}) }),
    ],
});
```

---

## Middleware Properties

All standard-agent middlewares have these common properties:

```typescript
interface AgentMiddleware {
    name: string;              // Middleware identifier
    stateSchema?: ZodType<any;   // Optional state schema
    contextSchema?: ZodType<any>; // Optional context schema
    tools?: any[];               // Tools provided by middleware
    wrapModelCall?(request, handler): Promise<any>; // Request/response interceptor
}
```

---

## Combining Middlewares

You can mix and match middlewares as needed:

```typescript
// Development setup with all features
const devAgent = createAgent({
    name: 'DevAgent',
    model,
    systemPrompt: 'You are a helpful assistant',
    tools: [],
    middleware: [
        new AgentsMdMiddleware(),
        new SkillsMiddleware(),
        new SubAgentsMiddleware({...}),
        anthropicPromptCachingMiddleware(),
        createMCPMiddleware({ configProvider: async () => ({...}) }),
    ],
});

// Production setup - minimal overhead
const prodAgent = createAgent({
    name: 'ProdAgent',
    model,
    systemPrompt: 'You are a helpful assistant',
    tools: [],
    middleware: [
        anthropicPromptCachingMiddleware({ ttl: '1h' }),
    ],
});

// Research specialist
const researchAgent = createAgent({
    name: 'ResearchAgent',
    model,
    systemPrompt: 'You are a research assistant',
    tools: [],
    middleware: [
        new SkillsMiddleware({ projectSkillsDir: './.claude/skills/research' }),
        createMCPMiddleware({
            configProvider: async () => ({
                servers: {
                    brave_search: {...},
                    wikipedia: {...},
                },
            }),
        }),
    ],
});
```

---

## Progressive Disclosure Pattern

Several middlewares (AgentsMd, Skills, SubAgents) follow the **progressive disclosure** pattern:

1. **Discovery Phase**: Middleware injects metadata into system prompt
    - "You have access to these skills: [name, description, path]"
    - "Available subagents: [id, name, description]"

2. **Usage Phase**: Agent reads full content when needed
    - Uses `read_file` tool to load SKILL.md
    - Uses `task` tool to delegate to subagent
    - Uses `read_file` tool to load AGENTS.md

**Benefits:**

- Reduced context size
- Faster initial requests
- Agent discovers capabilities on-demand
- Better token efficiency

---

## Best Practices

### 1. Order Matters

```typescript
middleware: [
    // 1. Documentation first (adds to system prompt)
    new AgentsMdMiddleware(),
    new SkillsMiddleware(),
    new SubAgentsMiddleware({...}),

    // 2. Caching (wraps model calls)
    anthropicPromptCachingMiddleware(),

    // 3. Tool expansion (adds tools)
    createMCPMiddleware({ configProvider: async () => ({...}) }),
]
```

### 2. Environment-Specific Configuration

```typescript
const middlewares = [
    new AgentsMdMiddleware(),
    new SkillsMiddleware(),
];

// Add development-only middleware
if (process.env.NODE_ENV === 'development') {
    middlewares.push(
        createMCPMiddleware({ configProvider: async () => ({...}) })
    );
}

// Add Anthropic caching for Anthropic models only
if (model.includes('claude')) {
    middlewares.push(
        anthropicPromptCachingMiddleware({ ttl: '1h' })
    );
}
```

### 3. Graceful Degradation

```typescript
// MCP middleware works even if no servers configured
const mcpMiddleware = createMCPMiddleware({
    configProvider: async () => {
        // Return null or no servers to disable MCP
        return null;
    },
});
```

### 4. Custom Tool Names

```typescript
const subAgents = new SubAgentsMiddleware({
    agents: [...],
    createAgent: async (taskId, args, state) => {...},
    toolName: 'delegate',           // Custom tool name
    toolDescription: 'Delegate task to specialized agent',
});
```

---

## Integration with AgentPackage (Optional)

While middlewares can be used directly, AgentPackage provides a configuration layer:

```typescript
import { AgentPackage } from '@langgraph-js/standard-agent';

// Register middleware metadata
await pkg.addMiddleware({
    id: 'skills',
    name: 'Skills',
    description: 'Progressive skills disclosure',
});

// Register factory function
pkg.middlewares.registerImplementation({
    id: 'skills',
    name: 'Skills',
    description: 'Progressive skills disclosure',
    execute: async (context) => {
        return new SkillsMiddleware({
            projectSkillsDir: context?.projectSkillsDir || './.claude/skills',
        });
    },
});

// Use in agent config
await pkg.addAgent({
    id: 'agents/coder',
    middleware: {
        skills: { customParams: { projectSkillsDir: './.claude/skills' } },
    },
});
```

**This is optional** - you can use middlewares directly without AgentPackage.

---

## Comparison

### Direct Usage

```typescript
import { SkillsMiddleware } from '@langgraph-js/standard-agent';

const agent = createAgent({
    middleware: [new SkillsMiddleware({ projectSkillsDir: './.claude/skills' })],
});
```

**Pros:**

- Simple and direct
- No configuration overhead
- Type-safe
- Great for simple applications

### Through AgentPackage

```typescript
await pkg.addMiddleware({ id: 'skills', ... });
pkg.middlewares.registerImplementation({...});

await pkg.addAgent({
    middleware: { skills: { customParams: {...} } },
});
```

**Pros:**

- Configuration-driven
- Database-persistable
- Dynamic middleware switching
- Great for complex systems

---

## Resources

- [Standard Agent System](./standard-agent.md) - AgentPackage configuration system
- [Middleware Pattern](./middleware-pattern.md) - Two-stage registration pattern
- [Main Skill](./SKILL.md) - Core LangGraph development guide
