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
- Agent routing via `switch_command` (e.g., 'default', 'finder', 'planner')

**Available Agents** (configured in `subagents/config.ts`):
- `default` - Full-featured assistant with all tools and middleware
- Future: `finder`, `planner`, `reviewer`, `debugger`, etc.

### Middleware System

**Dynamic Composition** (no longer a fixed chain):

```typescript
// packages/agent/src/subagents/factory.ts
export async function createStandardAgent(config: AgentConfig, state, runtime) {
    const middleware: AgentMiddleware[] = [];
    
    // Add middleware based on config
    if (config.middleware.subagents) middleware.push(new SubAgentsMiddleware());
    if (config.middleware.memories) middleware.push(new MemoriesMiddleware());
    if (config.middleware.skills) middleware.push(new SkillsMiddleware());
    if (config.middleware.agents_md) middleware.push(new AgentsMdMiddleware());
    
    // Command System (always enabled for MCP tools)
    const commandSystem = new CommandSystemMiddleware();
    if (config.middleware.mcp) {
        commandSystem.registerTools(await MCPManager.getInstance().getAllTools());
    }
    middleware.push(commandSystem);
    
    // HITL (always enabled unless YOLO_MODE)
    if (process.env.YOLO_MODE !== 'true') {
        middleware.push(
            humanInTheLoopMiddleware({
                interruptOn: {
                    ...ask_user_with_options_config.interruptOn,
                    terminal: { allowedDecisions: ['approve', 'reject', 'edit'] },
                },
            }),
        );
    }
    
    // Anthropic cache (Anthropic only)
    if (process.env.MODEL_PROVIDER === 'anthropic') {
        middleware.push(anthropicPromptCachingMiddleware());
    }
    
    return createAgent({ model, tools, middleware });
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

**Future Extensions**:
- Load from `~/.zen-code/settings.json`
- Load from database
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
- `filesystem_tools` - read, write, glob, grep, folder operations
- `bash_tools` - terminal command execution
- `memory` - memory storage and retrieval
- `task_tools` - todo list management

**Command System** (additional capabilities):
- `batch_command` - Execute multiple tools in one call
- `list_available_commands` - Query all available tools at runtime

**MCP Integration**:
- MCP tools exposed through CommandSystemMiddleware
- MCPManager singleton manages connections and tool caching
- Configured via `mcp_config` in settings

**Tool Sources**:
- MCP provided tools
- System built-in tools
- Other registered tools

## Coding Standards

- **TypeScript**: Strict mode, `.js` extensions, explicit return types
- **Imports**: Relative imports preferred (`./module` over `../module`)
- **Functions**: Pure functions, async/await, Zod schemas
- **Naming**: PascalCase classes, kebab-case files, `is/has/should` booleans
- **Architecture**: Single responsibility, dependency injection, composition
- **File Structure**: Group by feature (middlewares/, tools/, subagents/)

## Adding Features

### Add New Tool

```typescript
// packages/agent/src/tools/my_tool/index.ts
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

// Export from tools/my_tool/index.ts (not tools/index.ts)

// Register in factory.ts: Import and add to ALL_TOOLS array
import { my_tool } from '../tools/my_tool/index.js';

const ALL_TOOLS = [
    my_tool,
    ...existingTools,
];
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
