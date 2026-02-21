/**
 * Task Preview Panel - 任务预览面板
 * 独立显示选中任务的详细信息
 */

import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { TaskNode } from '@codegraph/config';
import { useInput } from 'ink-pro';

interface TaskPreviewPanelProps {
    task: TaskNode;
    onClose: () => void;
    onExecuteTask?: (task: TaskNode) => void;
    onDelete?: (task: TaskNode) => void;
}

// 状态配置
const STATUS_CONFIG = {
    pickup: { emoji: '📥', color: 'cyan' as const, label: '待领取' },
    running: { emoji: '🔄', color: 'yellow' as const, label: '运行中' },
    complete: { emoji: '✅', color: 'green' as const, label: '已完成' },
    error: { emoji: '❌', color: 'red' as const, label: '失败' },
    review: { emoji: '👀', color: 'blue' as const, label: '待审核' },
    feedback: { emoji: '💬', color: 'magenta' as const, label: '待反馈' },
};

const COMPLEXITY_CONFIG = {
    simple: { emoji: '🟢', label: '简单' },
    medium: { emoji: '🟡', label: '中等' },
    complex: { emoji: '🔴', label: '复杂' },
};

const TaskPreviewPanel: React.FC<TaskPreviewPanelProps> = ({ task, onClose, onExecuteTask, onDelete }) => {
    useInput((_, key) => {
        if (key.escape) {
            onClose();
        } else if (key.return && onExecuteTask) {
            // Enter 键：执行任务（如果可执行）
            const canExecute = task.status === 'pickup' || task.status === 'error' || task.status === 'feedback';
            if (canExecute) {
                onExecuteTask(task);
            }
        } else if ((key.backspace || key.delete) && onDelete) {
            // Backspace/Delete 键：删除任务
            onDelete(task);
        }
    });

    const statusInfo = task.status ? STATUS_CONFIG[task.status] : STATUS_CONFIG.pickup;
    const canExecute = task.status === 'pickup' || task.status === 'error' || task.status === 'feedback';
    const complexityInfo = task.complexity ? COMPLEXITY_CONFIG[task.complexity] : null;

    return (
        <Box flexDirection="column" paddingX={1}>
            {/* 标题栏 */}
            <Box borderStyle="single" paddingX={1} marginBottom={1}>
                <Text bold color="cyan">
                    {statusInfo.emoji} 任务预览
                </Text>
                <Box flexGrow={1} />
                {canExecute && onExecuteTask && <Text color="green">Enter 执行</Text>}
                {onDelete && (
                    <>
                        {canExecute && onExecuteTask && <Text dimColor> | </Text>}
                        <Text color="red">Delete 删除</Text>
                    </>
                )}
                <Text dimColor> | </Text>
                <Text dimColor>Esc 退出</Text>
            </Box>

            {/* 任务标题 */}
            <Box marginBottom={1}>
                <Text bold color="white">
                    {task.title}
                </Text>
            </Box>

            {/* 任务状态 */}
            <Box marginBottom={1}>
                <Text color={statusInfo.color}>
                    {statusInfo.emoji} {statusInfo.label}
                </Text>
                {complexityInfo && (
                    <>
                        <Text> • </Text>
                        <Text>
                            {complexityInfo.emoji} {complexityInfo.label}
                        </Text>
                    </>
                )}
                {task.estimatedTime && (
                    <>
                        <Text> • </Text>
                        <Text>⏱️ {task.estimatedTime}</Text>
                    </>
                )}
            </Box>

            {/* 任务描述 */}
            <Box marginBottom={1} flexDirection="column">
                <Text color="gray" bold>
                    描述:
                </Text>
                <Text>{task.description}</Text>
            </Box>

            {/* 任务 ID */}
            <Box marginBottom={1}>
                <Text color="gray">ID: </Text>
                <Text dimColor>{task.id}</Text>
            </Box>

            {/* 分配信息 */}
            {task.agentType && (
                <Box marginBottom={1}>
                    <Text color="gray">建议 Agent: </Text>
                    <Text color="yellow">{task.agentType}</Text>
                </Box>
            )}

            {task.assignedTo && (
                <Box marginBottom={1}>
                    <Text color="gray">分配给: </Text>
                    <Text color="blue">{task.assignedTo}</Text>
                </Box>
            )}

            {task.threadId && (
                <Box marginBottom={1}>
                    <Text color="gray">Thread ID: </Text>
                    <Text dimColor>{task.threadId}</Text>
                </Box>
            )}

            {/* 依赖任务 */}
            {task.dependencies && task.dependencies.length > 0 && (
                <Box marginBottom={1} flexDirection="column">
                    <Text color="gray" bold>
                        依赖任务:
                    </Text>
                    <Text dimColor>{task.dependencies.join(', ')}</Text>
                </Box>
            )}

            {/* 验收标准 */}
            {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
                <Box marginBottom={1} flexDirection="column">
                    <Text color="gray" bold>
                        验收标准:
                    </Text>
                    {task.acceptanceCriteria.map((c, i) => (
                        <Text key={`ac-${i}-${task.id}`} dimColor>
                            {i + 1}. {c}
                        </Text>
                    ))}
                </Box>
            )}

            {/* 子任务列表 */}
            {task.children && task.children.length > 0 && (
                <Box flexDirection="column">
                    <Text color="gray" bold>
                        子任务 ({task.children.length}):
                    </Text>
                    {task.children.map((child, idx) => {
                        const childStatus = child.status ? STATUS_CONFIG[child.status] : STATUS_CONFIG.pickup;
                        return (
                            <Box key={child.id}>
                                <Text color={childStatus.color}>
                                    {childStatus.emoji} {idx + 1}. {child.title}
                                </Text>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {/* 错误信息 */}
            {task.status === 'error' && task.error && (
                <Box marginTop={1} flexDirection="column" borderStyle="single" paddingX={1}>
                    <Text color="red" bold>
                        错误:
                    </Text>
                    <Text color="red">{task.error.message}</Text>
                </Box>
            )}
        </Box>
    );
};

export default TaskPreviewPanel;
