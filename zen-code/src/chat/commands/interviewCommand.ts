/**
 * Interview Mode 命令实现
 * 通过引导式提问澄清用户需求
 */

import { CommandContext, CommandDefinition, CommandResult } from './types';

const INTERVIEW_PREFIX = `
[Interview Mode Activated]

I want to clarify requirements through guided questions.

1. Ask multiple questions at once - Use multiple \`ask_user_questions\` tool_calls for efficiency
2. Use multiple-choice questions - Reduce user typing with single_select or multi_select
3. Enable custom input - Set allow_custom_input: true when unsure of all options
4. Keep questions focused - One thing per question
5. Limit to 3-5 questions in one \`ask_user_questions\` tool_call - Don't overwhelm the user

After getting answers:
1. Summarize user's requirements
2. Output a document about this task
3. ask user question to improve
4. save your plan to standard way it store in this project
---

User's original message:
`;

export const interviewCommand: CommandDefinition = {
    name: 'interview',
    description: 'Start Interview mode to clarify requirements through questions',
    aliases: ['i'],
    usage: '/interview [your request]',
    requiresArgs: true,
    execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
        const userRequest = args.join(' ').trim();

        if (!userRequest) {
            return {
                success: false,
                message: '❌ Interview 模式需要提供任务描述\n用法: /interview [your request]',
            };
        }

        const enhancedMessage = INTERVIEW_PREFIX + userRequest;

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
            message: '📋 Interview mode activated',
            shouldClearInput: true,
        };
    },
};

export const interviewCommands: CommandDefinition[] = [interviewCommand];
