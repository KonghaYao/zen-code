/**
 * CronLogList 组件 - 执行日志列表
 */

import type { CronLog, CronTask } from '../../types/cron.js';
import { CronLogItem } from './CronLogItem.js';

interface CronLogListProps {
    logs: CronLog[];
    taskMap: Map<string, CronTask>;
    onViewThread?: (threadId: string) => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoading?: boolean;
}

export function CronLogList(props: CronLogListProps) {
    const { logs, taskMap, onViewThread, onLoadMore, hasMore, isLoading } = props;

    if (logs.length === 0) {
        return (
            <div className="text-center py-8 text-text-muted">
                <p className="text-2xl mb-2">📋</p>
                <p>No execution logs yet</p>
            </div>
        );
    }

    // 按日期分组
    const groupedLogs = groupLogsByDate(logs);

    return (
        <div className="space-y-6">
            {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                <div key={date}>
                    <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2 sticky top-0 bg-bg-tertiary py-1">
                        {date}
                    </h4>
                    <div className="space-y-2">
                        {dateLogs.map((log) => (
                            <CronLogItem
                                key={log.id}
                                log={log}
                                taskName={taskMap.get(log.cron_task_id)?.name}
                                onViewThread={onViewThread}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {/* Load More */}
            {hasMore && (
                <div className="text-center py-4">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm rounded-lg ${
                            isLoading
                                ? 'bg-bg-secondary text-text-muted cursor-not-allowed'
                                : 'bg-bg-secondary text-text-primary hover:bg-bg-tertiary'
                        }`}
                    >
                        {isLoading ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}
        </div>
    );
}

// 按日期分组日志
function groupLogsByDate(logs: CronLog[]): Record<string, CronLog[]> {
    const groups: Record<string, CronLog[]> = {};

    for (const log of logs) {
        const logDate = new Date(log.created_at || log.started_at);

        // 格式化为 YYYY-MM-DD
        const year = logDate.getFullYear();
        const month = String(logDate.getMonth() + 1).padStart(2, '0');
        const day = String(logDate.getDate()).padStart(2, '0');
        const dateLabel = `${year}-${month}-${day}`;

        if (!groups[dateLabel]) {
            groups[dateLabel] = [];
        }
        groups[dateLabel].push(log);
    }

    return groups;
}
