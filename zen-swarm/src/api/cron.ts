/**
 * Cron Router
 * tRPC 路由定义
 */

import { z } from 'zod';
import { router, publicProcedure, handleNotFound } from './trpc.js';

// ========================================
// Schemas
// ========================================

const CronTaskInputSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    cron_expression: z.string().min(5, 'Cron expression must have at least 5 fields'),
    prompt: z.string().min(1, 'Prompt is required'),
    agent_id: z.string().min(1, 'Agent ID is required'),
    enabled: z.boolean().optional().default(true),
    max_retries: z.number().min(0).max(10).optional().default(0),
    variables: z.record(z.string(), z.string()).optional().default({}),
});

const UpdateCronTaskSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    cron_expression: z.string().min(5, 'Cron expression must have at least 5 fields').optional(),
    prompt: z.string().min(1, 'Prompt is required').optional(),
    agent_id: z.string().min(1, 'Agent ID is required').optional(),
    enabled: z.boolean().optional(),
    max_retries: z.number().min(0).max(10).optional(),
    variables: z.record(z.string(), z.string()).optional(),
});

// ========================================
// Router
// ========================================

export const cronRouter = router({
    // ========================================
    // Task Operations
    // ========================================

    /**
     * 列出所有任务
     */
    listTasks: publicProcedure.query(async ({ ctx }) => {
        return ctx.cronStorage.getAllTasks();
    }),

    /**
     * 获取单个任务
     */
    getTask: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const task = await ctx.cronStorage.getTask(input.id);
        if (!task) {
            handleNotFound('CronTask', input.id);
        }
        return task;
    }),

    /**
     * 创建任务
     */
    createTask: publicProcedure.input(CronTaskInputSchema).mutation(async ({ ctx, input }) => {
        // 验证 Agent 是否存在
        const agent = await ctx.agentPackage.storage.getAgent(input.agent_id);
        if (!agent) {
            handleNotFound('Agent', input.agent_id);
        }

        // 创建任务
        await ctx.cronStorage.insertTask(input);

        // 调度任务
        const task = await ctx.cronStorage.getTask(input.id);
        if (task) {
            ctx.cronScheduler.scheduleTask(task);
        }

        return { id: input.id };
    }),

    /**
     * 更新任务
     */
    updateTask: publicProcedure.input(UpdateCronTaskSchema).mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;

        // 验证任务是否存在
        const existing = await ctx.cronStorage.getTask(id);
        if (!existing) {
            handleNotFound('CronTask', id);
        }

        // 如果更新了 agent_id，验证是否存在
        if (updates.agent_id) {
            const agent = await ctx.agentPackage.storage.getAgent(updates.agent_id);
            if (!agent) {
                handleNotFound('Agent', updates.agent_id);
            }
        }

        // 更新任务
        await ctx.cronStorage.updateTask(input);

        // 重新调度任务
        const task = await ctx.cronStorage.getTask(id);
        if (task) {
            ctx.cronScheduler.scheduleTask(task);
        }

        return { id };
    }),

    /**
     * 删除任务
     */
    deleteTask: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        // 取消调度
        ctx.cronScheduler.unscheduleTask(input.id);

        // 删除任务（会级联删除日志）
        await ctx.cronStorage.deleteTask(input.id);

        return { id: input.id };
    }),

    /**
     * 切换任务启用状态
     */
    toggleTask: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        const task = await ctx.cronStorage.getTask(input.id);
        if (!task) {
            handleNotFound('CronTask', input.id);
        }

        const enabled = !task!.enabled;
        await ctx.cronStorage.updateTask({ id: input.id, enabled });

        if (enabled) {
            // 启用：重新调度
            const updated = await ctx.cronStorage.getTask(input.id);
            if (updated) {
                ctx.cronScheduler.scheduleTask(updated);
            }
        } else {
            // 禁用：取消调度
            ctx.cronScheduler.unscheduleTask(input.id);
        }

        return { id: input.id, enabled };
    }),

    /**
     * 手动触发任务
     */
    triggerTask: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        const logId = await ctx.cronScheduler.triggerManually(input.id);
        return { logId };
    }),

    // ========================================
    // Log Operations
    // ========================================

    /**
     * 获取任务的执行日志
     */
    getLogs: publicProcedure
        .input(
            z.object({
                taskId: z.string(),
                limit: z.number().min(1).max(100).optional().default(50),
                offset: z.number().min(0).optional().default(0),
            }),
        )
        .query(async ({ ctx, input }) => {
            return ctx.cronStorage.getLogsByTaskId(input.taskId, input.limit, input.offset);
        }),

    /**
     * 获取最近的执行日志
     */
    getRecentLogs: publicProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).optional().default(50),
            }),
        )
        .query(async ({ ctx, input }) => {
            return ctx.cronStorage.getRecentLogs(input.limit);
        }),

    /**
     * 获取单个日志详情
     */
    getLog: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const log = await ctx.cronStorage.getLog(input.id);
        if (!log) {
            handleNotFound('CronLog', input.id);
        }
        return log;
    }),

    /**
     * 清理任务的执行日志
     */
    clearLogs: publicProcedure
        .input(
            z.object({
                taskId: z.string(),
                before: z.string().datetime().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const count = await ctx.cronStorage.deleteLogsBefore(
                input.taskId,
                input.before ?? new Date().toISOString(),
            );
            return { deletedCount: count };
        }),

    /**
     * 清空任务的所有日志
     */
    clearAllLogs: publicProcedure.input(z.object({ taskId: z.string() })).mutation(async ({ ctx, input }) => {
        const count = await ctx.cronStorage.clearLogsByTaskId(input.taskId);
        return { deletedCount: count };
    }),

    // ========================================
    // Queue Status
    // ========================================

    /**
     * 获取队列状态
     */
    getQueueStatus: publicProcedure.query(async ({ ctx }) => {
        return ctx.cronScheduler.getQueueStatus();
    }),

    /**
     * 获取调度器状态
     */
    getSchedulerStatus: publicProcedure.query(async ({ ctx }) => {
        return {
            isRunning: ctx.cronScheduler.isActive(),
            scheduledCount: ctx.cronScheduler.getScheduledCount(),
        };
    }),
});
