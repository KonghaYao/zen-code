/**
 * Task Panel - 任务看板面板
 * 展示任务列表，支持状态过滤和任务执行
 *
 * 使用 TanStack Query 管理任务列表状态
 */

import React, { useCallback, useState, useRef } from 'react';
import { Box, Text, Spacer } from 'ink';
import { UniversalPanel } from 'ink-pro';
import { SelectItem } from 'ink-pro';
import { PanelConfig } from 'ink-pro';
import { TaskNode } from '@codegraph/config';
import { useTasks, useDeleteTask } from '../../hooks/useTasks';
import TaskPreviewPanel from './TaskPreviewPanel';

interface TaskPanelProps {
    onClose: () => void;
    onExecuteTask?: (task: TaskNode) => void;
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

const TaskPanel: React.FC<TaskPanelProps> = ({ onClose, onExecuteTask }) => {
    // 使用 TanStack Query 获取任务列表
    const { data: allTasks = [] } = useTasks();
    const deleteTask = useDeleteTask();

    // 预览任务状态
    const [previewTask, setPreviewTask] = useState<TaskNode | null>(null);

    // 使用 ref 存储 setPreviewTask，避免 onSelect 回调引用变化
    const setPreviewTaskRef = useRef(setPreviewTask);
    const onExecuteTaskRef = useRef(onExecuteTask);

    // 同步 ref
    React.useEffect(() => {
        setPreviewTaskRef.current = setPreviewTask;
    }, [setPreviewTask]);

    React.useEffect(() => {
        onExecuteTaskRef.current = onExecuteTask;
    }, [onExecuteTask]);

    // 关闭预览
    const handleClosePreview = useCallback(() => {
        setPreviewTask(null);
    }, []);

    // 删除任务
    const handleDeleteTask = useCallback(
        async (task: TaskNode) => {
            await deleteTask.mutateAsync(task.id);
            setPreviewTask((prev) => (prev?.id === task.id ? null : prev));
        },
        [deleteTask],
    );

    // 渲染函数 - 使用 useCallback 保持引用稳定
    const renderItem = useCallback((task: TaskNode, index: number, isSelected: boolean) => {
        const statusInfo = task.status ? STATUS_CONFIG[task.status] : STATUS_CONFIG.pickup;
        const complexityInfo = task.complexity ? COMPLEXITY_CONFIG[task.complexity] : null;

        return (
            <SelectItem key={`task-${task.id}`} isSelected={isSelected}>
                <Box>
                    <Text color="cyan" dimColor={statusInfo === STATUS_CONFIG.complete}>
                        {statusInfo.emoji} {index + 1}. {task.title}
                    </Text>
                    <Spacer />
                    <Text color="yellow" dimColor>
                        {statusInfo.label}
                    </Text>
                    {complexityInfo && (
                        <Text dimColor>
                            {complexityInfo.emoji} {complexityInfo.label}
                        </Text>
                    )}
                </Box>
            </SelectItem>
        );
    }, []);

    // 状态信息渲染函数 - 使用 useCallback 保持引用稳定
    const statusInfo = useCallback((filteredTasks: TaskNode[]) => {
        const runningCount = filteredTasks.filter((t) => t.status === 'running').length;
        const completeCount = filteredTasks.filter((t) => t.status === 'complete').length;
        const errorCount = filteredTasks.filter((t) => t.status === 'error').length;
        const canExecuteCount = filteredTasks.filter(
            (t) => t.status === 'pickup' || t.status === 'error' || t.status === 'feedback',
        ).length;

        return (
            <Text color="gray">
                运行: {runningCount} | 完成: {completeCount} | 失败: {errorCount}
                {canExecuteCount > 0 && <Text color="green"> | 可执行: {canExecuteCount}</Text>}
                <Text dimColor> | Backspace 删除</Text>
            </Text>
        );
    }, []);

    // onSelect 回调 - 使用 ref 避免依赖循环
    const handleSelectTask = useCallback((task: TaskNode) => {
        setPreviewTaskRef.current(task);
    }, []);

    // 使用 useMemo 缓存 panelConfig
    const panelConfig: PanelConfig<TaskNode> = React.useMemo(
        () => ({
            id: 'tasks',
            title: '任务看板',
            icon: '📋',
            dataSource: async () => allTasks,
            // 搜索配置
            searchable: true,
            searchFields: ['title', 'description'],
            searchPlaceholder: '搜索任务...',
            // 过滤配置
            filterable: true,
            filters: [
                {
                    id: 'all',
                    label: '全部',
                    predicate: () => true,
                },
                {
                    id: 'pickup',
                    label: '待领取',
                    predicate: (task: TaskNode) => task.status === 'pickup',
                },
                {
                    id: 'running',
                    label: '运行中',
                    predicate: (task: TaskNode) => task.status === 'running',
                },
                {
                    id: 'complete',
                    label: '已完成',
                    predicate: (task: TaskNode) => task.status === 'complete',
                },
                {
                    id: 'error',
                    label: '失败',
                    predicate: (task: TaskNode) => task.status === 'error',
                },
            ],
            defaultFilter: 'all',
            // 渲染配置
            itemHeight: 3, // 3行：标题+描述+进度
            visibleCount: 10,
            renderItem: renderItem,
            onSelect: handleSelectTask,
            onDelete: handleDeleteTask,
            showCount: true,
            statusInfo: statusInfo,
        }),
        [allTasks, renderItem, statusInfo, handleSelectTask, handleDeleteTask],
    );

    return (
        <>
            {previewTask ? (
                <TaskPreviewPanel
                    task={previewTask}
                    onClose={handleClosePreview}
                    onExecuteTask={onExecuteTask}
                    onDelete={handleDeleteTask}
                />
            ) : (
                <UniversalPanel config={panelConfig} onClose={onClose} />
            )}
        </>
    );
};

export default TaskPanel;
