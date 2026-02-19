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
    pending: 'bg-yellow-100 text-yellow-800',
    queued: 'bg-blue-100 text-blue-800',
    running: 'bg-purple-100 text-purple-800',
    success: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
};

export function CronTaskCard(props: CronTaskCardProps) {
    const { task, agentName, lastLogStatus } = props;

    return (
        <div
            className={`bg-white rounded-lg p-6 border transition-colors ${
                task.enabled ? 'border-gray-200 hover:bg-gray-50' : 'border-gray-100 bg-gray-50'
            }`}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className={`text-lg font-medium ${task.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                            {task.name}
                        </h3>
                        <span
                            className={`px-2 py-0.5 text-xs rounded ${
                                task.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}
                        >
                            {task.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        {lastLogStatus && (
                            <span className={`px-2 py-0.5 text-xs rounded ${statusColors[lastLogStatus]}`}>
                                {lastLogStatus}
                            </span>
                        )}
                    </div>

                    <p className="text-sm text-gray-400 mb-2">ID: {task.id}</p>

                    {task.description && <p className="text-sm text-gray-600 mb-3">{task.description}</p>}

                    <div className="flex flex-wrap gap-3 text-xs mb-3">
                        <div className="flex items-center gap-1">
                            <span className="text-gray-400">⏰</span>
                            <code className="bg-gray-100 px-1 rounded text-gray-700">{task.cron_expression}</code>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-400">🤖</span>
                            <span className="text-blue-600">{agentName || task.agent_id}</span>
                        </div>
                        {task.max_retries > 0 && (
                            <div className="flex items-center gap-1">
                                <span className="text-gray-400">🔄</span>
                                <span className="text-orange-600">Max retries: {task.max_retries}</span>
                            </div>
                        )}
                    </div>

                    {Object.keys(task.variables || {}).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {Object.entries(task.variables).map(([key, value]) => (
                                <span key={key} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded">
                                    {key}={value}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                    <button
                        onClick={() => props.onTrigger(task.id)}
                        disabled={!task.enabled}
                        className={`px-3 py-1 text-sm rounded ${
                            task.enabled
                                ? 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                        title="Run now"
                    >
                        ▶ Run
                    </button>
                    <button
                        onClick={() => props.onToggle(task.id)}
                        className={`px-3 py-1 text-sm rounded ${
                            task.enabled
                                ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-600'
                                : 'bg-green-50 hover:bg-green-100 text-green-600'
                        }`}
                    >
                        {task.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                        onClick={() => props.onEdit(task)}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => props.onDelete(task.id)}
                        className="px-3 py-1 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
