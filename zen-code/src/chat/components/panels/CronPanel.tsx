/**
 * Cron 面板 - 查看和管理 Cron 定时任务
 *
 * 功能：
 * - 列出所有 cron 任务（支持搜索/过滤）
 * - 查看任务详情和最近执行日志
 * - 切换任务启用/禁用
 * - 手动触发任务
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Box, Text, Spacer, useInput } from 'ink';
import { UniversalPanel, SelectItem, PanelConfig } from 'ink-pro';
import { useTrpc } from '../../context/ZenCoreContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CronTask {
    id: string;
    name: string;
    description?: string;
    cron_expression: string;
    prompt: string;
    agent_id: string;
    enabled: boolean;
    max_retries: number;
    created_at?: string;
    updated_at?: string;
}

type CronLogStatus = 'pending' | 'queued' | 'running' | 'success' | 'failed';

interface CronLog {
    id: string;
    cron_task_id: string;
    thread_id?: string;
    status: CronLogStatus;
    started_at: string;
    finished_at?: string;
    error_message?: string;
    retry_count: number;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const LOG_STATUS_CONFIG: Record<CronLogStatus, { emoji: string; color: 'green' | 'red' | 'yellow' | 'cyan' | 'gray' }> =
    {
        success: { emoji: '✅', color: 'green' },
        failed: { emoji: '❌', color: 'red' },
        running: { emoji: '🔄', color: 'yellow' },
        queued: { emoji: '⏳', color: 'cyan' },
        pending: { emoji: '⏸', color: 'gray' },
    };

// ─── Task Detail Panel ────────────────────────────────────────────────────────

interface TaskDetailPanelProps {
    task: CronTask;
    onClose: () => void;
    onToggle: (id: string) => void;
    onTrigger: (id: string) => void;
}

const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, onClose, onToggle, onTrigger }) => {
    const trpc = useTrpc();
    const [logs, setLogs] = React.useState<CronLog[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const result = await trpc.cron.getLogs.query({ taskId: task.id, limit: 10 });
                if (!cancelled) {
                    setLogs(result as CronLog[]);
                }
            } catch {
                // ignore
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [task.id, trpc]);

    useInput((input, key) => {
        if (key.escape || (key.ctrl && input === 'c')) {
            onClose();
        } else if (input === 't') {
            onToggle(task.id);
        } else if (input === 'r') {
            onTrigger(task.id);
        }
    });

    return (
        <Box flexDirection="column" padding={1} flexGrow={1}>
            {/* Header */}
            <Box marginBottom={1} borderStyle="round" borderColor="cyan" padding={1} flexDirection="column">
                <Box>
                    <Text bold color="cyan">
                        ⏰ {task.name}
                    </Text>
                    <Spacer />
                    <Text color={task.enabled ? 'green' : 'red'}>{task.enabled ? '● 启用' : '○ 禁用'}</Text>
                </Box>
                {task.description && (
                    <Text color="gray" dimColor>
                        {task.description}
                    </Text>
                )}
            </Box>

            {/* Task Info */}
            <Box flexDirection="column" marginBottom={1}>
                <Box>
                    <Text color="yellow" bold>
                        Cron:{' '}
                    </Text>
                    <Text color="white">{task.cron_expression}</Text>
                </Box>
                <Box>
                    <Text color="yellow" bold>
                        Agent:{' '}
                    </Text>
                    <Text color="cyan">{task.agent_id}</Text>
                </Box>
                {task.max_retries > 0 && (
                    <Box>
                        <Text color="yellow" bold>
                            最大重试:{' '}
                        </Text>
                        <Text>{task.max_retries}</Text>
                    </Box>
                )}
                <Box>
                    <Text color="gray" dimColor>
                        Prompt: {task.prompt.slice(0, 60)}
                        {task.prompt.length > 60 ? '...' : ''}
                    </Text>
                </Box>
            </Box>

            {/* Recent Logs */}
            <Box flexDirection="column" flexGrow={1}>
                <Text bold color="blue">
                    最近执行记录
                </Text>
                {loading ? (
                    <Text color="gray">加载中...</Text>
                ) : logs.length === 0 ? (
                    <Text color="gray" dimColor>
                        暂无执行记录
                    </Text>
                ) : (
                    logs.slice(0, 8).map((log) => {
                        const statusCfg = LOG_STATUS_CONFIG[log.status] ?? LOG_STATUS_CONFIG.pending;
                        const startTime = new Date(log.started_at).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                        });
                        return (
                            <Box key={log.id}>
                                <Text color={statusCfg.color}>
                                    {statusCfg.emoji} {startTime}
                                </Text>
                                {log.error_message && (
                                    <Text color="red" dimColor>
                                        {' '}
                                        {log.error_message.slice(0, 40)}
                                    </Text>
                                )}
                            </Box>
                        );
                    })
                )}
            </Box>

            {/* Shortcut hints */}
            <Box marginTop={1}>
                <Text color="gray" dimColor>
                    [T] 切换启用 | [R] 手动触发 | [ESC] 返回
                </Text>
            </Box>
        </Box>
    );
};

