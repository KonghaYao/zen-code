#!/usr/bin/env node

// Patch String.prototype.repeat to clamp invalid arguments to 0
const _originalRepeat = String.prototype.repeat;
String.prototype.repeat = function (count) {
    if (typeof count !== 'number' || !isFinite(count) || count < 0) count = 0;
    return _originalRepeat.call(this, Math.floor(count));
};

import { initDatabaseUri } from './utils';

const args = process.argv.slice(2);
process.env.LG_TEMP_MESSAGE = 'true';

async function main() {
    // 初始化错误拦截器（捕获所有 console.error/warn 等）
    const { initErrorInterceptor } = await import('./chat/services/ErrorInterceptor');
    initErrorInterceptor();

    // 处理 --yolo 参数：设置环境变量但不保存到配置
    const yoloIndex = args.indexOf('--yolo');
    if (yoloIndex !== -1) {
        process.env.YOLO_MODE = 'true';
        args.splice(yoloIndex, 1); // 移除 --yolo 参数
    }

    /** @ts-ignore */
    globalThis.Bun && initDatabaseUri('~/.zen-code/data/sessions.db');
    if (args[0] === 'init') {
        console.log('Please zen-code and use /m to configure models');
    } else if (args[0] === 'keyboard') {
        import('./zen-keyboard');
    } else if (args[0] === '-p' || args[0] === '--prompt') {
        // 非交互模式：直接执行任务
        const prompt = args.slice(1).join(' ');
        const { runNonInteractive } = await import('./nonInteractive');
        await runNonInteractive(prompt, false);
    } else {
        // 检测是否是管道输入
        const hasStdin = await detectStdin();

        if (hasStdin) {
            // 管道模式：从 stdin 读取
            const { runNonInteractive } = await import('./nonInteractive');
            await runNonInteractive(undefined, true);
        } else {
            // 默认：启动 TUI
            await import('./app');
        }
    }
}

/**
 * 检测 stdin 是否有数据流（管道）
 */
async function detectStdin() {
    return new Promise((resolve) => {
        const isTTY = process.stdin.isTTY;

        if (isTTY) {
            resolve(false);
            return;
        }

        // 尝试读取第一个字符检测是否有数据
        const chunk = process.stdin.read();
        if (chunk) {
            process.stdin.unshift(chunk);
            resolve(true);
        } else {
            setTimeout(() => {
                const retryChunk = process.stdin.read();
                if (retryChunk) {
                    process.stdin.unshift(retryChunk);
                    resolve(true);
                } else {
                    resolve(false);
                }
            }, 100);
        }
    });
}

main().catch((error) => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
});
