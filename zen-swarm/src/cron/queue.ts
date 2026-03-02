/**
 * Cron 执行队列
 * 管理任务执行的排队和并发控制
 */

import type { QueuedExecution } from './types.js';

export class ExecutionQueue {
    // 当前运行中的任务 (taskId -> logId)
    private running: Map<string, string> = new Map();
    // 排队等待的任务
    private queue: QueuedExecution[] = [];

    /**
     * 检查任务是否可以立即执行
     * @param taskId 任务 ID
     * @returns 如果任务不在运行中则返回 true
     */
    canExecute(taskId: string): boolean {
        return !this.running.has(taskId);
    }

    /**
     * 将任务标记为运行中
     * @param taskId 任务 ID
     * @param logId 日志 ID
     */
    markRunning(taskId: string, logId: string): void {
        this.running.set(taskId, logId);
    }

    /**
     * 将任务标记为完成
     * @param taskId 任务 ID
     */
    markCompleted(taskId: string): void {
        this.running.delete(taskId);
    }

    /**
     * 将任务加入队列
     * @param taskId 任务 ID
     * @param logId 日志 ID
     */
    enqueue(taskId: string, logId: string): void {
        this.queue.push({
            taskId,
            logId,
            queuedAt: new Date().toISOString(),
        });
    }

    /**
     * 将任务插入队列头部（用于放回被误出队的项，保持 FIFO 顺序）
     * @param item 原始排队项
     */
    enqueueFirst(item: QueuedExecution): void {
        this.queue.unshift(item);
    }

    /**
     * 获取下一个等待执行的任务
     * @returns 队列中的下一个任务，如果队列为空则返回 null
     */
    dequeue(): QueuedExecution | null {
        return this.queue.shift() ?? null;
    }

    /**
     * 从队列中取出指定 taskId 的第一个排队项
     * @param taskId 任务 ID
     * @returns 找到的排队项，如果不存在则返回 null
     */
    dequeueByTaskId(taskId: string): QueuedExecution | null {
        const index = this.queue.findIndex((item) => item.taskId === taskId);
        if (index === -1) return null;
        const [item] = this.queue.splice(index, 1);
        return item;
    }

    /**
     * 获取指定任务的队列位置
     * @param taskId 任务 ID
     * @returns 队列位置（从 0 开始），如果不在队列中则返回 -1
     */
    getQueuePosition(taskId: string): number {
        return this.queue.findIndex((item) => item.taskId === taskId);
    }

    /**
     * 获取队列长度
     */
    getQueueLength(): number {
        return this.queue.length;
    }

    /**
     * 获取运行中的任务数量
     */
    getRunningCount(): number {
        return this.running.size;
    }

    /**
     * 获取指定任务的运行日志 ID
     * @param taskId 任务 ID
     * @returns 日志 ID，如果任务不在运行中则返回 null
     */
    getRunningLogId(taskId: string): string | null {
        return this.running.get(taskId) ?? null;
    }

    /**
     * 清空队列
     */
    clear(): void {
        this.queue = [];
    }

    /**
     * 获取队列状态
     */
    getStatus(): {
        running: Array<{ taskId: string; logId: string }>;
        queued: QueuedExecution[];
    } {
        return {
            running: Array.from(this.running.entries()).map(([taskId, logId]) => ({
                taskId,
                logId,
            })),
            queued: [...this.queue],
        };
    }

    /**
     * 从队列中移除指定任务
     * @param taskId 任务 ID
     * @returns 是否成功移除
     */
    removeFromQueue(taskId: string): boolean {
        const index = this.queue.findIndex((item) => item.taskId === taskId);
        if (index !== -1) {
            this.queue.splice(index, 1);
            return true;
        }
        return false;
    }
}
