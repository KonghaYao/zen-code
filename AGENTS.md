# Repository Guidelines

Monorepo: LangGraph backend (`packages/agent/`) + Config system (`packages/config/`) + Clients (`zen-code/`, `zen-worker/`)

## Project Structure

```
code-graph/
├── packages/              # Monorepo packages
│   ├── agent/            # LangGraph backend core
│   │   ├── src/
│   │   │   ├── middlewares/    # skills, subagents, memories, MCP, cache
│   │   │   ├── tools/          # filesystem, bash, memory, task
│   │   │   ├── subagents/      # config, factory
│   │   │   ├── prompts/        # System prompts
│   │   │   ├── mcp/            # MCP integration
│   │   │   ├── skills/         # Skills loading
│   │   │   ├── memories/       # Memory analysis
│   │   │   ├── state.ts        # Shared state schema
│   │   │   ├── graphBuilder.ts # Graph construction
│   │   │   └── server.ts       # LangGraph server (port 8123)
│   │   └── package.json
│   ├── config/           # Configuration system
│   │   └── src/
│   │       ├── interfaces/     # Config interfaces
│   │       ├── implementations/ # Local/Remote implementations
│   │       └── types/          # Type definitions
│   └── union-client/      # Shared client logic
├── zen-code/             # TUI CLI tool
│   └── src/
│       ├── chat/         # Command system, store, tools
│       ├── store/        # LowDB persistence
│       └── cli.ts        # TUI entry point
├── zen-worker/           # Web UI worker
├── .claude/
│   ├── skills/           # Project-level skills
│   └── memories/         # Project-level memories
├── specs/                # Feature documentation
└── .langgraph_api/       # Runtime data (SQLite)
```

## Development Commands

```bash
# Backend (LangGraph Server)
bun run dev:server          # LangGraph server (8123)

# Frontend Clients
bun run dev:tui             # TUI app
bun run dev:web             # Web UI worker
bun run dev:all             # Server + Web in parallel

# Build
pnpm build                  # Build all packages
pnpm build:packages         # Build packages only
pnpm build:zen-code         # Build TUI only

# Dependencies
pnpm install                # Root (all packages)
```

## Configuration

**User Config**: `~/.zen-code/settings.json` (managed by LowDB)

```json
{
  "main_model": "qwen-plus",
  "model_provider": "openai",
  "openai_api_key": "sk-...",
  "openai_base_url": "https://api.openai.com/v1",
  "anthropic_api_key": "sk-ant-...",
  "enable_thinking": true,
  "mcp_config": { "filesystem": {...} }
}
```

**Config System** (`packages/config/`):
- **FileSystemConfigStore**: LowDB-based persistence at `~/.zen-code/settings.json`
- **ConfigManager**: Unified config access with auto-sync to environment variables
- **ConfigServer**: Hono-based REST API for remote config management
- Auto-syncs to `process.env`: `MODEL_PROVIDER`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.

**Environment** (can override config):

```bash
MODEL_PROVIDER=openai|anthropic
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
YOLO_MODE=true              # Disable HITL (dangerous)
```

**Project Config**: `.zen-code/config.json` (optional, overrides user settings)

## Architecture

### Graph System

**Dynamic Agent Routing** via `switch_command`:

```typescript
// packages/agent/src/graphBuilder.ts
const graph = new StateGraph(CodeState)
    .addNode('graph', async (state, runtime) => {
        const { switch_command: cmd } = state;

        // Route to different agents based on cmd
        if (cmd === 'smart_memory') return switchBranch.smart_memory(state);

        const configs = agentConfigs || (await loadAgentsList());
        agentConfigs ??= configs;

        const agentId = cmd || getDefaultAgentId(); // 'default' if not set
        const config = configs[agentId];

        if (!config) {
            throw new Error(
                `Unknown agent: ${agentId}. Available: ${Object.keys(configs).join(', ')}`
            );
        }

        return invokeAgent(config, state, runtime);
    })
    .compile();
```

**Available Branches**:
- `smart_memory` - Analyze conversation and save to `.claude/memories/`
- Agent routing via `switch_command` (currently only 'default' agent available)

