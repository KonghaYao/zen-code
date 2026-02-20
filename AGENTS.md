# Repository Guidelines

Monorepo: LangGraph backend (`packages/agent/`) + Config system (`packages/config/`) + Clients (`zen-code/`,
`zen-worker/`)

## Project Structure

```
code-graph/
├── packages/              # Monorepo packages
│   ├── agent/            # LangGraph backend core
│   ├── config/           # Configuration system
│   ├── ink-pro/          # Shared Ink components (TUI)
│   └── union-client/     # Shared client logic
├── zen-code/             # TUI CLI tool
├── zen-worker/           # Web UI worker
├── .claude/
│   ├── skills/           # Project-level skills
│   └── memories/         # Project-level memories
└── specs/                # Feature documentation
```

**Reference**: See individual package directories for detailed structure

## Development Commands

```bash
# Backend
bun run dev:server          # LangGraph server (port 8123)

# Frontend
bun run dev:tui             # TUI app
bun run dev:web             # Web UI worker
bun run dev:all             # Server + Web in parallel

# Build
bun run build                  # Build all packages
bun run build:packages         # Build packages only
bun run build:zen-code         # Build TUI only
```

## Configuration

**User Config**: `~/.zen-code/settings.json` (LowDB persistence)

**Config System**: `packages/config/src/implementations/FileSystemConfigStore.ts`

**Architecture**:

