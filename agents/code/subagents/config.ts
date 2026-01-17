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
    const {
        getFinderPrompt,
        getPlannerPrompt,
        getReviewerPrompt,
        getDebuggerPrompt,
        getRefactorPrompt,
        getTesterPrompt,
        getSecurityPrompt,
        getPerformancePrompt,
        getOrganizerPrompt,
    } = await import('../prompts/subagents/index.js');

    return {
        default: {
            id: 'default',
            name: 'Jarvis', // Iron Man's AI assistant
            description: '全功能代码助手',
            systemPrompt: getSystemPrompt,
            tools: ['all'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: true,
                subagents: true,
            },
        },
        finder: {
            id: 'finder',
            name: 'Sherlock', // Sherlock Holmes
            description: '文件搜索专家，只读工具',
            systemPrompt: getFinderPrompt,
            tools: ['glob_files', 'search-files-rg', 'read_file'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: false,
                subagents: false,
            },
        },
        planner: {
            id: 'planner',
            name: 'Planner Agent',
            description: '任务规划专家',
            systemPrompt: getPlannerPrompt,
            tools: ['TodoWrite', 'ask_user_with_options', 'glob_files', 'search-files-rg', 'read_file'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: false,
                subagents: false,
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
            },
        },
        debugger: {
            id: 'debugger',
            name: 'Debugger Agent',
            description: '调试专家，错误分析和日志追踪',
            systemPrompt: getDebuggerPrompt,
            tools: ['glob_files', 'search-files-rg', 'read_file', 'bash'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: false,
                subagents: false,
            },
        },
        refactor: {
            id: 'refactor',
            name: 'Refactor Agent',
            description: '重构专家',
            systemPrompt: getRefactorPrompt,
            tools: ['all'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: false,
                subagents: false,
            },
        },
        tester: {
            id: 'tester',
            name: 'Tester Agent',
            description: '测试专家，测试用例生成和覆盖率分析',
            systemPrompt: getTesterPrompt,
            tools: ['all'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: false,
                subagents: false,
            },
        },
        security: {
            id: 'security',
            name: 'Security Agent',
            description: '安全专家，漏洞扫描和安全审计',
            systemPrompt: getSecurityPrompt,
            tools: ['glob_files', 'search-files-rg', 'read_file'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: false,
                subagents: false,
            },
        },
        performance: {
            id: 'performance',
            name: 'Performance Agent',
            description: '性能专家',
            systemPrompt: getPerformancePrompt,
            tools: ['glob_files', 'search-files-rg', 'read_file'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: false,
                subagents: false,
            },
        },
        organizer: {
            id: 'organizer',
            name: 'Organizer Agent',
            description: '知识整理专家',
            systemPrompt: getOrganizerPrompt,
            tools: ['all'],
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