// ─── Main CronPanel ───────────────────────────────────────────────────────────

interface CronPanelProps {
    onClose: () => void;
}

const CronPanel: React.FC<CronPanelProps> = ({ onClose }) => {
    const trpc = useTrpc();
    const [tasks, setTasks] = useState<CronTask[]>([]);
    const [selectedTask, setSelectedTask] = useState<CronTask | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    // 加载任务列表
    const loadTasks = useCallback(async (): Promise<CronTask[]> => {
        const result = await trpc.cron.listTasks.query();
        const typedResult = result as CronTask[];
        setTasks(typedResult);
        return typedResult;
    }, [trpc]);

    // 切换启用状态
    const handleToggle = useCallback(
        async (id: string) => {
            try {
                await trpc.cron.toggleTask.mutate({ id });
                setActionMessage('任务状态已切换');
                setTimeout(() => setActionMessage(null), 2000);
                // 刷新任务列表
                const updated = await trpc.cron.listTasks.query();
                setTasks(updated as CronTask[]);
                // 更新当前选中的任务
                if (selectedTask?.id === id) {
                    const refreshed = (updated as CronTask[]).find((t) => t.id === id);
                    if (refreshed) setSelectedTask(refreshed);
                }
            } catch (e) {
                setActionMessage(`切换失败: ${e instanceof Error ? e.message : String(e)}`);
                setTimeout(() => setActionMessage(null), 3000);
            }
        },
        [trpc, selectedTask],
    );

    // 手动触发任务
    const handleTrigger = useCallback(
        async (id: string) => {
            try {
                await trpc.cron.triggerTask.mutate({ id });
                setActionMessage('任务已触发执行');
                setTimeout(() => setActionMessage(null), 2000);
            } catch (e) {
                setActionMessage(`触发失败: ${e instanceof Error ? e.message : String(e)}`);
                setTimeout(() => setActionMessage(null), 3000);
            }
        },
        [trpc],
    );

    // 关闭详情面板
    const handleCloseDetail = useCallback(() => {
        setSelectedTask(null);
    }, []);

    // 渲染任务列表项
    const renderItem = useCallback((task: CronTask, index: number, isSelected: boolean) => {
        return (
            <SelectItem key={`cron-${task.id}`} isSelected={isSelected}>
                <Box>
                    <Text color={task.enabled ? 'green' : 'gray'} dimColor={!task.enabled}>
                        {task.enabled ? '●' : '○'} {index + 1}. {task.name}
                    </Text>
                    <Spacer />
                    <Text color="yellow" dimColor>
                        {task.cron_expression}
                    </Text>
                    <Text color="cyan" dimColor>
                        {' '}
                        {task.agent_id}
                    </Text>
                </Box>
            </SelectItem>
        );
    }, []);

    // 状态信息
    const statusInfo = useCallback(
        (items: CronTask[]) => {
            const enabledCount = items.filter((t) => t.enabled).length;
            const disabledCount = items.length - enabledCount;
            return (
                <Text color="gray">
                    启用: <Text color="green">{enabledCount}</Text> | 禁用: <Text color="red">{disabledCount}</Text>
                    {actionMessage && <Text color="yellow"> | {actionMessage}</Text>}
                </Text>
            );
        },
        [actionMessage],
    );

    // PanelConfig
    const panelConfig: PanelConfig<CronTask> = useMemo(
        () => ({
            id: 'cron',
            title: 'Cron 定时任务',
            icon: '⏰',

            dataSource: loadTasks,

            searchable: true,
            searchFields: ['name', 'description', 'cron_expression', 'agent_id'],
            searchPlaceholder: '搜索任务 (名称/cron/agent)...',

            filterable: true,
            filters: [
                {
                    id: 'all',
                    label: '全部',
                    predicate: () => true,
                },
                {
                    id: 'enabled',
                    label: '启用',
                    predicate: (task: CronTask) => task.enabled,
                },
                {
                    id: 'disabled',
                    label: '禁用',
                    predicate: (task: CronTask) => !task.enabled,
                },
            ],
            defaultFilter: 'all',

            itemHeight: 1,
            visibleCount: 15,

            renderItem,
            onSelect: setSelectedTask,

            showCount: true,
            statusInfo,
        }),
        [loadTasks, renderItem, statusInfo],
    );

    // 显示详情面板
    if (selectedTask) {
        return (
            <TaskDetailPanel
                task={selectedTask}
                onClose={handleCloseDetail}
                onToggle={handleToggle}
                onTrigger={handleTrigger}
            />
        );
    }

    return <UniversalPanel config={panelConfig} onClose={onClose} />;
};

export default CronPanel;
