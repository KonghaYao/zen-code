/**
 * CronTaskCard 组件 - 单个 Cron 任务卡片展示
 */

import type { CronTask, CronLogStatus } from '../../types/cron.js';
import { Play, Pause, Edit, Trash2 } from '../ui/Icons.js';

interface CronTaskCardProps {
    task: CronTask;
    agentName?: string;
    lastLogStatus?: CronLogStatus;
    onEdit: (task: CronTask) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
    onTrigger: (id: string) => void;
}

const statusColors: Record<CronLogStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    queued: 'bg-blue-100 text-blue-800',
    running: 'bg-purple-100 text-purple-800',
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
};

export function CronTaskCard(props: CronTaskCardProps) {
    const { task, agentName, lastLogStatus } = props;

    return (
        <div
            className={`bg-white rounded-lg border transition-all ${
                task.enabled
                    ? 'border-border-subtle hover:shadow-sm hover:border-primary'
                    : 'border-border-subtle opacity-60'
            }`}
        >
            {/* 卡片头部 */}
            <div className="p-4 border-b border-border-subtle">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        {/* 标题行 */}
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-semibold text-text-primary truncate">{task.name}</h3>
                            <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                                    task.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}
                            >
                                {task.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            {lastLogStatus && (
                                <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[lastLogStatus]}`}
                                >
                                    {lastLogStatus}
                                </span>
                            )}
                        </div>

                        {/* 描述 */}
                        {task.description && (
                            <p className="text-sm text-text-secondary line-clamp-2">{task.description}</p>
                        )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-1.5 ml-4 flex-shrink-0">
                        <button
                            onClick={() => props.onTrigger(task.id)}
                            disabled={!task.enabled}
                            className={`p-1.5 rounded transition-colors ${
                                task.enabled
                                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                                    : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
                            }`}
                            title="Run now"
                        >
                            <Play className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => props.onToggle(task.id)}
                            className={`p-1.5 rounded transition-colors ${
                                task.enabled
                                    ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-600'
                                    : 'bg-green-50 hover:bg-green-100 text-green-600'
                            }`}
                            title={task.enabled ? 'Disable' : 'Enable'}
                        >
                            {task.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => props.onEdit(task)}
                            className="p-1.5 rounded transition-colors bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary"
                            title="Edit"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => props.onDelete(task.id)}
                            className="p-1.5 rounded transition-colors bg-red-50 hover:bg-red-100 text-red-600"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 卡片主体 */}
            <div className="p-4 space-y-3">
                {/* Cron 表达式和 Agent */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-text-muted">⏰</span>
                        <code className="bg-bg-tertiary px-2 py-0.5 rounded text-text-primary font-mono text-xs">
                            {task.cron_expression}
                        </code>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-text-muted">🤖</span>
                        <span className="text-blue-600 font-medium">{agentName || task.agent_id}</span>
                    </div>
                    {task.max_retries > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-text-muted">🔄</span>
                            <span className="text-orange-600 text-xs">Max retries: {task.max_retries}</span>
                        </div>
                    )}
                </div>

                {/* 变量 */}
                {Object.keys(task.variables || {}).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {Object.entries(task.variables).map(([key, value]) => (
                            <span
                                key={key}
                                className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-md font-mono"
                            >
                                {key}={value}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
