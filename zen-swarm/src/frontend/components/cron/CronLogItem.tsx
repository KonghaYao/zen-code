/**
 * CronLogItem 组件 - 单条执行日志展示
 */

import type { CronLog, CronLogStatus } from '../../types/cron.js';

interface CronLogItemProps {
    log: CronLog;
    taskName?: string;
    onViewThread?: (threadId: string) => void;
}

const statusConfig: Record<CronLogStatus, { icon: string; bgColor: string; textColor: string }> = {
    pending: { icon: '⏳', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
    queued: { icon: '📋', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
    running: { icon: '🔄', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
    success: { icon: '✅', bgColor: 'bg-green-50', textColor: 'text-green-700' },
    failed: { icon: '❌', bgColor: 'bg-red-50', textColor: 'text-red-700' },
};

function formatDuration(startedAt: string, finishedAt?: string): string {
    if (!finishedAt) return 'Running...';

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

    // 只格式化为 HH:mm:ss（因为日期已经在分组标题中）
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}

export function CronLogItem(props: CronLogItemProps) {
    const { log, taskName, onViewThread } = props;
    const config = statusConfig[log.status];

    return (
        <div className="bg-white rounded-lg border border-border-subtle p-3 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
                {/* 状态图标 */}
                <div
                    className={`flex-shrink-0 w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center text-sm`}
                >
                    {config.icon}
                </div>

                {/* 主内容 */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {taskName && <span className="text-sm font-medium text-text-primary">{taskName}</span>}
                        <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded ${config.bgColor} ${config.textColor}`}
                        >
                            {log.status}
                        </span>
                        {log.retry_count > 0 && (
                            <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                #{log.retry_count}
                            </span>
                        )}
                    </div>

                    {/* 时间信息 */}
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span>{formatTime(log.started_at)}</span>
                        <span>•</span>
                        <span>{formatDuration(log.started_at, log.finished_at)}</span>
                        {log.thread_id && onViewThread && (
                            <button
                                onClick={() => onViewThread(log.thread_id!)}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium ml-2"
                            >
                                View Thread
                            </button>
                        )}
                    </div>

                    {/* 错误信息 */}
                    {log.error_message && (
                        <div
                            className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700 font-mono truncate"
                            title={log.error_message}
                        >
                            {log.error_message}
                        </div>
                    )}
                </div>

                {/* ID */}
                <div className="text-xs text-text-muted flex-shrink-0 font-mono">{log.id.slice(0, 6)}</div>
            </div>
        </div>
    );
}
