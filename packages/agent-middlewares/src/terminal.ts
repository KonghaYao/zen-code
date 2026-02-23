/**
 * Terminal Middleware
 *
 * Provides terminal command execution capabilities with background process management.
 * Supports foreground and background command execution, output retrieval, and process control.
 *
 * ## Available Tools
 *
 * - **terminal**: Execute shell commands (Bash on Linux/macOS, CMD on Windows)
 *   - Run commands in foreground or background
 *   - Retrieve background process output
 *   - Kill background processes
 *   - Cross-platform support with automatic OS detection
 *
 * ## Features
 *
 * - **Persistent shell session**: Commands maintain shell state
 * - **Background process management**: Track and control background processes by ID
 * - **Output filtering**: Regex-based output filtering for background processes
 * - **Cross-platform**: Auto-detects OS and uses appropriate shell (Bash or CMD)
 * - **Timeout handling**: Configurable timeout for commands
 *
 * ## Usage
 *
 * ```typescript
 * import { TerminalMiddleware } from '@langgraph-js/agent-middlewares';
 *
 * const terminalMiddleware = new TerminalMiddleware();
 *
 * const agent = createAgent({
 *   model,
 *   systemPrompt,
 *   tools,
 *   middleware: [terminalMiddleware]
 * });
 * ```
 */

import { AgentMiddleware } from 'langchain';
import { bash_tool } from './tools/bash_tools/bash_tool.js';

/**
 * Middleware that provides terminal and shell execution capabilities.
 *
 * This middleware encapsulates the terminal tool with support for:
 * - Foreground command execution
 * - Background process management
 * - Output retrieval and filtering
 * - Process killing
 *
 * All commands are executed in the current working directory (cwd)
 * stored in the agent state.
 *
 * The middleware maintains a Map of background processes that can be
 * referenced by their process ID for operations like getting output
 * or killing the process.
 *
 * **Platform Support:**
 * - Linux/macOS: Uses `/bin/bash`
 * - Windows: Uses `cmd.exe`
 */
export class TerminalMiddleware implements AgentMiddleware {
    name = 'TerminalMiddleware';

    // No additional context schema needed
    contextSchema = undefined;

    // No state schema modification needed
    stateSchema = undefined;

    // Export terminal tool
    tools = [bash_tool];

    /**
     * Execute method for AgentPackage compatibility
     * Returns self to support initialization without parameters
     */
    async execute(): Promise<this> {
        return this;
    }
}

export type { BaseAgentStateType } from './index.js';
