/**
 * /settings 命令 - 打开 Settings 面板（Model 和 Provider 配置）
 */

import type { CommandContext, CommandDefinition, CommandResult } from './types';

export const providerCommand: CommandDefinition = {
    name: 'settings',
    description: '打开 Settings 面板（Model 和 Provider 配置）',
    aliases: ['s', 'model', 'settings', 'm'],
    usage: '/settings',
    execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
        context.switchToSettings?.();

        return {
            success: true,
            message: '打开 Settings 面板',
            shouldClearInput: true,
        };
    },
};
