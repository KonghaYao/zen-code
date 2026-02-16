/**
 * Agent Configuration System
 *
 * Defines specialized agent configurations for switchBranch routing.
 * Each agent has specific tools, prompts, and middleware settings.
 *
 * Aligned with AgentSchema from @langgraph-js/standard-agent
 */

export interface AgentConfig {
    id: string;
    name: string;
    description: string;
    system_prompt: string; // Reference to prompt ID
    model: string; // Reference to model ID
    tools: Record<string, boolean | any>; // Tool ID -> enabled/params
    middleware: Record<string, boolean | any>; // Middleware ID -> enabled/params
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
            description: '代码实现助手',
            system_prompt: 'prompts/default',
            model: 'glm-4.7',

            tools: {
                read_file: true,
                write_file: true,
                edit_file: true,
                glob_files: true,
                'search-files-rg': true,
                folder_operations: true,
                terminal: true,
                ask_user_questions: true,
                TodoWrite: true,
            },
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: true,
                subagents: true,
            },
        },
        manager: {
            id: 'manager',
            name: 'Manager',
            description: '任务管理员',
            system_prompt: 'prompts/manager',
            model: 'glm-4.7',

            tools: {
                read_file: true,
                write_file: true,
                edit_file: true,
                glob_files: true,
                'search-files-rg': true,
                folder_operations: true,
                terminal: true,
                ask_user_questions: true,
                TodoWrite: true,
            },
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
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
 * Ensures required fields are present and types are correct
 */
export function validateAgentConfig(config: AgentConfig): string[] {
    const errors: string[] = [];

    if (!config.id) {
        errors.push('Agent id is required');
    }
    if (!config.name) {
        errors.push('Agent name is required');
    }
    if (!config.description) {
        errors.push('Agent description is required');
    }
    if (!config.system_prompt) {
        errors.push('Agent system_prompt is required');
    }
    if (!config.model) {
        errors.push('Agent model is required');
    }

    return errors;
}
