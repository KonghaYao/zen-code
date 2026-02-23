/**
 * @langgraph-js/agent-middlewares
 *
 * Reusable middleware implementations for LangGraph agents.
 *
 * ## Available Middlewares
 *
 * - **FilesystemMiddleware**: File and directory operations (read, write, search, glob)
 * - **TerminalMiddleware**: Terminal command execution (Bash/CMD, background processes)
 *
 * ## Usage
 *
 * ```typescript
 * import { FilesystemMiddleware, TerminalMiddleware } from '@langgraph-js/agent-middlewares';
 * import { createAgent } from 'langchain';
 *
 * const agent = createAgent({
 *   model,
 *   systemPrompt,
 *   tools: [],
 *   middleware: [
 *     new FilesystemMiddleware(),
 *     new TerminalMiddleware(),
 *   ],
 * });
 * ```
 */

export { FilesystemMiddleware } from './filesystem.js';
export { TerminalMiddleware } from './terminal.js';
export * from './tools/filesystem_tools/index.js';
export * from './tools/bash_tools/index.js';
// Base state type interface - must include cwd field
export type BaseAgentStateType = {
    cwd: string;
    [key: string]: any;
};
