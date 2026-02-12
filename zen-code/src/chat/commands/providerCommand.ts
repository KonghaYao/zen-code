/**
 * /provider 命令 - 打开 Provider 配置面板
 */

import type { CommandDefinition, CommandResult } from './types';

export const providerCommand: CommandDefinition = {
    name: 'provider',
    description: '配置 AI Provider',
    aliases: ['providers', 'p'],
    usage: '/provider',
    execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
        context.switchToProvider?.();

        return {
            success: true,
            message: '打开 Provider 配置面板',
            shouldClearInput: true,
        };
    },
};
