/**
 * /mcp 命令 - 打开 MCP 配置面板
 */

import type { CommandContext, CommandDefinition, CommandResult } from './types';

export const mcpPanelCommand: CommandDefinition = {
    name: 'mcp',
    description: '打开 MCP 服务器配置面板',
    aliases: [],
    usage: '/mcp',
    execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
        context.switchToMcp?.();

        return {
            success: true,
            message: '打开 MCP 配置面板',
            shouldClearInput: true,
        };
    },
};
