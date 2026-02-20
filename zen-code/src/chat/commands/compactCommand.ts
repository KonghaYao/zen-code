import { CommandDefinition, CommandContext } from './types';

/**
 * 紧凑模式命令
 * 切换消息的紧凑/详细显示模式
 */
export const compactCommand: CommandDefinition = {
    name: 'compact-message',
    description: '切换紧凑消息显示模式 (紧凑模式显示简化的消息预览)',
    aliases: ['cm'],
    usage: '/compact-message',
    requiresArgs: false,

    execute: async (args: string[], context: CommandContext) => {
        try {
            // 从 context 获取当前的紧凑模式状态
            const { updateConfig, compactMode } = context;
            if (!updateConfig) {
                return {
                    success: false,
                    message: '配置更新功能不可用',
                };
            }

            // 使用 context 中的当前状态切换模式
            const currentMode = compactMode ?? false;
            await updateConfig({ compact_mode: !currentMode });

            const newMode = !currentMode;
            return {
                success: true,
                message: newMode ? '紧凑模式已启用' : '紧凑模式已关闭',
                shouldClearInput: true,
            };
        } catch (error) {
            return {
                success: false,
                message: `切换紧凑模式失败: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
};
