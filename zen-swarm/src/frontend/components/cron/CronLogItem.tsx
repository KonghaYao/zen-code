/**
 * CronLogItem 组件 - 单条执行日志展示
 */

import type { CronLog, CronLogStatus } from '../../types/cron.js';

interface CronLogItemProps {
    log: CronLog;
    taskName?: string;
    onViewThread?: (threadId: string) => void;
}

const statusConfig: Record<CronLogStatus, { icon: string; color: string; bgColor: string }> = {
    pending: { icon: '⏳', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
    queued: { icon: '📋', color: 'text-blue-700', bgColor: 'bg-blue-50' },
    running: { icon: '🔄', color: 'text-purple-700', bgColor: 'bg-purple-50' },
    success: { icon: '✅', color: 'text-green-700', bgColor: 'bg-green-50' },
    failed: { icon: '❌', color: 'text-red-700', bgColor: 'bg-red-50' },
};

function formatDuration(startedAt: string, finishedAt?: string): string {
    if (!finishedAt) return '-';

    const start = new Date(startedAt).getTime();
    const end = new Date(finishedAt).getTime();
    const durationMs = end - start;

    if (durationMs < 1000) {
        return `${durationMs}ms`;
    } else if (durationMs < 60000) {
        return `${(durationMs / 1000).toFixed(1)}s`;
    } else {
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }
}

function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

export function CronLogItem(props: CronLogItemProps) {
    const { log, taskName, onViewThread } = props;
    const config = statusConfig[log.status];

    return (
        <div className={`p-4 rounded-lg border ${config.bgColor}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                        <span>{config.icon}</span>
                        <span className={`font-medium ${config.color}`}>{log.status.toUpperCase()}</span>
                        {log.retry_count > 0 && (
                            <span className="text-xs text-orange-600 bg-orange-100 px-1 rounded">
                                Retry #{log.retry_count}
                            </span>
                        )}
                        {log.queued_at && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-1 rounded">Queued</span>
                        )}
                    </div>

                    {/* Task info */}
                    {taskName && (
                        <p className="text-sm text-gray-600 mb-1">
                            Task: <span className="font-medium">{taskName}</span>
                        </p>
                    )}

                    {/* Time info */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <div>
                            <span className="text-gray-400">Started: </span>
                            <span>{formatTime(log.started_at)}</span>
                        </div>
                        {log.finished_at && (
                            <>
                                <div>
                                    <span className="text-gray-400">Finished: </span>
                                    <span>{formatTime(log.finished_at)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Duration: </span>
                                    <span>{formatDuration(log.started_at, log.finished_at)}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Thread link */}
                    {log.thread_id && onViewThread && (
                        <button
                            onClick={() => onViewThread(log.thread_id!)}
                            className="mt-2 text-xs text-blue-600 hover:underline"
                        >
                            <a href={`/ui?thread=${log.thread_id!}`}>View Thread →</a>
                        </button>
                    )}

                    {/* Error message */}
                    {log.error_message && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700 font-mono overflow-x-auto">
                            {log.error_message}
                        </div>
                    )}
                </div>

                {/* ID */}
                <div className="text-xs text-gray-400 flex-shrink-0 ml-4">
                    <p className="font-mono">{log.id.slice(0, 8)}...</p>
                </div>
            </div>
        </div>
    );
}
