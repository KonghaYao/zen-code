# Migration to @langgraph-js/agent-middlewares

## Overview

Successfully migrated tool implementations from `@codegraph/agent` to `@langgraph-js/agent-middlewares` library,
eliminating code duplication and enabling better code reuse.

**Key Architecture Change**: Middleware-based tool loading - tools are now provided by middlewares instead of being
explicitly registered in the tool registry.

## Changes Made

### 1. Middleware Registration (`packages/agent/src/subagents/middlewares.ts`)

Added middleware registration for agent-middlewares:

```typescript
import { FilesystemMiddleware, TerminalMiddleware } from '@langgraph-js/agent-middlewares';

export async function createMiddlewareRegistry(pkg: AgentPackage) {
    // FilesystemMiddleware from agent-middlewares
    const filesystem = {
        id: 'filesystem',
        name: 'filesystem',
        description: 'File and directory operations (read, write, search, glob)',
        execute: async () => new FilesystemMiddleware(),
    };
    await pkg.addMiddleware(filesystem);
    pkg.middlewares.registerImplementation(filesystem);

    // TerminalMiddleware from agent-middlewares
    const terminal = {
        id: 'terminal',
        name: 'terminal',
        description: 'Terminal command execution (Bash/CMD, background processes)',
        execute: async () => new TerminalMiddleware(),
    };
    await pkg.addMiddleware(terminal);
    pkg.middlewares.registerImplementation(terminal);

    // ... existing middlewares (subagents, memories, skills, agents_md)
}
```

### 2. Agent Configuration (`packages/agent/src/subagents/loader.ts`)

Updated agent configuration to use middleware instead of tools:

**Before:**

```typescript
await pkg.addAgent({
    id: 'agents/default',
    tools: {
        read_file: true,
        write_file: true,
        edit_file: true,
        glob_files: true,
        search_files_rg: true,
        folder_operations: true,
        terminal: true,
        ask_user_questions: true,
        todo_write: true,
    },
    middleware: {
        agents_md: true,
        skills: true,
        memories: true,
        subagents: true,
    },
});
```

**After:**

```typescript
await pkg.addAgent({
    id: 'agents/default',
    tools: {
        // Only project-specific tools registered here
        ask_user_questions: true,
        todo_write: true,
    },
    middleware: {
        // Generic tools provided by middlewares
        filesystem: true,
        terminal: true,
        agents_md: true,
        skills: true,
        memories: true,
        subagents: true,
    },
});
```

### 3. Tool Collection (`packages/agent/src/subagents/factory-v2.ts`)

Updated factory to collect tools from middlewares:

```typescript
// Build middleware chain and collect tools from middlewares
const middleware: AgentMiddleware[] = [];

// First, execute configured middlewares to collect their tools
const middlewareTools: DynamicStructuredTool[] = [];
for (const [middlewareId, params] of Object.entries(agentConfig.middleware)) {
    // ... skip subagents middleware for subagents

    const middlewareImpl = pkg.middlewares.getImplementation(middlewareId);
    const middlewareInstance = await middlewareImpl.execute(params.customParams || {});

    // Collect tools from middleware
    if (middlewareInstance.tools && Array.isArray(middlewareInstance.tools)) {
        for (const middlewareTool of middlewareInstance.tools) {
            const langChainTool = tool(
                async (input) => {
                    const result = await middlewareTool.invoke(input);
                    if (result && typeof result === 'object' && 'content' in result) {
                        return (result as any).content;
                    }
                    return result;
                },
                {
                    name: middlewareTool.name,
                    description: middlewareTool.description,
                    schema: middlewareTool.schema as any,
                },
            );
            middlewareTools.push(langChainTool as any as DynamicStructuredTool);
        }
    }

    middleware.push(middlewareInstance);
}

// Combine middleware tools + tool registry tools
const tools: DynamicStructuredTool[] = [...middlewareTools];
```

### 4. Tool Registry Simplification (`packages/agent/src/subagents/tools.ts`)

Removed agent-middlewares tools from tool registry:

**Before:**

```typescript
import { FilesystemMiddleware, TerminalMiddleware } from '@langgraph-js/agent-middlewares';

const filesystemMiddleware = new FilesystemMiddleware();
const terminalMiddleware = new TerminalMiddleware();

const ALL_TOOLS = [
    ask_user_questions_tool,
    todo_write_tool,
    ...filesystemMiddleware.tools, // ❌ Removed
    ...terminalMiddleware.tools, // ❌ Removed
];
```

