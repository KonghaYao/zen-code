/**
 * Agent Configuration System
 *
 * Defines specialized agent configurations for switchBranch routing.
 * Each agent has specific tools, prompts, and middleware settings.
 */

export interface AgentConfig {
    id: string;
    name: string;
    description: string;
    systemPrompt?: string | ((state: any) => string);
    tools: string[];
    middleware: {
        agents_md?: boolean;
        skills?: boolean;
        memories?: boolean;
        mcp?: boolean;
        subagents?: boolean;
    };
}

/**
 * Load agent configurations
 * Returns a map of agent ID to configuration
 *
 * Note: Subagent prompts are now injected via SkillsMiddleware
 * from .claude/skills/{agent-name}/SKILL.md
 *
 * Future extensions:
 * - Load from ~/.zen-code/settings.json
 * - Load from database
 * - Remote configuration service
 */
export async function loadAgentsList(): Promise<Record<string, AgentConfig>> {
    return {
        default: {
            id: 'default',
            name: 'Jarvis', // Iron Man's AI assistant
            description: '全功能代码助手',

            tools: ['all'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: true,
                subagents: true,
            },
        },
        architect: {
            id: 'architect',
            name: 'Architect',
            description: '高维度架构师角色，专注于系统设计、技术选型、架构决策和全局视角分析',

            // System prompt 由 SkillsMiddleware 从 .claude/skills/architect/SKILL.md 注入
            systemPrompt: '',

            // 架构师只使用只读工具，不修改代码
            tools: ['glob_files', 'search-files-rg', 'read_file', 'ask_user_questions'],

            // 只启用基础中间件，不启用 MCP 和 subagents
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: false,
                subagents: false,
            },
        },
    };
}

/**
 * Get default agent ID
 */
export function getDefaultAgentId(): string {
    return 'default';
}

/**
 * Validate agent configuration
 * Ensures tools exist and middleware settings are valid
 */
export function validateAgentConfig(config: AgentConfig, availableTools: Set<string>): string[] {
    const errors: string[] = [];

    // Validate tools
    for (const tool of config.tools) {
        if (tool !== 'all' && !availableTools.has(tool)) {
            errors.push(`Unknown tool: ${tool}`);
        }
    }

    return errors;
}
