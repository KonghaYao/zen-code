# Repository Guidelines

## Project Structure & Module Organization

This is a **monorepo** with two main components: an AI agent backend and a TUI frontend.

### Root Directory Layout

```
code-graph/
├── agents/code/           # Core agent logic (LangGraph backend)
│   ├── middlewares/       # Middleware plugins (skills, subagents, memory, MCP, cache)
│   ├── prompts/           # System prompts (coding.ts, create_agent_md.ts)
│   ├── skills/            # Skill loader with YAML frontmatter parsing
│   ├── subagents/         # Specialized agents (finder for file search)
│   ├── templates/         # Template files
│   ├── tools/             # Tool implementations
│   ├── utils/             # Utility functions
│   ├── ask_agents.ts      # SubAgent communication protocol
│   ├── export.ts          # Module exports
│   ├── graph.ts           # Main agent graph definition with middleware chain
│   ├── initChatModel.ts   # Chat model initialization
│   ├── server.ts          # LangGraph server entrypoint (port 8123)
│   └── state.ts           # Shared state schema (extends AgentState)
├── tui/                   # Terminal UI frontend (React + Ink)
│   └── src/
│       ├── chat/          # Chat interface logic
│       │   ├── store/     # State management (LowDB)
│       │   ├── commands/  # Command system (/init, /help, /model, /config, /mcp)
│       │   └── tools/     # UI utilities
│       ├── hooks/         # Custom React hooks
│       ├── setup/         # Setup and initialization
│       ├── utils/         # Utility functions
│       ├── app.tsx        # Main TUI application entry
│       ├── index.ts       # Entry point with ripgrep setup
│       └── zen-init.tsx   # Zen initialization UI
├── .deepagents/skills/    # Project-specific skills
├── .langgraph_api/        # Runtime data (SQLite DB, memory)
└── Configuration files: package.json, tsconfig.json, pnpm-workspace.yaml
```

### Backend Module (`agents/code/`)

#### Core Files
- **server.ts**: LangGraph server entrypoint using Hono adapter (port 8123)
- **graph.ts**: Main agent graph with StateGraph, middleware chain, and tool registration
- **state.ts**: Shared state schema extending AgentState with SubAgentStateSchema
- **initChatModel.ts**: Chat model initialization supporting OpenAI and Anthropic providers
- **ask_agents.ts**: SubAgent communication protocol with state management
- **export.ts**: Module exports for external use