**Available Agents** (configured in `subagents/config.ts`):
- `default` - "Jarvis" with full capabilities

**Note**: SubAgentsMiddleware is implemented but no sub-agents are currently registered (the agent Map is empty). The system supports dynamic agent configuration through `AgentConfig`, enabling future addition of specialized agents.

### Middleware System

**Dynamic Composition** (no longer a fixed chain):

```typescript
// packages/agent/src/subagents/factory.ts
export async function createStandardAgent(config: AgentConfig, state, runtime) {
    const model = await initChatModel(state.main_model, {
        modelProvider: process.env.MODEL_PROVIDER || 'openai',
        streamUsage: true,
        enableThinking: state.enable_thinking ?? true,
    });

    // Filter tools based on config
    let tools = config.tools.includes('all')
        ? [...ALL_TOOLS]
        : config.tools
            .map((name) => TOOL_MAP.get(name))
            .filter((t): t is (typeof ALL_TOOLS)[number] => t !== undefined);

    // Build middleware chain based on config
    const middleware: AgentMiddleware[] = [];

    // SubAgents (configurable)
    if (config.middleware.subagents) {
        const subagents = new SubAgentsMiddleware();
        middleware.push(subagents);
    }

    // MemoriesMiddleware (configurable)
    if (config.middleware.memories) {
        middleware.push(new MemoriesMiddleware({
            projectMemoriesDir: './.claude/memories',
        }));
    }

    // SkillsMiddleware (configurable)
    if (config.middleware.skills) {
        middleware.push(new SkillsMiddleware({
            projectSkillsDir: './.claude/skills',
        }));
    }

    // AgentsMdMiddleware (configurable)
    if (config.middleware.agents_md) {
        middleware.push(new AgentsMdMiddleware());
    }

    // CommandSystem (always enabled)
    const commandSystem = new CommandSystemMiddleware();
    const commandTools = [read_tool, glob_tool];
    // Add MCP tools if enabled
    if (config.middleware.mcp) {
        const mcpTools = await MCPManager.getInstance().getAllTools();
        commandTools.push(...mcpTools);
    }
    commandSystem.registerTools(commandTools);
    middleware.push(commandSystem);

    // HITL (always enabled unless YOLO_MODE)
    const interruptOn = { ...ask_user_with_options_config.interruptOn };
    if (process.env.YOLO_MODE !== 'true') {
        Object.assign(interruptOn, {
            terminal: { allowedDecisions: ['approve', 'reject', 'edit'] },
        });
    }
    middleware.push(humanInTheLoopMiddleware({ interruptOn }));

    // Anthropic cache (Anthropic only)
    if (process.env.MODEL_PROVIDER === 'anthropic') {
        middleware.push(anthropicPromptCachingMiddleware());
    }

    // Resolve system prompt
    const systemPrompt =
        typeof config.systemPrompt === 'function'
            ? await config.systemPrompt(state)
            : config.systemPrompt || CORE_SYSTEM_PROMPT;

    return createAgent({
        name: config.name,
        model,
        systemPrompt: systemPrompt + `\n\n${await getEnvInfo(state)}`,
        tools,
        stateSchema: CodeState,
        middleware,
    });
}
```

**Available Middleware**:
- `SubAgentsMiddleware` - Task delegation to specialized sub-agents
- `MemoriesMiddleware` - Progressive disclosure from `.claude/memories/`
- `SkillsMiddleware` - Progressive disclosure from `.claude/skills/`
- `AgentsMdMiddleware` - AGENTS.md loader for project guidelines
- `CommandSystemMiddleware` - Batch command execution + tool listing
- `HumanInTheLoop` - User approval for sensitive operations
- `AnthropicCacheMiddleware` - Prompt caching (Anthropic only)

### Skills System

**Locations**:
- Project skills: `./.claude/skills/`
- User skills: `~/.deepagents/code/skills/`

**Format**:

```yaml
---
name: 'web-research'
description: 'Research latest developments'
---

# Web Research

Instructions...
```

**Progressive Disclosure**:
- Skills are NOT loaded into system prompt by default
- SkillsMiddleware injects them only when relevant
- Each skill has a `name` and `description` for matching

