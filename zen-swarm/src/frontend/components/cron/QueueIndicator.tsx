/**
 * QueueIndicator 组件 - 显示队列状态
 */

import type { QueueStatus, SchedulerStatus } from '../../types/cron.js';

interface QueueIndicatorProps {
    queueStatus: QueueStatus;
    schedulerStatus: SchedulerStatus;
}

export function QueueIndicator(props: QueueIndicatorProps) {
    const { queueStatus, schedulerStatus } = props;

    return (
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            {/* Scheduler Status */}
            <div className="flex items-center gap-2">
                <div
                    className={`w-2 h-2 rounded-full ${
                        schedulerStatus.isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                    }`}
                />
                <span className="text-sm text-gray-600">
                    Scheduler:{' '}
                    <span className={schedulerStatus.isRunning ? 'text-green-600' : 'text-red-600'}>
                        {schedulerStatus.isRunning ? 'Running' : 'Stopped'}
                    </span>
                </span>
            </div>

            {/* Scheduled Count */}
            <div className="flex items-center gap-2">
                <span className="text-lg">⏰</span>
                <span className="text-sm text-gray-600">
                    Scheduled: <span className="font-medium">{schedulerStatus.scheduledCount}</span>
                </span>
            </div>

            {/* Running Count */}
            <div className="flex items-center gap-2">
                <span className="text-lg">🔄</span>
                <span className="text-sm text-gray-600">
                    Running: <span className="font-medium text-purple-600">{queueStatus.running.length}</span>
                </span>
            </div>

            {/* Queue Count */}
            <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <span className="text-sm text-gray-600">
                    Queued: <span className="font-medium text-blue-600">{queueStatus.queued.length}</span>
                </span>
            </div>
        </div>
    );
}
