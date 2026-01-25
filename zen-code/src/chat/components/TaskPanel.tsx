/**
 * Task Panel - 任务看板面板
 * 展示任务列表，支持状态过滤和任务执行
 */

import React, { useCallback, useState } from 'react';
import { Box, Text, Spacer } from 'ink';
import { UniversalPanel } from './Panel/UniversalPanel';
import { SelectItem } from './Panel/SelectItem';
import { PanelConfig, PanelContext } from './Panel/types';
import { TaskNode } from '@codegraph/config';
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
    // 预览任务状态
    const [previewTask, setPreviewTask] = useState<TaskNode | null>(null);
    // 触发刷新标记
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refreshTasks = useCallback(async () => {
        try {
            const { getTasksStore } = await import('../store/tasks');
            const tasksStore = getTasksStore(process.cwd());
            await tasksStore.initialize();
            const allTasks = await tasksStore.getAllTasks();
            return allTasks;
        } catch (error) {
            console.error('Failed to load tasks:', error);
            return [];
        }
    }, [refreshTrigger]);

    // 关闭预览
    const handleClosePreview = useCallback(() => {
        setPreviewTask(null);
    }, []);

    // 删除任务
    const handleDeleteTask = useCallback(async (task: TaskNode) => {
        try {
            const { getTasksStore } = await import('../store/tasks');
            const tasksStore = getTasksStore(process.cwd());
            await tasksStore.initialize();
            const success = await tasksStore.deleteTask(task.id);

            if (success) {
                // 触发刷新
                setRefreshTrigger(prev => prev + 1);
            } else {
                console.error(`Failed to delete task: ${task.id}`);
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }, []);

    const panelConfig: PanelConfig<TaskNode> = {
        id: 'tasks',
        title: '任务看板',
        icon: '📋',

        dataSource: refreshTasks,

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

        renderItem: (task: TaskNode, index, isSelected) => {
            const statusInfo = task.status ? STATUS_CONFIG[task.status] : STATUS_CONFIG.pickup;
            const complexityInfo = task.complexity ? COMPLEXITY_CONFIG[task.complexity] : null;

            return (
                <SelectItem key={task.id} isSelected={isSelected}>
                    <Box>
                        <Text color='cyan' dimColor={statusInfo === STATUS_CONFIG.complete}>
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
        },

        onSelect: (task: TaskNode) => {
            // Enter 键：总是进入预览模式
            setPreviewTask(task);
        },

        onDelete: handleDeleteTask,

        showCount: true,


        // 状态信息
        statusInfo: (filteredTasks: TaskNode[]) => {
            const runningCount = filteredTasks.filter(t => t.status === 'running').length;
            const completeCount = filteredTasks.filter(t => t.status === 'complete').length;
            const errorCount = filteredTasks.filter(t => t.status === 'error').length;
            const canExecuteCount = filteredTasks.filter(t => t.status === 'pickup' || t.status === 'error' || t.status === 'feedback').length;

            return (
                <Text color="gray">
                    运行: {runningCount} | 完成: {completeCount} | 失败: {errorCount}
                    {canExecuteCount > 0 && <Text color="green"> | 可执行: {canExecuteCount}</Text>}
                    <Text dimColor> | Backspace 删除</Text>
                </Text>
            );
        },
    };

    return <>
        {
            previewTask ?
                <TaskPreviewPanel
                    task={previewTask}
                    onClose={handleClosePreview}
                    onExecuteTask={onExecuteTask}
                    onDelete={handleDeleteTask}
                /> :
                <UniversalPanel config={panelConfig} onClose={onClose} />
        }
    </>
};

export default TaskPanel;
