/**
 * /errors 命令 - 打开错误面板
 */

import type { CommandContext, CommandDefinition, CommandResult } from './types';

export const errorPanelCommand: CommandDefinition = {
    name: 'errors',
    description: '打开错误日志面板',
    aliases: ['error', 'err'],
    usage: '/errors',
    execute: async (_args: string[], context: CommandContext): Promise<CommandResult> => {
        context.switchToErrors?.();

        return {
            success: true,
            message: '打开错误日志面板',
            shouldClearInput: true,
        };
    },
};
