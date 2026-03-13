/**
 * 监控面板 tRPC Router
 */

import { z } from 'zod';
import { router, publicProcedure } from './trpc.js';
import { processMonitor } from '../services/processMonitor.js';
import type { ProcessInfo, ProcessTreeNode, SystemStats } from '../services/processMonitor.js';

export const monitorRouter = router({
    // 获取进程列表
    listProcesses: publicProcedure
        .input(
            z.object({
                view: z.enum(['zen-swarm', 'system']).default('zen-swarm'),
            }),
        )
        .query(async ({ input }) => {
            if (input.view === 'zen-swarm') {
                return await processMonitor.getZenSwarmProcesses();
            }
            return await processMonitor.getProcessList();
        }),

    // 获取单个进程详情
    getProcess: publicProcedure.input(z.object({ pid: z.number() })).query(async ({ input }) => {
        const processes = await processMonitor.getProcessList();
        return processes.find((p) => p.pid === input.pid) || null;
    }),

    // 获取进程树
    getProcessTree: publicProcedure
        .input(
            z.object({
                rootPid: z.number().optional(),
            }),
        )
        .query(async ({ input }) => {
            return await processMonitor.getProcessTree(input.rootPid);
        }),

    // 终止进程
    killProcess: publicProcedure
        .input(
            z.object({
                pid: z.number(),
                signal: z.enum(['SIGTERM', 'SIGKILL']).default('SIGTERM'),
            }),
        )
        .mutation(async ({ input }) => {
            const success = await processMonitor.killProcess(input.pid, input.signal);
            return { success };
        }),

    // 获取进程日志
    getProcessLogs: publicProcedure
        .input(
            z.object({
                pid: z.number(),
                lines: z.number().default(100),
            }),
        )
        .query(async ({ input }) => {
            return await processMonitor.getLogs(input.pid, input.lines);
        }),

    // 获取系统资源概览
    getSystemStats: publicProcedure.query(async () => {
        return await processMonitor.getSystemStats();
    }),
});