### SubAgent System

**Configuration-Driven**:

```typescript
// packages/agent/src/subagents/config.ts
interface AgentConfig {
    id: string;
    name: string;
    description: string;
    systemPrompt?: string | ((state) => string);
    tools: string[];           // 'all' or specific tool names
    middleware: {
        agents_md?: boolean;
        skills?: boolean;
        memories?: boolean;
        mcp?: boolean;
        subagents?: boolean;
    };
}
```

**Current Agents**:
- `default` - "Jarvis" with full capabilities

**Current Status**:
- Only `default` agent is available ("Jarvis" with full capabilities)
- SubAgentsMiddleware is implemented but no sub-agents are registered (the agent Map is empty)

**Future Extensions**:
- Add specialized agents (finder, planner, reviewer, debugger, etc.) via `AgentConfig`
- Load agent configurations from `~/.zen-code/settings.json`
- Load agent configurations from database
- Remote configuration service

### Memory System

**Trigger**: Manual invocation via `switch_command: 'smart_memory'`

**Storage**: `.langgraph_api/memory.md` (runtime), `.claude/memories/` (persistent)

**Tools**:
- `add_memory_tool` - Store new memory
- `query_memory_tool` - Search existing memories

**Analysis**: `packages/agent/src/memories/analyze.ts`

**Memory Format**: Each memory is a directory with `MEMORY.md` containing:
- YAML frontmatter (name, description, tags, category, priority, etc.)
- Markdown content with detailed explanation and code examples

### Tool System

**Categories**:
- `interaction` - ask_user_with_options (user approval and input)
- `filesystem_tools` - read, write, glob, grep, folder, replace
- `bash_tools` - terminal command execution
- `task_tools` - todo list management (todo_write, add_task, commit_task)
- `memory` - memory storage and retrieval (triggered via smart_memory)

**Command System** (additional capabilities):
- `batch_command` - Execute multiple tools in one call
- `list_available_commands` - Query all available tools at runtime

**Tool Registration**:
- CommandSystem does **not** automatically register all tools
- Tools are manually registered via `commandSystem.registerTools(commandTools)`
- Currently registered tools: `read_tool`, `glob_tool` + MCP tools (if enabled)
- Injects system prompt via `wrapModelCall` to document Command System capabilities

**Implementation Details**:
```typescript
// factory.ts
const commandSystem = new CommandSystemMiddleware();
const commandTools = [read_tool, glob_tool];  // Manually specify tools
if (config.middleware.mcp) {
    const mcpTools = await MCPManager.getInstance().getAllTools();
    commandTools.push(...mcpTools);
}
commandSystem.registerTools(commandTools);  // Register before adding to middleware
middleware.push(commandSystem);
```

**MCP Integration**:
- MCP tools exposed through CommandSystemMiddleware
- MCPManager singleton manages connections and tool caching
- MCP tools are added to commandTools array when enabled
- Configured via `mcp_config` in settings

**Tool Sources**:
- MCP provided tools (added to CommandSystem when enabled)
- System built-in tools (manually registered to CommandSystem: read_tool, glob_tool)
- Other registered tools (available via ALL_TOOLS but not in CommandSystem)

## Coding Standards

- **TypeScript**: Strict mode, `.js` extensions, explicit return types
- **Imports**: Relative imports preferred (`./module` over `../module`)
- **Functions**: Pure functions, async/await, Zod schemas
- **Naming**: PascalCase classes, kebab-case files, `is/has/should` booleans
- **Architecture**: Single responsibility, dependency injection, composition
- **File Structure**: Group by feature (middlewares/, tools/, subagents/)

## Adding Features

### Add New Tool

Tools are organized by functionality in groups (e.g., `filesystem_tools/`, `bash_tools/`, `task_tools/`):

**Current Tool Groups**:
- `filesystem_tools/` - read, write, glob, grep, folder, replace (uses `export *`)
- `bash_tools/` - bash execution (uses `export const bash_tools = [...]`)
- `task_tools/` - todo, add_task, commit_task (uses `export *`)

