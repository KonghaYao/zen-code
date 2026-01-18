#!/usr/bin/env node
const args = process.argv.slice(2);

async function main() {
    if (args[0] === 'init') {
        import('./dist/zen-init.mjs');
    } else if (args[0] === 'keyboard') {
        import('./dist/zen-keyboard.mjs');
    } else if (args[0] === '-p' || args[0] === '--prompt') {
        // 非交互模式：直接执行任务
        const prompt = args.slice(1).join(' ');
        const { runNonInteractive } = await import('./dist/nonInteractive.mjs');
        await runNonInteractive(prompt, false);
    } else {
        // 检测是否是管道输入
        const hasStdin = await detectStdin();
        
        if (hasStdin) {
            // 管道模式：从 stdin 读取
            const { runNonInteractive } = await import('./dist/nonInteractive.mjs');
            await runNonInteractive(undefined, true);
        } else {
            // 默认：启动 TUI
            import('./dist/zen-code.mjs');
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

main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
});
