/**
 * Agent Panel Command
 *
 * Single command to open agent selection panel.
 * Agent switching is done through the panel UI.
 */

import { type CommandDefinition, type CommandResult, type CommandContext } from './types';

/**
 * /agent command - Open agent selection panel
 */
export const agentCommand: CommandDefinition = {
    name: 'agent',
    description: '打开 Agent 选择面板',
    aliases: ['a'],
    usage: '/agent',
    execute: async (_args: string[], context: CommandContext): Promise<CommandResult> => {
        if (context.switchToAgent) {
            context.switchToAgent();
        }

        return {
            success: true,
            message: '打开 Agent 面板',
            shouldClearInput: true,
        };
    },
};

export const agentCommands: CommandDefinition[] = [agentCommand];
