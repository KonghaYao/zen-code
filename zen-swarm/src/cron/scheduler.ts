/**
 * Cron 调度器
 * 使用 node-cron 调度定时任务
 */

import cron, { type ScheduledTask } from 'node-cron';
import type { CronTask } from './types.js';
import type { CronStorage } from './storage.js';
import type { CronExecutor } from './executor.js';
import { ExecutionQueue } from './queue.js';

export class CronScheduler {
    private storage: CronStorage;
    private executor: CronExecutor;
    private queue: ExecutionQueue;
    private scheduledJobs: Map<string, ScheduledTask> = new Map();
    private isRunning: boolean = false;

    constructor(storage: CronStorage, executor: CronExecutor) {
        this.storage = storage;
        this.executor = executor;
        this.queue = new ExecutionQueue();
    }

    /**
     * 启动调度器
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('[Cron] Scheduler is already running');
            return;
        }

        console.log('[Cron] Starting scheduler...');
        this.isRunning = true;

        // 加载所有启用的任务
        const tasks = await this.storage.getEnabledTasks();
        console.log(`[Cron] Found ${tasks.length} enabled tasks`);

        for (const task of tasks) {
            this.scheduleTask(task);
        }

        console.log('[Cron] Scheduler started');
    }

    /**
     * 停止调度器
     */
    async stop(): Promise<void> {
        console.log('[Cron] Stopping scheduler...');
        this.isRunning = false;

        for (const [_, job] of this.scheduledJobs) {
            job.stop();
        }
        this.scheduledJobs.clear();

        console.log('[Cron] Scheduler stopped');
    }

    /**
     * 调度任务
     * @param task 任务配置
     */
    scheduleTask(task: CronTask): void {
        // 如果已存在调度，先取消
        if (this.scheduledJobs.has(task.id)) {
            this.scheduledJobs.get(task.id)!.stop();
            this.scheduledJobs.delete(task.id);
        }

        // 如果任务未启用，不调度
        if (!task.enabled) {
            console.log(`[Cron] Task "${task.name}" is disabled, skipping`);
            return;
        }

        // 验证 cron 表达式
        if (!cron.validate(task.cron_expression)) {
            console.error(`[Cron] Invalid cron expression for task "${task.name}": ${task.cron_expression}`);
            return;
        }

        // 创建调度任务
        const job = cron.schedule(task.cron_expression, () => {
            this.onTrigger(task);
        });

        this.scheduledJobs.set(task.id, job);
        console.log(`[Cron] Scheduled task "${task.name}" with expression: ${task.cron_expression}`);
    }

    /**
     * 取消任务调度
     * @param taskId 任务 ID
     */
    unscheduleTask(taskId: string): void {
        if (this.scheduledJobs.has(taskId)) {
            this.scheduledJobs.get(taskId)!.stop();
            this.scheduledJobs.delete(taskId);
            console.log(`[Cron] Unscheduled task: ${taskId}`);
        }
    }

    /**
     * 重新调度任务
     * @param taskId 任务 ID
     */
    async rescheduleTask(taskId: string): Promise<void> {
        const task = await this.storage.getTask(taskId);
        if (task) {
            this.scheduleTask(task);
        }
    }

    /**
     * 任务触发时的处理
     * @param task 任务配置
     */
    private async onTrigger(task: CronTask): Promise<void> {
        console.log(`[Cron] Task "${task.name}" triggered at ${new Date().toISOString()}`);

        try {
            // 创建执行日志
            const logId = await this.storage.insertLog({
                cron_task_id: task.id,
                status: 'pending',
                started_at: new Date().toISOString(),
                retry_count: 0,
            });

            // 检查是否可以立即执行
            if (this.queue.canExecute(task.id)) {
                // 可以立即执行
                this.queue.markRunning(task.id, logId);
                await this.storage.updateLog(logId, { status: 'running' });
                await this.executeWithRetry(task, logId);
            } else {
                // 需要排队
                console.log(`[Cron] Task "${task.name}" is already running, queuing...`);
                await this.storage.updateLog(logId, {
                    status: 'queued',
                    queued_at: new Date().toISOString(),
                });
                this.queue.enqueue(task.id, logId);
            }
        } catch (error) {
            console.error(`[Cron] Error triggering task "${task.name}":`, error);
        }
    }

