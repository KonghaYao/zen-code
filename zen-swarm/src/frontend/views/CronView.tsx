/**
 * CronView 组件 - Cron 任务管理视图
 */

import { useState, useMemo, useCallback } from 'react';
import { trpc } from '../api.js';
import { Modal } from '../components/Modal.js';
import { CronTaskList, CronTaskForm, CronLogList, QueueIndicator } from '../components/cron/index.js';
import type { CronTask, CronLog } from '../types/cron.js';

export function CronView() {
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

    const handleViewThread = useCallback((threadId: string) => {
        // TODO: 跳转到 Chat 视图查看 thread
        console.log('View thread:', threadId);
        window.open(`/ui?thread=${threadId}`, '_blank');
    }, []);

    const isLoading = tasksQuery.isLoading || agentsQuery.isLoading;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cron Tasks</h1>
                    <p className="text-sm text-gray-500 mt-1">Schedule and manage automated tasks</p>
                </div>
                <button
                    onClick={() => {
                        setEditingTask(null);
                        setShowForm(true);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                    <span>+</span>
                    <span>New Task</span>
                </button>
            </div>

            {/* Queue Status */}
            {queueStatusQuery.data && schedulerStatusQuery.data && (
                <QueueIndicator queueStatus={queueStatusQuery.data} schedulerStatus={schedulerStatusQuery.data} />
            )}

            {/* Task List */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h2>
                {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
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
            </div>

            {/* Recent Logs */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Executions</h2>
                <CronLogList logs={recentLogsQuery.data || []} taskMap={taskMap} onViewThread={handleViewThread} />
            </div>

            {/* Create/Edit Modal */}
            <Modal open={showForm} onClose={handleFormClose} title={editingTask ? 'Edit Cron Task' : 'New Cron Task'}>
                <CronTaskForm task={editingTask} onSave={handleFormClose} onCancel={handleFormClose} />
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal open={!!showConfirmDelete} onClose={() => setShowConfirmDelete(null)} title="Confirm Delete">
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Are you sure you want to delete this cron task? This will also delete all execution logs.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowConfirmDelete(null)}
                            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            disabled={deleteMutation.isPending}
                            className={`px-4 py-2 text-sm text-white rounded-lg ${
                                deleteMutation.isPending
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-red-500 hover:bg-red-600'
                            }`}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
