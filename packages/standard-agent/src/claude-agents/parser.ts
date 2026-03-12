/**
 * Claude Agent.md Parser
 *
 * Parses YAML frontmatter + Markdown format agent configuration files.
 * Compatible with Claude Code's agent declaration format.
 */

import { parse } from 'yaml';
import type { ClaudeAgentConfig, ClaudeAgentHooks, HookConfig, PermissionMode } from './types.js';

/**
 * Parse YAML frontmatter from content
 * Returns { frontmatter, content } or null if no frontmatter
 */
function extractFrontmatter(content: string): { frontmatter: string; body: string } | null {
    // Match --- at start, followed by optional content, then --- separator
    // Supports empty frontmatter (--- immediately followed by ---)
    const match = content.match(/^---\r?\n([\s\S]*?)---\r?\n([\s\S]*)$/);
    if (!match) {
        return null;
    }
    return {
        frontmatter: match[1].replace(/\r?\n$/, ''),
        body: match[2],
    };
}

/**
 * Parse hooks configuration from YAML
 */
function parseHooks(hooksData: unknown): ClaudeAgentHooks | undefined {
    if (!hooksData || typeof hooksData !== 'object') {
        return undefined;
    }

    const hooks = hooksData as Record<string, unknown>;
    const result: ClaudeAgentHooks = {};

    const parseHookConfig = (hookArray: unknown): HookConfig[] | undefined => {
        if (!Array.isArray(hookArray)) return undefined;

        return hookArray
            .map((hook): HookConfig | null => {
                if (typeof hook !== 'object' || hook === null) return null;

                const h = hook as Record<string, unknown>;
                const hookList = h.hooks;

                if (!Array.isArray(hookList)) return null;

                return {
                    matcher: typeof h.matcher === 'string' ? h.matcher : undefined,
                    hooks: hookList
                        .filter(
                            (subHook): subHook is { type: 'command'; command: string } =>
                                typeof subHook === 'object' &&
                                subHook !== null &&
                                subHook.type === 'command' &&
                                typeof subHook.command === 'string',
                        )
                        .map((subHook) => ({
                            type: 'command' as const,
                            command: subHook.command,
                        })),
                };
            })
            .filter((h): h is HookConfig => h !== null && h.hooks.length > 0);
    };

    if (hooks.PreToolUse) {
        const parsed = parseHookConfig(hooks.PreToolUse);
        if (parsed && parsed.length > 0) {
            result.PreToolUse = parsed;
        }
    }

    if (hooks.PostToolUse) {
        const parsed = parseHookConfig(hooks.PostToolUse);
        if (parsed && parsed.length > 0) {
            result.PostToolUse = parsed;
        }
    }

    if (hooks.Stop) {
        const parsed = parseHookConfig(hooks.Stop);
        if (parsed && parsed.length > 0) {
            result.Stop = parsed;
        }
    }

    return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Parse Agent.md file content
 *
 * @param content - Raw file content with YAML frontmatter + Markdown
 * @param filePath - Optional file path for debugging
 * @returns Parsed ClaudeAgentConfig
 * @throws Error if parsing fails or required fields are missing
 */
export function parseAgentMd(content: string, filePath?: string): ClaudeAgentConfig {
    const extracted = extractFrontmatter(content);

    if (!extracted) {
        throw new Error(
            `Invalid Agent.md format: No YAML frontmatter found${filePath ? ` in ${filePath}` : ''}. ` +
                `Expected format:\n---\nname: agent-name\n---\nSystem prompt content`,
        );
    }

    let frontmatterData: Record<string, unknown>;
    try {
        frontmatterData = parse(extracted.frontmatter) as Record<string, unknown>;
    } catch (e) {
        throw new Error(
            `Failed to parse YAML frontmatter${filePath ? ` in ${filePath}` : ''}: ${e instanceof Error ? e.message : String(e)}`,
        );
    }

    if (!frontmatterData || typeof frontmatterData !== 'object') {
        frontmatterData = {};
    }

    // Extract and validate required fields
    const name = frontmatterData.name;
    const description = frontmatterData.description;

    if (typeof name !== 'string' || !name.trim()) {
        throw new Error(`Agent name is required`);
    }

    if (typeof description !== 'string' || !description.trim()) {
        throw new Error(`Agent description is required`);
    }

    // Parse optional fields with type checking
    const model = frontmatterData.model;
    if (model !== undefined && !['sonnet', 'opus', 'haiku', 'inherit'].includes(model as string)) {
        throw new Error(
            `Invalid model value '${model}'${filePath ? ` in ${filePath}` : ''}. ` +
                `Must be one of: sonnet, opus, haiku, inherit`,
        );
    }

    const memory = frontmatterData.memory;
    if (memory !== undefined && !['user', 'project', 'local'].includes(memory as string)) {
        throw new Error(
            `Invalid memory value '${memory}'${filePath ? ` in ${filePath}` : ''}. ` +
                `Must be one of: user, project, local`,
        );
    }

    const permissionMode = frontmatterData.permissionMode as PermissionMode | undefined;
    const validPermissionModes: PermissionMode[] = ['default', 'acceptEdits', 'dontAsk', 'bypassPermissions', 'plan'];
    if (permissionMode !== undefined && !validPermissionModes.includes(permissionMode)) {
        throw new Error(
            `Invalid permissionMode value '${permissionMode}'${filePath ? ` in ${filePath}` : ''}. ` +
                `Must be one of: ${validPermissionModes.join(', ')}`,
        );
    }

    // Build config object
    const config: ClaudeAgentConfig = {
        name: name.trim(),
        description: description.trim(),
        systemPrompt: extracted.body.trim(),
        filePath,
    };

    // Optional fields
    if (model !== undefined) {
        config.model = model as 'sonnet' | 'opus' | 'haiku' | 'inherit';
    }

    if (Array.isArray(frontmatterData.tools)) {
        config.tools = frontmatterData.tools.filter((t): t is string => typeof t === 'string');
    }

    if (Array.isArray(frontmatterData.disallowedTools)) {
        config.disallowedTools = frontmatterData.disallowedTools.filter((t): t is string => typeof t === 'string');
    }

    if (Array.isArray(frontmatterData.skills)) {
        config.skills = frontmatterData.skills.filter((t): t is string => typeof t === 'string');
    }

    if (frontmatterData.mcpServers && typeof frontmatterData.mcpServers === 'object') {
        config.mcpServers = frontmatterData.mcpServers as Record<string, unknown>;
    }

    const hooks = parseHooks(frontmatterData.hooks);
    if (hooks) {
        config.hooks = hooks;
    }

    if (memory !== undefined) {
        config.memory = memory as 'user' | 'project' | 'local';
    }

    if (permissionMode !== undefined) {
        config.permissionMode = permissionMode;
    }

    if (typeof frontmatterData.maxTurns === 'number') {
        config.maxTurns = Math.floor(frontmatterData.maxTurns);
    }

    if (typeof frontmatterData.background === 'boolean') {
        config.background = frontmatterData.background;
    }

    if (frontmatterData.isolation === 'worktree') {
        config.isolation = 'worktree';
    }

    return config;
}

/**
 * Validate agent configuration
 *
 * @param config - Parsed agent configuration
 * @returns Array of error messages (empty if valid)
 */
export function validateAgentConfig(config: ClaudeAgentConfig): string[] {
    const errors: string[] = [];

    // Required fields
    if (!config.name?.trim()) {
        errors.push('Agent name is required');
    }

    if (!config.description?.trim()) {
        errors.push('Agent description is required');
    }

    if (!config.systemPrompt?.trim()) {
        errors.push('Agent systemPrompt is required');
    }

    // Optional field validations
    if (config.model !== undefined) {
        const validModels = ['sonnet', 'opus', 'haiku', 'inherit'];
        if (!validModels.includes(config.model)) {
            errors.push(`Invalid model value: ${config.model}. Must be one of: sonnet, opus, haiku, inherit`);
        }
    }

    if (config.permissionMode !== undefined) {
        const validModes = ['default', 'acceptEdits', 'dontAsk', 'bypassPermissions', 'plan'];
        if (!validModes.includes(config.permissionMode)) {
            errors.push(`Invalid permissionMode: ${config.permissionMode}`);
        }
    }

    if (config.memory !== undefined) {
        const validMemory = ['user', 'project', 'local'];
        if (!validMemory.includes(config.memory)) {
            errors.push(`Invalid memory value: ${config.memory}`);
        }
    }

    if (config.maxTurns !== undefined) {
        if (config.maxTurns < 1) {
            errors.push('maxTurns must be a positive number');
        }
    }

    if (config.isolation !== undefined && config.isolation !== 'worktree') {
        errors.push(`Invalid isolation value: ${config.isolation}. Must be: worktree`);
    }

    if (config.tools && config.disallowedTools) {
        const overlap = config.tools.filter((t) => config.disallowedTools!.includes(t));
        if (overlap.length > 0) {
            errors.push(`Tools cannot be both allowed and disallowed: ${overlap.join(', ')}`);
        }
    }

    // Validate hooks
    if (config.hooks) {
        for (const [eventName, hookList] of Object.entries(config.hooks)) {
            if (Array.isArray(hookList)) {
                hookList.forEach((hookConfig, index) => {
                    if (!hookConfig.hooks || hookConfig.hooks.length === 0) {
                        errors.push(`${eventName} hook at index ${index} must have at least one hook defined`);
                    }
                });
            }
        }
    }

    return errors;
}

/**
 * Check if content looks like an Agent.md file
 * (has YAML frontmatter)
 */
export function isAgentMdContent(content: string): boolean {
    return /^---\r?\n[\s\S]*?\r?\n---\r?\n/.test(content);
}
