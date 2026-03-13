/**
 * processes 路由 - 对应 ProcessManager
 * 管理后台进程（background_processes）
 */

import { z } from 'zod';
import { router, procedure } from '../trpc.js';

// 进程注册表（进程内单例）
const processRegistry = new Map<
    string,
    {
        id: string;
        name: string;
        pid?: number;
        status: 'running' | 'stopped' | 'error';
        startedAt: number;
    }
>();

export const processesRouter = router({
    list: procedure.query(async () => {
        return Array.from(processRegistry.values());
    }),

    get: procedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
        const proc = processRegistry.get(input.id);
        if (!proc) {
            throw new Error(`Process '${input.id}' not found`);
        }
        return proc;
    }),

    kill: procedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
        const proc = processRegistry.get(input.id);
        if (!proc) {
            throw new Error(`Process '${input.id}' not found`);
        }

        if (proc.pid) {
            try {
                process.kill(proc.pid, 'SIGTERM');
            } catch {
                // 进程可能已退出
            }
        }

        proc.status = 'stopped';
        processRegistry.set(input.id, proc);
        return { success: true };
    }),
});

// 导出进程注册表，供其他模块注册进程
export { processRegistry };
