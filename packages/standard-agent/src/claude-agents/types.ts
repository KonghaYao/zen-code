/**
 * Claude Agent Configuration Types
 *
 * Compatible with Claude Code's agent declaration format
 * Uses YAML frontmatter + Markdown for Agent.md files
 */

/**
 * Permission modes for agent execution
 */
export type PermissionMode = 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions' | 'plan';

/**
 * Model selection options
 */
export type ClaudeModel = 'sonnet' | 'opus' | 'haiku' | 'inherit';

/**
 * Memory scope options
 */
export type MemoryScope = 'user' | 'project' | 'local';

/**
 * Hook configuration for lifecycle events
 */
export interface HookConfig {
    /** Pattern to match tool names */
    matcher?: string;
    /** Hooks to execute */
    hooks: Array<{
        type: 'command';
        command: string;
    }>;
}

/**
 * Hooks for agent lifecycle events
 */
export interface ClaudeAgentHooks {
    /** Hooks executed before tool use */
    PreToolUse?: HookConfig[];
    /** Hooks executed after tool use */
    PostToolUse?: HookConfig[];
    /** Hooks executed when agent stops */
    Stop?: HookConfig[];
}

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
    /** Command to start the MCP server */
    command: string;
    /** Arguments for the command */
    args?: string[];
    /** Environment variables */
    env?: Record<string, string>;
    /** Working directory */
    cwd?: string;
}

/**
 * Claude Agent Configuration
 *
 * Represents a complete agent definition from Agent.md file
 */
export interface ClaudeAgentConfig {
    // ============ Required Fields ============
    /** Unique agent identifier */
    name: string;
    /** Description of when to delegate to this agent */
    description: string;
    /** System prompt content (Markdown body) */
    systemPrompt: string;

    // ============ Model Configuration ============
    /** Model selection */
    model?: ClaudeModel;

    // ============ Tool Control ============
    /** Allowed tools (whitelist) */
    tools?: string[];
    /** Disallowed tools (blacklist) */
    disallowedTools?: string[];

    // ============ Extensions ============
    /** Skills to enable for this agent */
    skills?: string[];
    /** MCP servers to configure */
    mcpServers?: Record<string, MCPServerConfig>;

    // ============ Advanced Features ============
    /** Lifecycle hooks */
    hooks?: ClaudeAgentHooks;
    /** Memory scope */
    memory?: MemoryScope;
    /** Permission mode */
    permissionMode?: PermissionMode;
    /** Maximum conversation turns */
    maxTurns?: number;
    /** Run in background */
    background?: boolean;
    /** Isolation mode */
    isolation?: 'worktree';

    // ============ Metadata ============
    /** Source file path (for debugging) */
    filePath?: string;
}

/**
 * Parsed frontmatter data (before validation)
 */
export interface RawFrontmatter {
    name?: unknown;
    description?: unknown;
    model?: unknown;
    tools?: unknown;
    disallowedTools?: unknown;
    skills?: unknown;
    mcpServers?: unknown;
    hooks?: unknown;
    memory?: unknown;
    permissionMode?: unknown;
    maxTurns?: unknown;
    background?: unknown;
    isolation?: unknown;
}

/**
 * Parse result with success/failure status
 */
export interface ParseResult {
    success: boolean;
    config?: ClaudeAgentConfig;
    errors?: string[];
}
