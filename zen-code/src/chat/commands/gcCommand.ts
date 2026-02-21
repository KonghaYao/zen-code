/**
 * GC Command - 手动触发垃圾回收以减少内存占用
 * 根据不同平台执行相应的内存优化操作
 */

import { type CommandDefinition, type CommandResult, type CommandContext } from './types';

/**
 * 格式化字节数为人类可读格式
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取当前内存使用情况
 */
function getMemoryStats() {
    const memUsage = process.memoryUsage();
    return {
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        rss: memUsage.rss,
        heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
    };
}

/**
 * 检测是否在 Bun 运行时
 */
function isBunRuntime(): boolean {
    return typeof Bun !== 'undefined';
}

/**
 * 执行垃圾回收（仅支持 Bun 运行时）
 * @returns 回收前后的内存统计，以及是否成功执行
 */
function performGC(): {
    success: boolean;
    before?: ReturnType<typeof getMemoryStats>;
    after?: ReturnType<typeof getMemoryStats>;
    freed?: number;
    message: string;
} {
    const before = getMemoryStats();

    // 仅支持 Bun 运行时
    if (isBunRuntime() && typeof Bun.gc === 'function') {
        Bun.gc(true);
        const after = getMemoryStats();
        const freed = before.heapUsed - after.heapUsed;

        return {
            success: true,
            before,
            after,
            freed,
            message: `GC 执行成功，释放了 ${formatBytes(Math.max(0, freed))} 内存`,
        };
    }
    if (globalThis.global && typeof globalThis.global.gc === 'function') {
        globalThis.global.gc();
        const after = getMemoryStats();
        const freed = before.heapUsed - after.heapUsed;

        return {
            success: true,
            before,
            after,
            freed,
            message: `GC 执行成功，释放了 ${formatBytes(Math.max(0, freed))} 内存`,
        };
    }

    return {
        success: false,
        before,
        message:
            '/gc 命令仅在 Bun 或者 node --expose-gc 可用\n' +
            '当前内存使用: ' +
            formatBytes(before.heapUsed) +
            ' / ' +
            formatBytes(before.heapTotal),
    };
}

/**
 * 获取内存优化提示
 */
function getPlatformTips(): string {
    const tips: string[] = [];

    if (!isBunRuntime()) {
        tips.push('/gc 命令仅支持 Bun 运行时，请使用 bun 启动应用');
    } else {
        tips.push('当前运行在 Bun 环境，/gc 命令已就绪');
    }

    return tips.join('\n');
}

export const gcCommand: CommandDefinition = {
    name: 'gc',
    description: '手动触发垃圾回收，减少内存占用',
    aliases: ['garbage-collect', 'mem-opt', 'memory'],
    usage: '/gc',
    execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
        const verbose = args.includes('-v') || args.includes('--verbose');

        const result = performGC();

        let message = `🗑️ ${result.message}\n`;

        if (result.before && result.after) {
            message += `\n📊 内存统计:\n`;
            message += `   Before: ${formatBytes(result.before.heapUsed)} / ${formatBytes(result.before.heapTotal)}\n`;
            message += `   After:  ${formatBytes(result.after.heapUsed)} / ${formatBytes(result.after.heapTotal)}\n`;
            if (result.freed !== undefined && result.freed > 0) {
                message += `   Freed:  ${formatBytes(result.freed)}\n`;
            }
        } else if (result.before) {
            message += `\n📊 当前内存使用: ${formatBytes(result.before.heapUsed)} / ${formatBytes(result.before.heapTotal)}\n`;
        }

        if (!result.success || verbose) {
            message += `\n💡 提示:\n`;
            message += `   ${getPlatformTips().replace(/\n/g, '\n   ')}\n`;
        }

        return {
            success: result.success,
            message,
            shouldClearInput: true,
        };
    },
};
