# @langgraph-js/agent-middlewares

Reusable middleware implementations for LangGraph agents.

## Installation

```bash
bun add @langgraph-js/agent-middlewares
```

## Available Middlewares

### FilesystemMiddleware

Provides file and directory operations:

- `read_file` - Read file contents with optional line limits
- `write_file` - Write content to files
- `edit_file` - Perform exact string replacements
- `glob_files` - Find files by name patterns
- `search_files_rg` - Fast text search using ripgrep
- `folder_operations` - Create, list, and check folder existence

All paths are resolved relative to the `cwd` field in agent state.

```typescript
import { FilesystemMiddleware } from '@langgraph-js/agent-middlewares';

const fsMiddleware = new FilesystemMiddleware();
```

### TerminalMiddleware

Provides terminal command execution with background process management:

- `terminal` - Execute shell commands (Bash on Linux/macOS, CMD on Windows)
    - Run commands in foreground or background
    - Retrieve background process output
    - Kill background processes
    - Cross-platform support with automatic OS detection

```typescript
import { TerminalMiddleware } from '@langgraph-js/agent-middlewares';

const terminalMiddleware = new TerminalMiddleware();
```

## Usage

### With createAgent

```typescript
import { createAgent } from '@langgraph-js/standard-agent';
import { FilesystemMiddleware, TerminalMiddleware } from '@langgraph-js/agent-middlewares';

const agent = createAgent({
    model,
    systemPrompt,
    tools: [],
    middleware: [new FilesystemMiddleware(), new TerminalMiddleware()],
});
```

### With AgentPackage

```typescript
import { AgentPackage } from '@langgraph-js/standard-agent';
import { FilesystemMiddleware } from '@langgraph-js/agent-middlewares';

const pkg = new AgentPackage(storage);

// Register middleware implementation
pkg.middlewares.registerImplementation({
    id: 'filesystem',
    name: 'filesystem',
    description: 'Filesystem operations',
    execute: async () => new FilesystemMiddleware(),
});

// Create agent config
const agentConfig = {
    name: 'my-agent',
    description: 'Agent with filesystem capabilities',
    systemPrompt: '...',
    tools: [],
    middleware: ['filesystem'], // Reference by ID
};

await pkg.addAgent(agentConfig);
```

## State Requirements

Both middlewares require agent state to have a `cwd` field for path resolution:

```typescript
import { BaseAgentStateType, BaseAgentStateSchema } from '@langgraph-js/agent-middlewares';

// Extend your state schema
const MyStateSchema = BaseAgentStateSchema.extend({
    // Add your custom fields
    customField: z.string(),
});

// Or use the type directly
type MyState = BaseAgentStateType & {
    customField: string;
};
```

## Dependencies

This package has the following runtime dependencies:

- `@langchain/core` - LangChain core types
- `@langgraph-js/standard-agent` - Agent system
- `zod` - Schema validation
- `execa` - Process execution
- `glob` - File pattern matching
- `extract-zip` - ZIP extraction (for ripgrep)
- `fs-extra` - File system utilities
- `path-exists` - Path checking
- `tempy` - Temporary file creation
- `xdg-basedir` - XDG directory paths

## License

MIT