#### Directories
- **prompts/**: System prompts
  - `coding.ts`: Main coding assistant prompt with Zen Code persona
  - `create_agent_md.ts`: Agent creation documentation generator

- **middlewares/**: Plugin system implementing AgentMiddleware interface
  - `skills.ts`: Progressive disclosure skills system with YAML frontmatter
  - `subagents.ts`: SubAgent delegation and management
  - `memory.ts`: Conversation memory with summarization (triggers after 10 messages)
  - `mcp.ts`: Model Context Protocol integration
  - `agentsMD.ts`: AGENTS.md/CLAUDE.md documentation loader
  - `anthropicCache.ts`: Anthropic prompt caching optimization

- **subagents/**: Specialized agents for task delegation
  - `finder.ts`: File search and exploration subagent

- **tools/**: Tool implementations organized by category
  - `filesystem_tools/`: read, write, edit, grep, glob
  - `bash_tools/`: terminal command execution with background process support
  - `memory/`: persistent memory storage with vector-based semantic search
  - `task_tools/`: todo management with TodoWrite

- **skills/**: Skill loader utilities
  - `load.ts`: YAML frontmatter parser and skill metadata extraction

- **templates/**: Template files for various purposes
- **utils/**: Utility functions
  - `get_buffer_message.ts`: Message buffer formatting

### Frontend Module (`tui/`)

**Note**: The package name is `zen-code`, directory is `tui/`

#### Core Files
- **src/app.tsx**: Main TUI application entry using Ink render
- **src/index.ts**: Entry point that downloads ripgrep and exports Chat component
- **src/zen-init.tsx**: Zen initialization UI for first-time setup

#### Directories
- **src/chat/**: Chat interface logic
  - `store/`: State management using LowDB
  - `commands/`: Command system (/init, /help, /model, /config, /mcp)
  - `tools/`: UI utilities and helper functions

- **src/hooks/**: Custom React hooks for TUI components
- **src/setup/**: Setup and initialization utilities
- **src/utils/**: Utility functions including ripgrep download

- **dist/**: Built bundle for distribution

### Cross-Module Dependencies

- **Backend → Frontend**: LangGraph SDK for agent communication
- **Frontend → Backend**: HTTP requests to LangGraph server (localhost:8123)
- **Shared**: Configuration via `~/.code-graph.json`

## Build, Test, and Development Commands

### Development Scripts (Root)

```bash
# Backend development
bun run dev:server          # Start LangGraph server on port 8123

# Frontend development
bun run dev                 # Start TUI app (tui/src/app.tsx)
bun run dev:init            # Start zen-init UI
bun run preview:bun         # Preview built TUI with Bun
bun run preview             # Preview built TUI with Node + env file

# Build
cd tui && pnpm build        # Build TUI with Vite
```

### Package Management

```bash
# Root workspace (agents)
pnpm install                # Install all dependencies
pnpm --filter agents add <pkg>  # Add to agents module

# TUI workspace
cd tui && pnpm install      # Install TUI dependencies
```

### Configuration Files

- **tsconfig.json**: TypeScript strict mode, includes agents/ and tui/
  - JSX: react-jsx transform
  - Module resolution: bundler mode
  - Strict mode enabled with comprehensive checks

- **pnpm-workspace.yaml**: Monorepo workspace configuration
  - Packages: `tui/**`, `agents/**`
  - OnlyBuiltDependencies: esbuild

- **package.json**: Root dependencies
  - Core: @langchain/_, @langgraph/_, langchain
  - Anthropic: @anthropic-ai/sdk, @langchain/anthropic
  - MCP: @langchain/mcp-adapters
  - Utils: execa, glob, uuid, yaml, zod

- **tui/package.json**: Frontend dependencies
  - UI: ink, react, @inkjs/ui
  - LangGraph: @langgraph-js/sdk, @langgraph-js/pure-graph
  - Utils: chalk, execa, fs-extra, lowdb, marked, openai
  - Dev: vite, @vitejs/plugin-react, typescript

## Coding Style & Naming Conventions

### TypeScript Standards

- **Strict mode**: Enabled in tsconfig.json
  - noImplicitReturns, noFallthroughCasesInSwitch
  - noUnusedLocals, noUnusedParameters
  - strict: true

- **Imports**:
  - Use `.js` extensions for TypeScript imports (ESM mode)
  - Relative paths preferred: `./module` over `../module`
  - Avoid circular dependencies

- **Functions**:
  - Pure functions preferred
  - async/await pattern for async operations
  - Explicit return types for exported functions

- **Error handling**:
  - Explicit types for errors
  - No silent failures
  - Use Result/Either patterns when appropriate

- **Types**: Use Zod schemas for runtime validation

### Naming Patterns

- **Variables**: Descriptive names (avoid abbreviations)
- **Booleans**: `is*`, `has*`, `should*` prefixes
- **Events**: `handle*`, `on*` prefixes
- **Classes**: PascalCase
- **Files**: kebab-case for .ts/.tsx files
- **Constants**: UPPER_SNAKE_CASE

### Code Organization

- **Single responsibility**: Each function/module does one thing
- **Dependency injection**: Avoid global state
- **Configuration externalization**: Use environment variables or config files
- **Composition over inheritance**: Use function composition and hooks
- **Separation of concerns**: Business logic, UI, data access分层

### Python-style Conventions (for TypeScript)

- **Relative imports**: Use `./module` not `../module` when possible
- **Type annotations**: Explicit return types for exported functions
- **Module structure**: Clear separation of concerns

## Testing Guidelines

### Test Strategy

- **Unit tests**: Individual tool functions (not yet implemented)
- **Integration tests**: Complete workflow testing (manual)
- **Manual testing**: TUI interaction testing

### Test Commands

```bash
# No explicit test scripts defined, use manual verification:
# 1. Start backend: bun run dev:server
# 2. Start frontend: bun run dev
# 3. Test tools: Use /init, /model, /config commands
# 4. Verify memory: Check .langgraph_api/memory.md
```

### Verification Checklist

- [ ] New tools registered in graph.ts
- [ ] Middleware execution order correct
- [ ] Skills parsed correctly
- [ ] SubAgents receive/return data properly
- [ ] Memory system triggers after 10 messages
- [ ] MCP config injects tools correctly

## Architecture & Systems

### Model Provider Support

The system supports two model providers via `MODEL_PROVIDER` environment variable:

#### OpenAI (Default)
```bash
MODEL_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
```

#### Anthropic
```bash
MODEL_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

**Anthropic Features**:
- Thinking mode enabled (budget_tokens: 1024)
- Prompt caching via `anthropicCache.ts` middleware
- Extended context support

### Middleware Chain

Middleware executes in order (defined in `graph.ts`):

1. **SubAgentsMiddleware**: Delegation system
2. **AgentsMdMiddleware**: Project documentation loader
3. **SkillsMiddleware**: Progressive disclosure skills
4. **MCPMiddleware**: Model Context Protocol tools
5. **HumanInTheLoop**: User approval for sensitive operations
6. **AnthropicCacheMiddleware**: Prompt caching (Anthropic only)

### Skills System

**Progressive Disclosure Pattern**:
- Load skill metadata (name + description) from YAML frontmatter
- Inject skills list into system prompt for discoverability
- Agent reads full SKILL.md when relevant to a task

**Skill Locations**:
- User-level: `~/.deepagents/{AGENT_NAME}/skills/`
- Project-level: `{PROJECT_ROOT}/.deepagents/skills/` (overrides user skills)

**Skill Structure**:
```
skill-name/
├── SKILL.md          # Required: YAML frontmatter + instructions
└── helper.py         # Optional: supporting files
```

**SKILL.md Format**:
```yaml
---
name: "web-research"
description: "Research latest developments using web search"
---

# Web Research Skill

Instructions for using this skill...
```

### SubAgent System

**Communication Protocol** (defined in `ask_agents.ts`):
- State isolation via `task_store` map
- Message passing between parent and child agents
- Optional `data_transfer` for context sharing

**Available SubAgents**:
- **finder**: File search and exploration
  - Uses read, glob, grep, bash tools
  - No write/edit capabilities (safe exploration)

**Usage Pattern**:
```typescript
ask_subagents(tool, {
  name: 'ask_subagents',
  description: 'Delegate specialized tasks to subagents',
})
```

### Memory System

**Summarization Trigger**: After 10 messages in conversation

**Storage**:
- Vector-based semantic search
- Persistent storage in `.langgraph_api/`
- Human-readable memory.md format

**Memory Entry Structure**:
```typescript
{
  content: string;        // Memory content
  keywords: string[];     // Search keywords
  timestamp: string;      // ISO timestamp
  category?: string;      // Optional category
}
```

**Memory Tools**:
- `add_memory_tool`: Store new memory entries
- `query_memory_tool`: Search existing memories

### MCP Integration

**Configuration** (in `~/.code-graph.json`):
```json
{
  "mcp_config": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    }
  }
}
```

**Features**:
- Multi-server support
- Automatic tool injection
- Prefix tool names with server name (optional)

## Development Workflow

### Adding New Tools

1. Create tool in appropriate `tools/` subdirectory
2. Export from `tools/index.ts`
3. Import in `graph.ts` and add to `allTools` array
4. Update tool description with usage examples
5. Test with manual TUI interaction

**Example**:
```typescript
// agents/code/tools/my_tools/my_tool.ts
import { tool } from 'langchain';
import { z } from 'zod';

export const my_tool = tool(
  async (input, config) => {
    // Tool implementation
    return { result: 'success' };
  },
  {
    name: 'my_tool',
    description: 'Does something useful',
    schema: z.object({
      param: z.string().describe('Parameter description'),
    }),
  }
);
```

### Adding Middleware

1. Create middleware in `middlewares/`
2. Implement `wrapModelCall` method
3. Add to `middleware` array in `graph.ts` (order matters!)
4. Update system prompt if needed
5. Test execution order

**Example**:
```typescript
// agents/code/middlewares/my_middleware.ts
import { AgentMiddleware } from 'langchain';
import { AIMessage, SystemMessage } from '@langchain/core/messages';

export class MyMiddleware implements AgentMiddleware {
  name = 'MyMiddleware';
  stateSchema = undefined;
  contextSchema = undefined;
  tools = [];

  async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
    // Modify request before model call
    const modifiedRequest = {
      ...request,
      systemMessage: new SystemMessage('Additional system prompt'),
    };

    // Call handler and optionally modify response
    return await handler(modifiedRequest);
  }
}
```

### Adding SubAgents

1. Create agent factory in `subagents/`
2. Register in `SubAgentsMiddleware` via `addSubAgents`
3. Update `ask_subagents` tool description
4. Test delegation workflow

**Example**:
```typescript
// agents/code/subagents/my_subagent.ts
import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { SubAgentCreator } from '../middlewares/subagents.js';

export const create_my_subagent: SubAgentCreator = async (taskId, args, state) => {
  const model = new ChatOpenAI({ model: state.main_model });
  
  const agent = createAgent({
    name: `subagent_${taskId}`,
    model,
    systemPrompt: 'You are a specialized agent',
    tools: [/* specialized tools */],
    stateSchema: CodeState,
    middleware: [/* specialized middleware */],
  });

  return agent;
};
```

### Adding Skills

1. Create skill directory in `.deepagents/skills/`
2. Write `SKILL.md` with YAML frontmatter
3. Skills auto-load via `SkillsMiddleware`
4. Test progressive disclosure pattern

**Example SKILL.md**:
```markdown
---
name: "code-review"
description: "Review code for best practices and potential issues"
---

