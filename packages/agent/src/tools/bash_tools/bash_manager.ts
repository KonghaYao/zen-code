import type { ResultPromise } from 'execa';
import { execa } from 'execa';

export interface ManagedProcess {
    process: ResultPromise;
    stdout: string[];
    stderr: string[];
    timeout?: number; // 超时时间（毫秒）
    timer?: NodeJS.Timeout; // 超时定时器
}

export const background_processes = new Map<number, ManagedProcess>();

// 同步强制杀死进程树（用于进程退出时）
function forceKillProcessTreeSync(pid: number): void {
    const isWindows = process.platform === 'win32';

    try {
        if (isWindows) {
            // Windows: 使用 taskkill 强制杀死进程树
            require('child_process').spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], {
                timeout: 5000,
            });
        } else {
            // Unix/macOS: 直接 SIGKILL 进程组
            try {
                process.kill(-pid, 'SIGKILL');
            } catch {
                try {
                    process.kill(pid, 'SIGKILL');
                } catch {
                    // 进程已退出
                }
            }
        }
    } catch (error) {
        console.error(`[bash_manager] Failed to kill process tree ${pid}:`, error);
    }
}

// 异步强制杀死进程及其子进程（跨平台）
export async function forceKillProcessTree(pid: number): Promise<void> {
    const isWindows = process.platform === 'win32';

    try {
        if (isWindows) {
            // Windows: 使用 taskkill 强制杀死进程树
            await execa('taskkill', ['/F', '/T', '/PID', String(pid)], {
                reject: false,
                timeout: 5000,
            });
        } else {
            // Unix/macOS: 使用进程组杀死
            // 先尝试 SIGTERM，给进程 500ms 时间优雅关闭
            try {
                process.kill(-pid, 'SIGTERM');
            } catch {
                // 进程组可能不存在，尝试直接 kill
                try {
                    process.kill(pid, 'SIGTERM');
                } catch {
                    // 进程已退出
                    return;
                }
            }

            // 等待 500ms，然后强制 SIGKILL
            await new Promise((resolve) => setTimeout(resolve, 500));

            try {
                // 检查进程是否还存在
                process.kill(pid, 0);
                // 进程还存在，强制杀死
                try {
                    process.kill(-pid, 'SIGKILL');
                } catch {
                    process.kill(pid, 'SIGKILL');
                }
            } catch {
                // 进程已经退出，无需操作
            }
        }
    } catch (error) {
        console.error(`[bash_manager] Failed to kill process tree ${pid}:`, error);
    }
}

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
    managed_process.timer = setTimeout(async () => {
        console.log(`[bash_manager] Process ${pid} timed out after ${timeoutMs}ms, force killing...`);

        // 强制杀死进程树
        await forceKillProcessTree(pid);

        // 从 map 中删除
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

// 清理所有后台进程（异步版本）
export async function cleanupAllBackgroundProcesses(): Promise<void> {
    const killPromises: Promise<void>[] = [];

    for (const [pid, managed_process] of background_processes.entries()) {
        // 清除超时定时器
        if (managed_process.timer) {
            clearTimeout(managed_process.timer);
        }
        // 使用 forceKillProcessTree 确保进程树被完全杀死
        killPromises.push(forceKillProcessTree(pid));
        console.log(`[bash_manager] Killing background process ${pid}`);
    }

    // 等待所有进程被杀死
    await Promise.all(killPromises);
    background_processes.clear();
}

// 清理所有后台进程（同步版本，用于 exit 事件）
function cleanupAllBackgroundProcessesSync(): void {
    for (const [pid, managed_process] of background_processes.entries()) {
        // 清除超时定时器
        if (managed_process.timer) {
            clearTimeout(managed_process.timer);
        }
        // 同步杀死进程树
        forceKillProcessTreeSync(pid);
        console.log(`[bash_manager] Killed background process ${pid}`);
    }
    background_processes.clear();
}

// 注册进程退出时的清理函数
function registerCleanupHandlers(): void {
    // beforeExit 可以执行异步操作
    process.on('beforeExit', async () => {
        await cleanupAllBackgroundProcesses();
    });

    // exit 只能执行同步操作
    process.on('exit', () => {
        cleanupAllBackgroundProcessesSync();
    });

    // 信号处理 - 只清理后台进程，不退出进程（由主程序控制）
    process.on('SIGINT', () => {
        cleanupAllBackgroundProcessesSync();
    });
    process.on('SIGTERM', () => {
        cleanupAllBackgroundProcessesSync();
    });
}

// 只注册一次
if (!process.env.__BASH_MANAGER_CLEANUP_REGISTERED__) {
    registerCleanupHandlers();
    process.env.__BASH_MANAGER_CLEANUP_REGISTERED__ = 'true';
}
