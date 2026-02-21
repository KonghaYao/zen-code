/**
 * Cron 任务执行器
 * 调用 LangGraph API 执行任务
 */

import type { CronTask, CronLogStatus } from './types.js';
import type { CronStorage } from './storage.js';
import { replaceVariables } from './variable-replacer.js';

// LangGraph API 配置
const LANGGRAPH_API_URL = process.env.LANGGRAPH_API_URL || 'http://127.0.0.1:8124';

export interface ExecutorResult {
    success: boolean;
    threadId?: string;
    error?: string;
}

export class CronExecutor {
    private storage: CronStorage;
    private maxExecutionTime: number; // 最大执行时间（毫秒）

    constructor(storage: CronStorage, options?: { maxExecutionTime?: number }) {
        this.storage = storage;
        this.maxExecutionTime = options?.maxExecutionTime ?? 10 * 60 * 1000; // 默认 10 分钟
    }

    /**
     * 执行任务
     * @param task 任务配置
     * @param logId 日志 ID
     * @returns 执行结果
     */
    async execute(task: CronTask, logId: string): Promise<ExecutorResult> {
        try {
            // 1. 替换变量
            const prompt = replaceVariables(task.prompt, task.variables);
            console.log(`[Cron] Executing task "${task.name}" with prompt: ${prompt.substring(0, 100)}...`);

            // 2. 创建 LangGraph Thread
            const thread = await this.createThread(task.agent_id);
            console.log(`[Cron] Created thread: ${thread.thread_id}`);

            // 3. 更新日志中的 thread_id
            await this.storage.updateLog(logId, { thread_id: thread.thread_id });

            // 4. 执行 Agent
            await this.runAgent(thread.thread_id, task.agent_id, prompt);

            // 5. 更新日志状态为成功
            await this.storage.updateLog(logId, {
                status: 'success',
                finished_at: new Date().toISOString(),
            });

            return {
                success: true,
                threadId: thread.thread_id,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Cron] Task execution failed:`, errorMessage);

            // 更新日志状态为失败
            await this.storage.updateLog(logId, {
                status: 'failed',
                error_message: errorMessage,
                finished_at: new Date().toISOString(),
            });

            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * 创建 LangGraph Thread
     * @param agentId Agent ID
     * @returns Thread 信息
     */
    private async createThread(agentId: string): Promise<{ thread_id: string }> {
        const response = await fetch(`${LANGGRAPH_API_URL}/api/langgraph/threads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assistant_id: agentId,
                metadata: {
                    source: 'cron',
                    created_at: new Date().toISOString(),
                },
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to create thread: ${response.status} ${text}`);
        }

        return response.json();
    }

    /**
     * 执行 Agent
     * @param threadId Thread ID
     * @param agentId Agent ID
     * @param prompt 用户输入
     */
    private async runAgent(threadId: string, agentId: string, prompt: string): Promise<void> {
        const response = await fetch(`${LANGGRAPH_API_URL}/api/langgraph/threads/${threadId}/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assistant_id: 'swarm',
                input: {
                    messages: [
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    agent_id: agentId,
                },
                config: {
                    configurable: {
                        agent_id: agentId,
                    },
                },
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to run agent: ${response.status} ${text}`);
        }

        // 等待执行完成（通过 stream 方式）
        await this.waitForCompletion(threadId);
    }

    /**
     * 等待执行完成
     * @param threadId Thread ID
     */
    private async waitForCompletion(threadId: string): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < this.maxExecutionTime) {
            try {
                // 获取 thread 状态
                const response = await fetch(`${LANGGRAPH_API_URL}/api/langgraph/threads/${threadId}/state`);

                if (!response.ok) {
                    throw new Error(`Failed to get thread state: ${response.status}`);
                }

                const state = await response.json();

                // 检查是否完成
                if (state.next && state.next.length === 0) {
                    // 没有下一个节点，表示执行完成
                    return;
                }

                // 等待一段时间后重试
                await this.sleep(1000);
            } catch (error) {
                console.warn(`[Cron] Error checking thread state:`, error);
                await this.sleep(2000);
            }
        }

        throw new Error(`Execution timeout after ${this.maxExecutionTime}ms`);
    }

    /**
     * 睡眠
     * @param ms 毫秒
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
