/**
 * Plan Mode 命令实现
 * 进入规划模式，使用 writing-plans skill 创建详细的实施计划
 */

import { CommandContext, CommandDefinition, CommandResult } from './types';

const PLAN_PREFIX = `
[Plan Mode Activated]

I want to create a comprehensive implementation plan for this task.

**Your Role:** You are in Plan Mode - help me create detailed, actionable implementation plans.

**Process:**
1. Ask clarifying questions to understand requirements (use ask_user_questions for efficiency)
2. Gather context by reading relevant files
3. Create a detailed, actionable plan using the writing-plans skill
4. Save the plan to \`docs/plans/YYYY-MM-DD-<feature-name>.md\`

**Plan Format Requirements:**
- Each task should be 2-5 minutes of work
- Include exact file paths, code snippets, and commands
- Follow TDD: Write test → Verify fail → Implement → Verify pass → Commit
- Document testing strategies and edge cases

**Required Skills:**
- Use \`writing-plans\` skill (located at \`.claude/skills/writing-plans/SKILL.md\`)
- Read the skill file for the complete plan structure template

After the plan is created, ask if I want to execute it immediately or save for later.

---

User's original request:
`;

export const planCommand: CommandDefinition = {
    name: 'plan',
    description: 'Enter Plan mode to create detailed implementation plans',
    aliases: ['p'],
    usage: '/plan [your task description]',
    requiresArgs: true,
    execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
        const userRequest = args.join(' ').trim();

        if (!userRequest) {
            return {
                success: false,
                message: '❌ Plan 模式需要提供任务描述\n用法: /plan [your task description]',
            };
        }

        const enhancedMessage = PLAN_PREFIX + userRequest;

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
            message: '📋 Plan mode activated',
            shouldClearInput: true,
        };
    },
};

export const planCommands: CommandDefinition[] = [planCommand];
