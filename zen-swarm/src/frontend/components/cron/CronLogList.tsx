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
            <div className="text-center py-8 text-gray-500">
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
                    <h4 className="text-sm font-medium text-gray-500 mb-2 sticky top-0 bg-gray-50 py-1">{date}</h4>
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
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        const date = new Date(log.created_at || log.started_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(log);
    }

    return groups;
}
