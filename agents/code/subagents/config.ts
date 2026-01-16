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
    systemPrompt: string | ((state: any) => Promise<string> | string);
    tools: string[];
    middleware: {
        agents_md?: boolean;
        skills?: boolean;
        memories?: boolean;
        mcp?: boolean;
        subagents?: boolean;
        cache?: boolean;
    };
}

/**
 * Load agent configurations
 * Returns a map of agent ID to configuration
 *
 * Future extensions:
 * - Load from ~/.code-graph.json
 * - Load from database
 * - Remote configuration service
 */
export async function loadAgentsList(): Promise<Record<string, AgentConfig>> {
    const { getSystemPrompt } = await import('../prompts/coding.js');
    const { getFinderPrompt, getPlannerPrompt, getReviewerPrompt } = await import('../prompts/subagents/index.js');

    return {
        default: {
            id: 'default',
            name: 'Code Agent',
            description: '全功能代码助手',
            systemPrompt: getSystemPrompt,
            tools: ['all'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: true,
                subagents: true,
                cache: process.env.MODEL_PROVIDER === 'anthropic',
            },
        },
        finder: {
            id: 'finder',
            name: 'Finder Agent',
            description: '文件搜索专家，只读工具',
            systemPrompt: getFinderPrompt,
            tools: ['glob_files', 'search-files-rg', 'read_file'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: false,
                subagents: false,
                cache: false,
            },
        },
        planner: {
            id: 'planner',
            name: 'Planner Agent',
            description: '任务规划专家',
            systemPrompt: getPlannerPrompt,
            tools: ['TodoWrite', 'ask_user_with_options'],
            middleware: {
                agents_md: true,
                skills: false,
                memories: false,
                mcp: false,
                subagents: false,
                cache: false,
            },
        },
        reviewer: {
            id: 'reviewer',
            name: 'Reviewer Agent',
            description: '代码审查专家，只读分析',
            systemPrompt: getReviewerPrompt,
            tools: ['glob_files', 'search-files-rg', 'read_file'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: false,
                subagents: false,
                cache: false,
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
