/**
 * /cron 命令 - 打开 Cron 定时任务面板
 */

import type { CommandContext, CommandDefinition, CommandResult } from './types';

export const cronCommand: CommandDefinition = {
    name: 'cron',
    description: '打开 Cron 定时任务面板',
    aliases: [],
    usage: '/cron',
    execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
        if (context.switchToCron) {
            context.switchToCron();

            return {
                success: true,
                message: '打开 Cron 定时任务面板',
                shouldClearInput: true,
            };
        }

        return {
            success: false,
            message: 'Cron 面板不可用',
            shouldClearInput: true,
        };
    },
};
