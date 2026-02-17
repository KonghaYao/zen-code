/**
 * /settings 命令 - 打开通用设置面板
 *
 * 用于配置 compact_mode, enable_thinking, stream_refresh_interval 等
 *
 * 注意：
 * - MCP 配置 → /mcp 命令
 * - Provider 配置 → /provider 命令
 */

import type { CommandContext, CommandDefinition, CommandResult } from './types';

export const settingsCommand: CommandDefinition = {
    name: 'settings',
    description: '打开通用设置面板',
    aliases: ['set'],
    usage: '/settings',
    execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
        // 切换到 settings 面板
        // 需要在 CommandHandler 中添加 switchToSettings 回调
        if (context.switchToSettings) {
            context.switchToSettings();

            return {
                success: true,
                message: '打开通用设置面板',
                shouldClearInput: true,
            };
        }

        return {
            success: false,
            message: 'Settings 面板不可用',
            shouldClearInput: true,
        };
    },
};
