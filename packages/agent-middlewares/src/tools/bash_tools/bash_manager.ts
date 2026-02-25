import type { ResultPromise } from 'execa';

export interface ManagedProcess {
    process: ResultPromise;
    stdout: string[];
    stderr: string[];
    command: string; // 执行的命令
    startTime: number; // 启动时间戳 (ms)
}

export const background_processes = new Map<number, ManagedProcess>();
