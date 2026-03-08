// @ts-ignore - pidusage has no type declarations
import pidusage from 'pidusage';
import type { ManagedProcess } from '@langgraph-js/agent-middlewares';
import { background_processes } from '@langgraph-js/agent-middlewares';
import type { ProcessInfo } from '../types.js';

const GC_INTERVAL_MS = 5000;

export class ProcessManagerService {
    constructor() {
        this.startGC();
    }

    /**
     * 启动定时 GC，每 5s 扫描一次全量进程状态
     * 使用 process.kill(pid, 0) 跨平台探测进程是否存活
     * 已死亡的进程从 background_processes Map 中移除
     */
    private startGC(): void {
        const timer = setInterval(() => {
            for (const [pid] of background_processes) {
                try {
                    process.kill(pid, 0);
                    // 进程存活，跳过
                } catch (err: any) {
                    if (err.code === 'ESRCH') {
                        // 进程已死亡，从 Map 中移除
                        background_processes.delete(pid);
                    }
                    // EPERM：进程存在但无权访问，保留记录
                }
            }
        }, GC_INTERVAL_MS);
        // 不持有事件循环引用，避免阻塞进程退出
        timer.unref();
    }

    /**
     * 获取所有进程信息（包含资源使用率）
     */
    async getProcessList(): Promise<ProcessInfo[]> {
        const processes: ProcessInfo[] = [];

        for (const [pid, managed] of background_processes) {
            try {
                const stats = await pidusage(pid);
                processes.push({
                    pid,
                    command: managed.command,
                    startTime: managed.startTime,
                    duration: Date.now() - managed.startTime,
                    cpu: stats.cpu,
                    memory: stats.memory,
                    status: this.checkStatus(managed),
                });
            } catch {
                // 进程可能已结束
                processes.push({
                    pid,
                    command: managed.command,
                    startTime: managed.startTime,
                    duration: Date.now() - managed.startTime,
                    cpu: 0,
                    memory: 0,
                    status: 'stopped',
                });
            }
        }

        return processes;
    }

    /**
     * 关闭进程
     */
    killProcess(pid: number): boolean {
        const managed = background_processes.get(pid);
        if (!managed) return false;

        managed.process.kill('SIGTERM');
        // 从 Map 中移除
        background_processes.delete(pid);
        return true;
    }

    /**
     * 获取进程输出
     */
    getProcessOutput(pid: number): { stdout: string; stderr: string } | null {
        const managed = background_processes.get(pid);
        if (!managed) return null;

        return {
            stdout: managed.stdout.join(''),
            stderr: managed.stderr.join(''),
        };
    }

    private checkStatus(managed: ManagedProcess): 'running' | 'stopped' | 'zombie' {
        try {
            // 发送信号 0 检查进程是否存在
            process.kill(managed.process.pid!, 0);
            return 'running';
        } catch {
            return 'stopped';
        }
    }
}

export const processManager = new ProcessManagerService();