**After:**

```typescript
// Only local project-specific tools need to be registered
// Tools from agent-middlewares are automatically provided by their middlewares
const ALL_TOOLS = [ask_user_questions_tool, todo_write_tool];
```

### 5. Deleted Directories

Removed redundant tool implementations:

- ❌ `packages/agent/src/tools/bash_tools/` (entire directory)
- ❌ `packages/agent/src/tools/filesystem_tools/` (entire directory)

### 6. Zen-Code UI Changes

Updated all UI tool imports to use the new library:

#### `zen-code/src/chat/tools/folder_operations.tsx`

```typescript
import { folder_tool } from '@langgraph-js/agent-middlewares';
```

#### `zen-code/src/chat/tools/replace_in_file.tsx`

```typescript
import { replace_tool } from '@langgraph-js/agent-middlewares';
const editToolSchema = replace_tool.schema;
```

#### `zen-code/src/chat/tools/glob_files.tsx`

```typescript
import { glob_tool } from '@langgraph-js/agent-middlewares';
const globToolSchema = glob_tool.schema;
```

#### `zen-code/src/chat/tools/read_file.tsx`

```typescript
import { read_tool } from '@langgraph-js/agent-middlewares';
const readFileSchema = read_tool.schema;
```

## Architecture Benefits

### 1. **Clear Separation of Concerns**

- **Middleware layer**: Provides generic, reusable capabilities (filesystem, terminal)
- **Tool registry**: Only contains project-specific tools (ask_user_questions, todo_write)

### 2. **Middleware-Based Tool Loading**

- Tools are automatically collected from middleware instances
- No need to explicitly register generic tools in the tool registry
- Cleaner agent configuration

### 3. **Code Reuse**

- Tools imported from `@langgraph-js/agent-middlewares` library
- Eliminated ~2500+ lines of duplicate code

### 4. **Better Maintainability**

- Single source of truth for tool implementations
- Middleware-level abstraction for tool grouping

### 5. **Type Safety**

- Full TypeScript support through library exports
- Middleware interface ensures consistency

## Tool Categorization

### From @langgraph-js/agent-middlewares (via Middleware)

These tools are provided by middlewares and automatically loaded:

**FilesystemMiddleware:**

- `read_file` - Read file contents
- `write_file` - Write content to files
- `replace_tool` - Perform exact string replacements
- `glob_tool` - Find files by name patterns
- `grep_tool` - Fast text search using ripgrep
- `folder_tool` - Folder operations (create, list, exists)

**TerminalMiddleware:**

- `bash_tool` - Terminal command execution (Bash/CMD)

### From @codegraph/agent (via Tool Registry)

These tools are project-specific and remain in the local tool registry:

- `ask_user_questions.ts` - Project-specific user interaction tool
- `task_tools/todo_tool.ts` - Task management specific to CodeGraph

## Dependency Management

**Before:**

```json
{
  "dependencies": {
    "execa": "^9.6.1",      // ❌ Not needed (handled by agent-middlewares)
    "glob": "^11.1.0",       // ❌ Not needed (handled by agent-middlewares)
    ...
  }
}
```

**After:**

```json
{
  "dependencies": {
    "@langgraph-js/agent-middlewares": "workspace:^",  // ✅ All dependencies included here
    ...
  }
}
```

## Verification

All builds pass successfully:

```bash
bun run build  # Successfully builds all packages
```

No remaining references to deleted directories found in codebase.

## Migration Summary

| Aspect                 | Before                      | After                              |
| ---------------------- | --------------------------- | ---------------------------------- |
| Tool Loading           | Explicit tool registration  | Automatic from middleware          |
| Generic Tools          | Registered in tool registry | Provided by middleware             |
| Project-Specific Tools | Mixed with generic          | Separate in tool registry          |
| Code Duplication       | ~2500+ lines duplicated     | Single source in agent-middlewares |
| Configuration          | verbose tool lists          | Clean middleware declarations      |

## Future Work

Consider migrating remaining project-specific tools to agent-middlewares if they become generic enough for reuse across
projects.
