/**
 * useTaskExecutor Hook
 *
 * Manages task execution logic.
 * Provides stable callback for task execution with memoized dependencies.
 *
 * Follows Vercel best practices:
 * - Functional setState for stable callbacks (rerender-functional-setstate)
 * - useCallback for memoization
 */

import { useCallback, useMemo } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import { useSettings } from '../context/SettingsContext';
import { notify } from '../../utils/notify';
import { metadataOfChat } from '../../utils/metadata';
import type { TaskNode } from '@codegraph/config';

interface UseTaskExecutorResult {
    handleExecuteTask: (task: TaskNode) => void;
}

/**
 * Format task node to human-readable prompt
 */
function formatTaskToPrompt(task: TaskNode): string {
    let prompt = `# 任务：${task.title}\n\n`;
    prompt += `**描述：**\n${task.description}\n\n`;

    if (task.agentType) {
        prompt += `**建议 Agent 类型：** ${task.agentType}\n\n`;
    }

    if (task.estimatedTime) {
        prompt += `**预估时间：** ${task.estimatedTime}\n\n`;
    }

    if (task.complexity) {
        prompt += `**复杂度：** ${task.complexity}\n\n`;
    }

    if (task.dependencies && task.dependencies.length > 0) {
        prompt += `**依赖任务：**\n${task.dependencies.map((id) => `- ${id}`).join('\n')}\n\n`;
    }

    if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
        prompt += `**验收标准：**\n${task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n`;
    }

    if (task.children && task.children.length > 0) {
        prompt += `**子任务：**\n`;
        task.children.forEach((child, idx) => {
            prompt += `\n### 子任务 ${idx + 1}: ${child.title}\n`;
            prompt += `${child.description}\n`;
            if (child.acceptanceCriteria && child.acceptanceCriteria.length > 0) {
                prompt += `验收标准：\n${child.acceptanceCriteria.map((c) => `- ${c}`).join('\n')}\n`;
            }
        });
        prompt += '\n';
    }

    return prompt.trim();
}

/**
 * Handle task execution
 *
 * @returns Task execution handler
 *
 * Example:
 * ```tsx
 * const { handleExecuteTask } = useTaskExecutor({ closePanel });
 *
 * <TaskPanel onExecuteTask={handleExecuteTask} />
 * ```
 */
export function useTaskExecutor(options: { closePanel: () => void }): UseTaskExecutorResult {
    const { sendMessage, createNewChat } = useChat();
    const { extraParams } = useSettings();
    const { closePanel } = options;

    // Memoize extra params to avoid unnecessary recreations
    const taskExtraParams = useMemo(() => {
        return {
            ...extraParams,
            is_in_task: true,
        };
    }, [extraParams]);

    const handleExecuteTask = useCallback(
        (task: TaskNode) => {
            const taskPrompt = formatTaskToPrompt(task);

            const content = [
                {
                    type: 'human' as const,
                    content: `${taskPrompt}\n\n请你先写一个 TODO LIST 然后开始这个任务，最后完成任务的时候，使用 commit_task`,
                },
            ];

            createNewChat(metadataOfChat)
                .then(() => {
                    return sendMessage(content, {
                        extraParams: taskExtraParams,
                        metadata: metadataOfChat,
                    });
                })
                .then(() => {
                    notify('任务已发送给 Agent');
                    closePanel();
                })
                .catch((error) => {
                    console.error('Task execution failed:', error);
                    notify('任务执行失败');
                });
        },
        [sendMessage, createNewChat, taskExtraParams, closePanel],
    );

    return { handleExecuteTask };
}
