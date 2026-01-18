# Repository Guidelines

Monorepo: LangGraph backend (`agents/code/`) + TUI frontend (`tui/`)

## Project Structure

```
code-graph/
├── specs/                 # feature docs
├── agents/code/           # Backend (LangGraph)
│   ├── middlewares/       # skills, subagents, memory, MCP, cache
│   ├── prompts/           # System prompts
│   ├── subagents/         # finder (file search)
│   ├── tools/             # filesystem, bash, memory, task
│   ├── graph.ts           # Main graph with middleware chain
│   ├── server.ts          # LangGraph server (port 8123)
│   └── state.ts           # Shared state schema
├── tui/src/               # Frontend (React + Ink)
│   ├── chat/              # Command system, store, tools
│   ├── app.tsx            # TUI entry
│   └── index.ts           # Ripgrep setup
├── .deepagents/skills/    # Project skills
└── .langgraph_api/        # Runtime data (SQLite)
```

## Development Commands

```bash
# Backend
bun run dev:server          # LangGraph server (8123)

# Frontend
bun run dev                 # TUI app
bun run dev:init            # Zen init UI
cd tui && pnpm build        # Build

# Dependencies
pnpm install                # Root
cd tui && pnpm install      # TUI
```

## Configuration

**Config**: `~/.code-graph.json`

```json
{
  "main_model": "qwen-plus",
  "openai_api_key": "sk-...",
  "openai_base_url": "https://api.openai.com/v1",
  "enable_thinking": true,
  "mcp_config": { "filesystem": {...} }
}
```

**Environment**:

```bash
MODEL_PROVIDER=openai|anthropic
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

## Architecture

### Middleware Chain (execution order)

1. SubAgentsMiddleware - Delegation
2. AgentsMdMiddleware - AGENTS.md loader
3. SkillsMiddleware - Progressive disclosure
4. MCPMiddleware - MCP tools
5. HumanInTheLoop - User approval
6. AnthropicCacheMiddleware - Prompt caching (Anthropic)

### Skills System

**Locations**: `~/.deepagents/code/skills/`, `./.deepagents/skills/` **Format**:

```yaml
---
name: 'web-research'
description: 'Research latest developments'
---
# Web Research
Instructions...
```

### SubAgents

**finder**: File search (read, glob, grep, bash)

### Memory System

-   Trigger: Summarize after 10 messages
-   Storage: `.langgraph_api/memory.md`
-   Tools: `add_memory_tool`, `query_memory_tool`

## Coding Standards

-   **TypeScript**: Strict mode, `.js` extensions, explicit return types
-   **Imports**: `./module` preferred, avoid `../module`
-   **Functions**: Pure, async/await, Zod schemas
-   **Naming**: PascalCase classes, kebab-case files, `is/has/should` booleans
-   **Architecture**: Single responsibility, dependency injection, composition

## Adding Features

### Tool

```typescript
// agents/code/tools/my_tool.ts
export const my_tool = tool(async (input) => ({ result: 'ok' }), {
    name: 'my_tool',
    description: '...',
    schema: z.object({ param: z.string() }),
});
// → Register in graph.ts
```

### Middleware

```typescript
export class MyMiddleware implements AgentMiddleware {
    async wrapModelCall(req, handler) {
        return await handler({ ...req /* modify */ });
    }
}
// → Add to middleware array in graph.ts
```

### SubAgent

```typescript
export const create_my_subagent: SubAgentCreator = async (taskId, args, state) => {
  return createAgent({ name: `subagent_${taskId}`, model, ... });
};
// → Register in SubAgentsMiddleware
```

## Runtime Data

-   **Memory**: `.langgraph_api/memory.md`
-   **Database**: `.langgraph_api/langgraph.db`
-   **Logs**: Terminal output

## Security

User approval required for:

-   package.json changes
-   lint/test/type-check commands
-   documentation/test changes
-   service execution
