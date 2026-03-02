/**
 * Cron 任务执行器
 * 调用 LangGraph API 执行任务
 */

import type { CronTask } from './types.js';
import type { CronStorage } from './storage.js';
import { replaceVariables } from './variable-replacer.js';

export interface ExecutorOptions {
    apiBaseUrl?: string;
    maxExecutionTime?: number; // 最大执行时间（毫秒）
}

export interface ExecutorResult {
    success: boolean;
    threadId?: string;
    error?: string;
}

export class CronExecutor {
    private storage: CronStorage;
    private apiBaseUrl: string;
    private maxExecutionTime: number;

    constructor(storage: CronStorage, options: ExecutorOptions = {}) {
        this.storage = storage;
        this.apiBaseUrl = options.apiBaseUrl ?? process.env.LANGGRAPH_API_URL ?? 'http://127.0.0.1:8124';
        this.maxExecutionTime = options.maxExecutionTime ?? 10 * 60 * 1000; // 默认 10 分钟
    }

    /**
     * 执行任务
     * @param task 任务配置
     * @param logId 日志 ID
     * @returns 执行结果
     */
    async execute(task: CronTask, logId: string): Promise<ExecutorResult> {
        try {
            // 校验必填字段
            // agent_id: initial_state 中的值优先，fallback 到 task.agent_id
            const agentId = (task.initial_state?.agent_id as string | undefined) ?? task.agent_id;
            const cwd = task.initial_state?.cwd as string | undefined;
            const modelId = task.initial_state?.model_id as string | undefined;

            if (!agentId) {
                await this.storage.updateLog(logId, {
                    status: 'failed',
                    error_message: 'Task is missing agent_id, skipping execution',
                    finished_at: new Date().toISOString(),
                });
                return { success: false, error: 'Missing agent_id' };
            }

            if (!cwd) {
                await this.storage.updateLog(logId, {
                    status: 'failed',
                    error_message: 'Task is missing cwd (workspace path) in initial_state, skipping execution',
                    finished_at: new Date().toISOString(),
                });
                return { success: false, error: 'Missing cwd' };
            }

            if (!modelId) {
                // model_id 未指定时使用 agent 默认模型，打印警告
                console.warn(
                    `[Cron] Task "${task.name}" has no model_id in initial_state, ` +
                        `falling back to agent's default model`,
                );
            }

            // 1. 替换变量
            const prompt = replaceVariables(task.prompt, task.variables);
            console.log(`[Cron] Executing task "${task.name}" with prompt: ${prompt.substring(0, 100)}...`);

            // 2. 创建 LangGraph Thread
            const thread = await this.createThread({ cwd });
            console.log(`[Cron] Created thread: ${thread.thread_id}`);

            // 3. 更新日志中的 thread_id
            await this.storage.updateLog(logId, { thread_id: thread.thread_id });

            // 4. 执行 Agent（合并 initial_state）
            await this.runAgent(thread.thread_id, agentId, prompt, task.initial_state);

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
     * @returns Thread 信息
     */
    private async createThread(props: { cwd: string }): Promise<{ thread_id: string }> {
        const response = await fetch(`${this.apiBaseUrl}/api/langgraph/threads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // 始终使用 'swarm' graph，agentId 是应用层概念，通过 input.agent_id 传递
                assistant_id: 'swarm',
                metadata: {
                    path: props.cwd,
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
     * @param initialState 初始 state 参数（包含 cwd、model_id、provider_type 等）
     */
    private async runAgent(
        threadId: string,
        agentId: string,
        prompt: string,
        initialState: Record<string, unknown> = {},
    ): Promise<void> {
        const resolvedAgentId = (initialState.agent_id as string | undefined) ?? agentId;

        const response = await fetch(`${this.apiBaseUrl}/api/langgraph/threads/${threadId}/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assistant_id: 'swarm',
                input: {
                    // 先展开 initial_state（cwd、model_id、provider_type 等）
                    ...initialState,
                    // messages 和 agent_id 始终以此处构造的为准，不允许被 initialState 覆盖
                    messages: [{ type: 'human', content: prompt }],
                    agent_id: resolvedAgentId,
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
                const response = await fetch(`${this.apiBaseUrl}/api/langgraph/threads/${threadId}/state`);

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
