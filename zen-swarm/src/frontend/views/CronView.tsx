/**
 * CronView 组件 - Cron 任务管理视图
 */

import { useState, useMemo, useCallback } from 'react';
import { trpc } from '../api.js';
import { Modal } from '../components/Modal.js';
import { ConfirmModal } from '../components/ui/ConfirmModal.js';
import { CronTaskList, CronTaskForm, CronLogList, QueueIndicator } from '../components/cron/index.js';
import type { CronTask, CronLog } from '../types/cron.js';

type CronTab = 'tasks' | 'logs';

interface TabConfig {
    id: CronTab;
    label: string;
    icon: string;
    description: string;
}

const TABS: TabConfig[] = [
    {
        id: 'tasks',
        label: 'Tasks',
        icon: '⏰',
        description: 'Manage scheduled cron tasks',
    },
    {
        id: 'logs',
        label: 'Execution Logs',
        icon: '📋',
        description: 'View task execution history',
    },
];

export function CronView() {
    const [activeTab, setActiveTab] = useState<CronTab>('tasks');

    // Modal states
    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState<CronTask | null>(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

    // Queries
    const tasksQuery = trpc.cron.listTasks.useQuery();
    const agentsQuery = trpc.agents.list.useQuery();
    const recentLogsQuery = trpc.cron.getRecentLogs.useQuery({ limit: 20 });
    const queueStatusQuery = trpc.cron.getQueueStatus.useQuery(undefined, {
        refetchInterval: 5000, // 每 5 秒刷新
    });
    const schedulerStatusQuery = trpc.cron.getSchedulerStatus.useQuery();

    // Mutations
    const deleteMutation = trpc.cron.deleteTask.useMutation({
        onSuccess: () => {
            setShowConfirmDelete(null);
            tasksQuery.refetch();
        },
    });

    const toggleMutation = trpc.cron.toggleTask.useMutation({
        onSuccess: () => {
            tasksQuery.refetch();
        },
    });

    const triggerMutation = trpc.cron.triggerTask.useMutation({
        onSuccess: () => {
            recentLogsQuery.refetch();
            queueStatusQuery.refetch();
        },
    });

    // 构建查找 Map
    const agentMap = useMemo(() => {
        const map = new Map<string, { name: string }>();
        agentsQuery.data?.forEach((agent) => {
            map.set(agent.id, { name: agent.name });
        });
        return map;
    }, [agentsQuery.data]);

    const taskMap = useMemo(() => {
        const map = new Map<string, CronTask>();
        tasksQuery.data?.forEach((task) => {
            map.set(task.id, task);
        });
        return map;
    }, [tasksQuery.data]);

    // 获取每个任务的最后日志状态
    const lastLogMap = useMemo(() => {
        const map = new Map<string, CronLog>();
        recentLogsQuery.data?.forEach((log) => {
            const existing = map.get(log.cron_task_id);
            if (
                !existing ||
                new Date(log.created_at || log.started_at) > new Date(existing.created_at || existing.started_at)
            ) {
                map.set(log.cron_task_id, log);
            }
        });
        return map;
    }, [recentLogsQuery.data]);

    // Handlers
    const handleEdit = useCallback((task: CronTask) => {
        setEditingTask(task);
        setShowForm(true);
    }, []);

    const handleDelete = useCallback((id: string) => {
        setShowConfirmDelete(id);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (showConfirmDelete) {
            deleteMutation.mutate({ id: showConfirmDelete });
        }
    }, [showConfirmDelete, deleteMutation]);

    const handleToggle = useCallback(
        (id: string) => {
            toggleMutation.mutate({ id });
        },
        [toggleMutation],
    );

    const handleTrigger = useCallback(
        (id: string) => {
            triggerMutation.mutate({ id });
        },
        [triggerMutation],
    );

    const handleFormClose = useCallback(() => {
        setShowForm(false);
        setEditingTask(null);
        tasksQuery.refetch();
    }, [tasksQuery]);

    const handleViewThread = useCallback((threadId: string) => {}, []);

    const handleTabChange = useCallback((tab: CronTab) => {
        setActiveTab(tab);
    }, []);

    const isLoading = tasksQuery.isLoading || agentsQuery.isLoading;

    const activeTabConfig = TABS.find((t) => t.id === activeTab);

    return (
        <div className="h-full flex flex-col overflow-hidden p-6">
            {/* Header */}
            <div className="flex-shrink-0 mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Cron Tasks</h1>
                        <p className="text-sm text-[var(--color-text-muted)] mt-1">
                            Schedule and manage automated tasks
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingTask(null);
                            setShowForm(true);
                        }}
                        className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        + New Task
                    </button>
                </div>
            </div>

            {/* Queue Status */}
            {queueStatusQuery.data && schedulerStatusQuery.data && (
                <div className="flex-shrink-0 mb-6">
                    <QueueIndicator queueStatus={queueStatusQuery.data} schedulerStatus={schedulerStatusQuery.data} />
                </div>
            )}

            {/* Tabs */}
            <div className="flex-shrink-0 mb-6">
                <div className="flex gap-2">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-[var(--color-primary)] text-white'
                                    : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] flex flex-col min-h-0">
                    <div className="p-4 border-b border-[var(--color-border-subtle)] flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">{activeTabConfig?.icon}</span>
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                                    {activeTabConfig?.label}
                                </h2>
                                <p className="text-sm text-[var(--color-text-muted)]">{activeTabConfig?.description}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                        {activeTab === 'tasks' && (
                            <>
                                {isLoading ? (
                                    <div className="text-center py-8 text-[var(--color-text-muted)]">Loading...</div>
                                ) : (
                                    <CronTaskList
                                        tasks={tasksQuery.data || []}
                                        agentMap={agentMap}
                                        lastLogMap={lastLogMap}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        onToggle={handleToggle}
                                        onTrigger={handleTrigger}
                                    />
                                )}
                            </>
                        )}
                        {activeTab === 'logs' && (
                            <CronLogList
                                logs={recentLogsQuery.data || []}
                                taskMap={taskMap}
                                onViewThread={handleViewThread}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal open={showForm} onClose={handleFormClose} title={editingTask ? 'Edit Cron Task' : 'New Cron Task'}>
                <CronTaskForm task={editingTask} onSave={handleFormClose} onCancel={handleFormClose} />
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                open={!!showConfirmDelete}
                title="Confirm Delete"
                message="Are you sure you want to delete this cron task? This will also delete all execution logs."
                confirmText="Delete"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowConfirmDelete(null)}
            />
        </div>
    );
}