# Code Review Skill

## Review Checklist

1. **Code Quality**: Check for clean, readable code
2. **Type Safety**: Verify type annotations
3. **Error Handling**: Ensure proper error handling
4. **Performance**: Identify potential bottlenecks

## Process

1. Read the target file
2. Apply review checklist
3. Provide specific, actionable feedback
4. Suggest improvements with examples
```

## Runtime & Configuration

### Configuration File

**Location**: `~/.code-graph.json` (user home directory)

**Format**:
```json
{
  "main_model": "qwen-plus",
  "openai_api_key": "sk-...",
  "openai_base_url": "https://api.openai.com/v1",
  "mcp_config": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"]
    }
  },
  "stream_refresh_interval": 100
}
```

### Environment Variables

```bash
# Model Provider
MODEL_PROVIDER=openai|anthropic

# OpenAI Configuration
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-your-key

# Database
SQLITE_DATABASE_URL=./.langgraph_api/langgraph.db
```

### Runtime Data

- **Memory**: `.langgraph_api/memory.md` (human-readable)
- **Database**: `.langgraph_api/langgraph.db` (SQLite)
- **Logs**: Check terminal output for middleware execution

## Security & Authorization

### Required User Approval

- Adding dependencies to package.json
- Running lint/test/type-check commands
- Creating/modifying documentation files
- Creating/modifying test code
- Starting services or executing code

### Forbidden Actions

- Writing malicious code