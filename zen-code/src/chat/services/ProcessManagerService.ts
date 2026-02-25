import pidusage from 'pidusage';
import type { ManagedProcess } from '@langgraph-js/agent-middlewares';
import { background_processes } from '@langgraph-js/agent-middlewares';
import type { ProcessInfo } from '../types.js';

export class ProcessManagerService {
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
