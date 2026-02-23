/**
 * Filesystem Middleware
 *
 * Encapsulates all filesystem tools for file and directory operations.
 * Provides tools for reading, writing, searching, and managing files.
 *
 * ## Available Tools
 *
 * - **read_file**: Read file contents with optional line limits
 * - **write_file**: Write content to files
 * - **edit_file**: Perform exact string replacements
 * - **glob_files**: Find files by name patterns
 * - **search_files_rg**: Fast text search using ripgrep
 * - **folder_operations**: Create, list, and check folder existence
 *
 * ## Usage
 *
 * ```typescript
 * import { FilesystemMiddleware } from '@langgraph-js/agent-middlewares';
 *
 * const fsMiddleware = new FilesystemMiddleware();
 *
 * const agent = createAgent({
 *   model,
 *   systemPrompt,
 *   tools,
 *   middleware: [fsMiddleware]
 * });
 * ```
 */

import { AgentMiddleware } from 'langchain';
import {
    read_tool,
    write_tool,
    replace_tool,
    glob_tool,
    grep_tool,
    folder_tool,
} from './tools/filesystem_tools/index.js';

/**
 * Middleware that provides filesystem operations capabilities.
 *
 * This middleware encapsulates all filesystem-related tools:
 * - File I/O: read, write, edit
 * - File search: glob, grep
 * - Folder operations: create, list, exists
 *
 * All paths are resolved relative to the current working directory (cwd)
 * stored in the agent state, providing flexible path handling.
 */
export class FilesystemMiddleware implements AgentMiddleware {
    name = 'FilesystemMiddleware';

    // No additional context schema needed
    contextSchema = undefined;

    // No state schema modification needed
    stateSchema = undefined;

    // Export all filesystem tools
    tools = [read_tool, write_tool, replace_tool, glob_tool, grep_tool, folder_tool];

    /**
     * Execute method for AgentPackage compatibility
     * Returns self to support initialization without parameters
     */
    async execute(): Promise<this> {
        return this;
    }
}

export type { BaseAgentStateType } from './index.js';