**Option 1: Add to existing group**

```typescript
// packages/agent/src/tools/filesystem_tools/my_tool.ts
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const my_tool = tool(
    async (input) => ({ result: 'ok' }),
    {
        name: 'my_tool',
        description: 'Does something useful',
        schema: z.object({
            param: z.string().describe('Parameter description'),
        }),
    }
);

// Export in tools/filesystem_tools/index.ts
export * from './my_tool.js';
```

**Option 2: Create new group**

```typescript
// packages/agent/src/tools/my_tools/my_tool.ts
export const my_tool = tool(/* ... */);

// Export in tools/my_tools/index.ts
export * from './my_tool.js';
// Or export array (like bash_tools)
export const my_tools = [my_tool];
```

**Register in factory.ts**:

```typescript
// packages/agent/src/subagents/factory.ts
import { my_tool } from '../tools/filesystem_tools/index.js';
// Or for array exports:
import { my_tools } from '../tools/my_tools/index.js';

const ALL_TOOLS = [
    // ...existing tools
    ask_user_with_options,
    todo_write_tool,
    add_task_tool,
    glob_tool,
    grep_tool,
    read_tool,
    write_tool,
    replace_tool,
    folder_tool,
    ...bash_tools,  // Array spread for bash_tools
    my_tool,        // Add new tool here
    // or for array exports: ...my_tools,
];

// Update TOOL_MAP
const TOOL_MAP = new Map(ALL_TOOLS.map((t) => [t.name, t]));
```

### Add New Middleware

```typescript
// packages/agent/src/middlewares/myMiddleware.ts
import { AgentMiddleware } from 'langchain';

export class MyMiddleware implements AgentMiddleware {
    async wrapModelCall(req, handler) {
        // Pre-process
        const result = await handler({ ...req });
        // Post-process
        return result;
    }
}

// Export from middlewares/index.ts
export { MyMiddleware } from './myMiddleware.js';

// Add to factory.ts
if (config.middleware.my_middleware) {
    middleware.push(new MyMiddleware());
}
```

### Add New SubAgent

```typescript
// packages/agent/src/subagents/config.ts
export async function loadAgentsList(): Promise<Record<string, AgentConfig>> {
    return {
        // ... existing agents
        my_agent: {
            id: 'my_agent',
            name: 'Specialist',
            description: 'Specialized agent for X',
            tools: ['read_tool', 'grep_tool'],  // Specific tools
            middleware: {
                skills: true,
                memories: false,  // Custom middleware config
            },
        },
    };
}
```

### Add New Skill

```bash
# Create skill file
mkdir -p .claude/skills/my-skill
cat > .claude/skills/my-skill/SKILL.md << 'EOF'
---
name: 'my-skill'
description: 'What this skill does'
---

# My Skill

Instructions for using this skill...
EOF
```

## Runtime Data

- **Memory**: `.langgraph_api/memory.md`
- **Database**: `.langgraph_api/langgraph.db` (SQLite)
- **Logs**: Terminal output
- **Config**: `~/.zen-code/settings.json` (user, LowDB), `.zen-code/config.json` (project)

## Security

**User Approval Required** (HITL):
- package.json changes (adding dependencies)
- lint/test/type-check commands
- documentation/test file generation
- service execution
- file writes outside workspace (configurable)

**YOLO Mode**: Set `YOLO_MODE=true` to disable HITL (not recommended)

## Migration Notes (2025 Q1 Refactor)

**From Old Structure** (`agents/code/`):
- Fixed middleware chain → Dynamic agent configuration
- Hardcoded subagents → Config-driven routing
- Single backend package → Monorepo with separate packages
- Mixed concerns → Separated agent/config/client layers

**Key Improvements**:
- Flexible agent specialization via `AgentConfig`
- Separate config system supporting local + remote
- Shared client logic for TUI and Web
- Better separation of concerns
- Easier to add new agents and middleware

**Compatibility**:
- AGENTS.md still loaded by `AgentsMdMiddleware`
- Skills format unchanged (YAML frontmatter + Markdown)
- Memory system unchanged
- MCP integration unchanged