    /**
     * 带重试的执行
     * @param task 任务配置
     * @param logId 日志 ID
     */
    private async executeWithRetry(task: CronTask, logId: string): Promise<void> {
        let retryCount = 0;
        const maxRetries = task.max_retries;

        while (retryCount <= maxRetries) {
            try {
                const result = await this.executor.execute(task, logId);

                if (result.success) {
                    // 执行成功
                    await this.markSuccess(task.id, logId);
                    return;
                }

                // 执行失败但未达到重试上限
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`[Cron] Retrying task "${task.name}" (${retryCount}/${maxRetries})`);
                    await this.storage.updateLog(logId, {
                        status: 'running',
                        retry_count: retryCount,
                    });
                    await this.sleep(1000 * Math.pow(2, retryCount)); // 指数退避
                    continue;
                }

                // 达到重试上限，记录失败
                throw new Error(`Max retries (${maxRetries}) exceeded`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[Cron] Execution error for task "${task.name}":`, errorMessage);

                // 标记执行失败
                await this.markFailed(task.id, logId, errorMessage);
                return;
            }
        }
    }

    /**
     * 标记执行成功并处理队列
     */
    private async markSuccess(taskId: string, logId: string): Promise<void> {
        this.queue.markCompleted(taskId);
        await this.storage.updateLog(logId, {
            status: 'success',
            finished_at: new Date().toISOString(),
        });
        await this.processQueue(taskId);
    }

    /**
     * 标记执行失败并处理队列
     */
    private async markFailed(taskId: string, logId: string, errorMessage: string): Promise<void> {
        this.queue.markCompleted(taskId);
        await this.storage.updateLog(logId, {
            status: 'failed',
            error_message: errorMessage,
            finished_at: new Date().toISOString(),
        });
        await this.processQueue(taskId);
    }

    /**
     * 处理队列中等待的任务
     * @param completedTaskId 刚完成的任务 ID
     */
    private async processQueue(completedTaskId: string): Promise<void> {
        // 直接从队列取出，避免检查和取出的时间差
        const next = this.queue.dequeue();

        if (next && next.taskId === completedTaskId) {
            console.log(`[Cron] Processing queued execution for task "${completedTaskId}"`);

            // 更新日志状态
            await this.storage.updateLog(next.logId, { status: 'running' });
            this.queue.markRunning(next.taskId, next.logId);

            // 获取任务配置并执行
            const task = await this.storage.getTask(next.taskId);
            if (task) {
                await this.executeWithRetry(task, next.logId);
            }
        }
    }

    /**
     * 手动触发任务
     * @param taskId 任务 ID
     * @returns 日志 ID
     */
    async triggerManually(taskId: string): Promise<string> {
        const task = await this.storage.getTask(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }

        console.log(`[Cron] Manually triggering task "${task.name}"`);

        // 创建执行日志
        const logId = await this.storage.insertLog({
            cron_task_id: task.id,
            status: 'pending',
            started_at: new Date().toISOString(),
            retry_count: 0,
        });

        // 检查是否可以立即执行
        if (this.queue.canExecute(task.id)) {
            this.queue.markRunning(task.id, logId);
            await this.storage.updateLog(logId, { status: 'running' });
            // 异步执行，不等待
            this.executeWithRetry(task, logId).catch((error) => {
                console.error(`[Cron] Manual trigger error:`, error);
            });
        } else {
            console.log(`[Cron] Task "${task.name}" is already running, queuing...`);
            await this.storage.updateLog(logId, {
                status: 'queued',
                queued_at: new Date().toISOString(),
            });
            this.queue.enqueue(task.id, logId);
        }

        return logId;
    }

    /**
     * 获取队列状态
     */
    getQueueStatus(): {
        running: Array<{ taskId: string; logId: string }>;
        queued: Array<{ taskId: string; logId: string; queuedAt: string }>;
    } {
        return this.queue.getStatus();
    }

    /**
     * 获取调度中的任务数量
     */
    getScheduledCount(): number {
        return this.scheduledJobs.size;
    }

    /**
     * 检查调度器是否运行中
     */
    isActive(): boolean {
        return this.isRunning;
    }

    /**
     * 睡眠
     * @param ms 毫秒
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
