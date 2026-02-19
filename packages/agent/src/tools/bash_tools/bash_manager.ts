import type { ResultPromise } from 'execa';

export interface ManagedProcess {
    process: ResultPromise;
    stdout: string[];
    stderr: string[];
    timeout?: number; // 超时时间（毫秒）
    timer?: NodeJS.Timeout; // 超时定时器
}

export const background_processes = new Map<number, ManagedProcess>();

// 设置进程超时
export function setProcessTimeout(pid: number, timeoutMs: number): void {
    const managed_process = background_processes.get(pid);
    if (!managed_process) {
        console.error(`[bash_manager] Process ${pid} not found`);
        return;
    }

    // 清除现有定时器
    if (managed_process.timer) {
        clearTimeout(managed_process.timer);
    }

    // 设置新的超时定时器
    managed_process.timeout = timeoutMs;
    managed_process.timer = setTimeout(() => {
        console.log(`[bash_manager] Process ${pid} timed out after ${timeoutMs}ms, killing...`);
        managed_process.process.kill();
        background_processes.delete(pid);
    }, timeoutMs);
}

// 取消进程超时
export function clearProcessTimeout(pid: number): void {
    const managed_process = background_processes.get(pid);
    if (managed_process?.timer) {
        clearTimeout(managed_process.timer);
        managed_process.timer = undefined;
        managed_process.timeout = undefined;
    }
}

// 清理所有后台进程
export function cleanupAllBackgroundProcesses(): void {
    for (const [pid, managed_process] of background_processes.entries()) {
        try {
            // 清除超时定时器
            if (managed_process.timer) {
                clearTimeout(managed_process.timer);
            }
            managed_process.process.kill();
            console.log(`[bash_manager] Killed background process ${pid}`);
        } catch (error) {
            console.error(`[bash_manager] Failed to kill process ${pid}:`, error);
        }
    }
    background_processes.clear();
}

// 注册进程退出时的清理函数
function registerCleanupHandlers(): void {
    const cleanup = () => {
        cleanupAllBackgroundProcesses();
    };

    // 处理各种退出信号
    process.on('exit', cleanup);
    process.on('SIGINT', () => {
        cleanup();
        process.exit(0);
    });
    process.on('SIGTERM', () => {
        cleanup();
        process.exit(0);
    });
}

// 只注册一次
if (!process.env.__BASH_MANAGER_CLEANUP_REGISTERED__) {
    registerCleanupHandlers();
    process.env.__BASH_MANAGER_CLEANUP_REGISTERED__ = 'true';
}
