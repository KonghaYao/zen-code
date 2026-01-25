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
 * from agents/code/skills/subagents.ts
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