- FileSystemConfigStore: LowDB-based persistence
- ConfigManager: Unified config access with auto-sync to environment variables
- ConfigServer: Hono-based REST API for remote config management
- Auto-syncs to `process.env`: `MODEL_PROVIDER`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`

**Multi-Provider Architecture**:

- Format: `provider_id` + `model_id` + `providers[]` array
- Automatic migration from legacy format
- Environment variables synced based on current `provider_id`

**Environment Variables** (can override config):

```bash
MODEL_PROVIDER=openai|anthropic
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
YOLO_MODE=true              # Disable HITL (dangerous)
```

**Provider Management**:

- Command: `/provider` opens configuration panel
- UI: `zen-code/src/chat/components/ProviderPanel.tsx`

## State Management

**Core Principle**: Library vs Application Separation

**Architecture**: TanStack Query hooks implemented **only in zen-code application layer**

**Rationale**:

- `packages/` are shared libraries used by other applications
- Minimal impact scope, easy to rollback
- Clear responsibility: libraries provide basic APIs, application handles state management

**Key Files**:

- Hooks: `zen-code/src/chat/hooks/`
- Query keys: `zen-code/src/chat/query-keys.ts`
- Query Client: `zen-code/src/chat/QueryClientProvider.tsx`
- Context: `zen-code/src/chat/context/SettingsContext.tsx`

**Implementation Guidelines**:

1. All TanStack Query hooks must be in `zen-code/src/chat/hooks/`
2. `packages/` provide basic CRUD operations only
3. Import from app layer: `../context/SettingsContext` (not `@codegraph/union-client`)
4. Define query keys in `zen-code/src/chat/query-keys.ts`

**Performance Optimizations**:

- UniversalPanel: Use `useRef` + `useMemo` to stabilize references
- Component: Use `useMemo` + `useCallback` with minimal dependencies
- See: `packages/ink-pro/src/components/Panel/usePanelNavigation.ts`

**Migrated Components**:

- `ModelPanel.tsx`, `TaskPanel.tsx`, `HistoryPanel.tsx`, `KnowledgePanel.tsx`, `ProviderPanel.tsx`

**Available Hooks**:

- `useConfig`, `useUpdateConfig` - Configuration management
- `useSkills`, `useSaveSkill`, `useDeleteSkill` - Skills management
- `useModels` - Model list fetching (30s timeout, retry on network/timeout errors)
- `useTasks`, `useDeleteTask`, `useUpdateTaskStatus` - Task management
- `useHistory` - Chat history queries
- `useKnowledge` - Knowledge base (memories + skills)
- `useProviders` - Providers list queries
- `useAgents` - Agents list queries

## Architecture

### Graph System

**Dynamic Agent Routing** via `switch_command`

**Reference**: `packages/agent/src/graphBuilder.ts`

**Available Branches**:

- `smart_memory` - Analyze conversation and save to `.claude/memories/`
- Agent routing via `switch_command`

**Available Agents** (configured in `subagents/config.ts`):

- `default` - "Jarvis" with full capabilities (code implementation assistant)
- `manager` - Task administrator (task management focus)

**Key Difference**: `default` enables all middleware including MCP, `manager` disables MCP

### Middleware System

**Dynamic Composition** (no longer fixed chain)

**Reference**: `packages/agent/src/subagents/factory-v2.ts`

**Available Middleware**:

- `MCPMiddleware` - Unified MCP server connection and tool execution
- `SubAgentsMiddleware` - Task delegation to specialized sub-agents
- `MemoriesMiddleware` - Progressive disclosure from `.claude/memories/`
- `SkillsMiddleware` - Progressive disclosure from `.claude/skills/`
- `AgentsMdMiddleware` - AGENTS.md loader for project guidelines
- `HumanInTheLoop` - User approval for sensitive operations
- `AnthropicCacheMiddleware` - Prompt caching (Anthropic only)

**Key Features**:

- Dynamic tool and middleware loading via AgentPackage
- Sub-agents don't enable subagents middleware (avoid infinite nesting)
- MCP always enabled as separate middleware
- HITL always enabled unless `YOLO_MODE=true`

### Skills System

**Locations**:

- Project skills: `./.claude/skills/`
- User skills: `~/.claude/code/skills/`

**Format**: YAML frontmatter + Markdown

**Progressive Disclosure**:

- Skills NOT loaded into system prompt by default
- SkillsMiddleware injects them only when relevant
- Each skill has `name` and `description` for matching

**Available Skills**:

- `codebase-exploration` - Deep contextual grep for codebases
- `tanstack-query` - Manage server state in React with TanStack Query v5
- `find-skills` - Discover and install agent skills
- `skill-creator` - Guide for creating effective skills
- `brainstorming` - Must use before any creative work
- `langgraph-development` - Building agents with LangChain/LangGraph
- `tui-development` - Building TUI (Terminal UI) applications
- `crafting-effective-readmes` - Writing or improving README files
- `humanizer` - Remove signs of AI-generated writing from text

### SubAgent System

**Configuration-Driven**

**Reference**: `packages/agent/src/subagents/config.ts`

**Current Agents**:

- `default` - Full capabilities (tools: read, write, glob, grep, terminal, interaction, task; middleware: all)
- `manager` - Task administration (same tools; middleware: agents_md, skills, memories, subagents - **no mcp**)

**Key Differences**:

- `default` agent enables all middleware including MCP
- `manager` agent disables MCP (specialized for task management)

**Future Extensions**:

- Add specialized agents via `AgentConfig`
- Load from `~/.zen-code/settings.json`
- Load from database
- Remote configuration service

### Memory System

**Trigger**: Manual invocation via `switch_command: 'smart_memory'`

**Storage**: `.langgraph_api/memory.md` (runtime), `.claude/memories/` (persistent)

**Tools**:

- `add_memory_tool` - Store new memory
- `query_memory_tool` - Search existing memories
- `/memory-clear` - Organize and clean up memories (merge, remove outdated, improve structure)

**Analysis**: `packages/agent/src/memories/analyze.ts`

**Memory Format**: Directory with `MEMORY.md` (YAML frontmatter + Markdown content)

**Frontmatter Fields**: name, description, tags, category, created, last_updated, priority, context_scope

**Categories**: architecture, workflow, configuration, bug-fix, optimization

**Memory Organization** (Compressed into 3 core files):

```
.claude/memories/
├── core-architecture/MEMORY.md
│   ├── 2025 Q1 Refactor (layered architecture, dependency injection)
│   ├── Standard Agent Module (async storage, entity layer removal)
│   ├── SubAgent System (AgentPackage, factory-v2, switchBranch routing)
│   ├── Task System (2-layer tree, 6-state machine, DAG dependencies)
│   ├── Dynamic Tool Command System (CommandSystemMiddleware)
│   └── Configuration Management (path migration, multi-provider)
├── tui-system/MEMORY.md
│   ├── MultiLineTextInput (desiredColumn cursor, controlled state, cross-platform)
│   ├── UniversalPanel (virtual scroll, fuzzy search, unified interaction)
│   ├── React Performance Optimization (useRef, useMemo, infinite render fix)
│   ├── GlobalApprovalPanel (multi-tab, auto-jump, batch execution)
│   ├── TanStack Query Migration (library vs application separation)
│   └── Ink Static Optimization (lazy initialization pattern)
└── testing-bugfixes/MEMORY.md
    ├── Vitest Complete Guide (monorepo, assertions, test configs)
    ├── Common Test Fix Patterns (API mismatch, default behavior, data validation)
    ├── Bug #1: /sum command parameter passing
    └── Bug #2: Setup Wizard configuration validation
