/**
 * CronTaskCard 组件 - 单个 Cron 任务卡片展示
 */

import type { CronTask, CronLogStatus } from '../../types/cron.js';

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
                    ? 'border-[var(--color-border-subtle)] hover:shadow-sm hover:border-[var(--color-primary)]'
                    : 'border-[var(--color-border-subtle)] opacity-60'
            }`}
        >
            {/* 卡片头部 */}
            <div className="p-4 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        {/* 标题行 */}
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-semibold text-[var(--color-text-primary)] truncate">
                                {task.name}
                            </h3>
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
                            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">
                                {task.description}
                            </p>
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
                                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed'
                            }`}
                            title="Run now"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
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
                            {task.enabled ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            )}
                        </button>
                        <button
                            onClick={() => props.onEdit(task)}
                            className="p-1.5 rounded transition-colors bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                            title="Edit"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                            </svg>
                        </button>
                        <button
                            onClick={() => props.onDelete(task.id)}
                            className="p-1.5 rounded transition-colors bg-red-50 hover:bg-red-100 text-red-600"
                            title="Delete"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* 卡片主体 */}
            <div className="p-4 space-y-3">
                {/* Cron 表达式和 Agent */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--color-text-muted)]">⏰</span>
                        <code className="bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded text-[var(--color-text-primary)] font-mono text-xs">
                            {task.cron_expression}
                        </code>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--color-text-muted)]">🤖</span>
                        <span className="text-blue-600 font-medium">{agentName || task.agent_id}</span>
                    </div>
                    {task.max_retries > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[var(--color-text-muted)]">🔄</span>
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
