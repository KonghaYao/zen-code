/**
 * Create Agent.md 命令实现
 * 触发对话生成或更新 AGENTS.md 文件
 */

import { CommandContext, CommandDefinition, CommandResult } from './types';

const CREATE_AGENT_MD_PREFIX = `
[Create AGENTS.md Mode Activated]

I want to create or update the AGENTS.md file for this project.

**Your Role:** You are in AGENTS.md creation mode - help me create comprehensive project guidelines for AI agents.

**Process:**
1. Ask clarifying questions to understand the project requirements (use ask_user_questions for efficiency)
2. Read existing files to understand the project structure and context
3. Analyze the codebase to identify patterns, conventions, and best practices
4. Create or update the AGENTS.md file in the root directory

**AGENTS.md Format:**
The AGENTS.md file should include:
- Project overview and objectives
- Architecture and design patterns used
- Coding standards and conventions
- Important file locations and their purposes
- Development workflows and processes
- Testing strategies and guidelines
- Deployment considerations
- Common gotchas or important notes

**File Location:**
The AGENTS.md should be created/updated in the project root directory.

After the AGENTS.md is created or updated, provide a summary of the changes made.

---

User's request:
`;

export const createAgentMdCommand: CommandDefinition = {
    name: 'create-agent-md',
    description: 'Create or update AGENTS.md file with project guidelines',
    aliases: ['agentmd', 'am'],
    usage: '/create-agent-md [description or goal for AGENTS.md]',
    requiresArgs: true,
    execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
        const userRequest = args.join(' ').trim();

        if (!userRequest) {
            return {
                success: false,
                message: '❌ 需要提供描述或目标。例如: /create-agent-md 初始化项目指南文档',
                shouldClearInput: false,
            };
        }

        const enhancedMessage = CREATE_AGENT_MD_PREFIX + userRequest;

        context.sendMessage(
            [
                {
                    type: 'human',
                    content: enhancedMessage,
                },
            ],
            { extraParams: context.extraParams },
        );

        return {
            success: true,
            message: '📝 AGENTS.md creation mode activated',
            shouldClearInput: true,
        };
    },
};

/**
 * /init-agents-md 命令 - 快速初始化 AGENTS.md 文件
 */
export const initAgentMdCommand: CommandDefinition = {
    name: 'init-agents-md',
    description: '快速初始化 AGENTS.md 项目指南文档',
    aliases: ['iam', 'init-agents'],
    usage: '/init-agents-md',
    requiresArgs: false,
    execute: async (_args: string[], context: CommandContext): Promise<CommandResult> => {
        const userRequest = '初始化项目 AGENTS.md 指南文档';
        const enhancedMessage = CREATE_AGENT_MD_PREFIX + userRequest;

        context.sendMessage(
            [
                {
                    type: 'human',
                    content: enhancedMessage,
                },
            ],
            { extraParams: context.extraParams },
        );

        return {
            success: true,
            message: '📝 开始初始化 AGENTS.md...',
            shouldClearInput: true,
        };
    },
};

export const createAgentMdCommands: CommandDefinition[] = [createAgentMdCommand, initAgentMdCommand];