```

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
- Tools manually registered via `commandSystem.registerTools(commandTools)`
- Currently registered: `read_tool`, `glob_tool` + MCP tools (if enabled)

**Reference**: `packages/agent/src/subagents/factory-v2.ts`

**MCP Integration**:

- MCP tools exposed through CommandSystemMiddleware
- MCPManager singleton manages connections and tool caching
- Configured via `mcp_config` in settings

## Coding Standards

- **TypeScript**: Strict mode, `.js` extensions, explicit return types
- **Imports**: Relative imports preferred (`./module` over `../module`)
- **Functions**: Pure functions, async/await, Zod schemas
- **Naming**: PascalCase classes, kebab-case files, `is/has/should` booleans
- **Architecture**: Single responsibility, dependency injection, composition
- **File Structure**: Group by feature (middlewares/, tools/, subagents/)

### ink-pro Package Import Rules

**IMPORTANT**: `useInput` hook must be imported from `ink-pro`, NOT from `ink`.

The `ink-pro` package provides an enhanced `useInput` with additional features:

- Extended key information (including raw keypress object)
- Better cross-platform compatibility
- Custom event handling

**Correct Usage:**

```tsx
// zen-code application (use package name)
import { Box, Text } from 'ink';
import { useInput } from 'ink-pro';

// packages/ink-pro internal (use relative path)
import { Box, Text, useFocus } from 'ink';
import { useInput } from '../../utils/useInput';
```

**Incorrect Usage:**

```tsx
// ❌ WRONG - Do not import useInput from ink
import { Box, Text, useInput } from 'ink';
```

**Reference**: `packages/ink-pro/src/utils/useInput.ts`

## Adding Features

### Add New Tool

**Reference**: `packages/agent/src/tools/`

**Options**:

1. Add to existing group (filesystem_tools/, bash_tools/, task_tools/)
2. Create new group

**Registration**: Register in AgentPackage via `pkg.createTool()`

### Add New Middleware

**Reference**: `packages/agent/src/middlewares/`

**Registration**: Register in AgentPackage via `pkg.createMiddleware()`

### Add New SubAgent

**Reference**: `packages/agent/src/subagents/config.ts`

**Process**:

1. Add agent config to `loadAgentsList()`
2. Register prompt in AgentPackage via `pkg.createPrompt()`
3. Configure tools and middleware

### Add New Skill

**Process**:

```bash
mkdir -p .claude/skills/my-skill
cat > .claude/skills/my-skill/SKILL.md << 'EOF'
---
name: 'my-skill'
description: 'What this skill does'
---

# My Skill

Instructions...
EOF
```

## Runtime Data

- **Memory**: `.langgraph_api/memory.md`
- **Database**: `.langgraph_api/langgraph.db` (SQLite)
- **Logs**: Terminal output
- **Config**: `~/.zen-code/settings.json` (user), `.zen-code/config.json` (project)

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

- Fixed middleware chain → Dynamic agent configuration (AgentPackage + factory-v2)
- Hardcoded subagents → Config-driven routing (switchBranch + AgentConfig)
- Single backend package → Monorepo (agent, config, ink-pro, union-client)
- Mixed concerns → Separated agent/config/client layers

**Key Improvements**:

- Flexible agent specialization via `AgentConfig` and `AgentPackage`
- Separate config system supporting local + remote
- Shared client logic for TUI and Web (union-client)
- Shared Ink components (ink-pro)
- Better separation of concerns
- Easier to add new agents and middleware
- Dynamic tool and middleware loading

**Compatibility**:

- AGENTS.md still loaded by `AgentsMdMiddleware`
- Skills format unchanged (YAML frontmatter + Markdown)
- Memory system unchanged
- MCP integration unchanged
