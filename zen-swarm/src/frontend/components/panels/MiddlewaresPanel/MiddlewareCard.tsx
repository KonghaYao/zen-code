/**
 * MiddlewareCard 组件 - 单个 Middleware 卡片展示
 */

import type { Middleware } from '../../../types/index.js';

interface MiddlewareCardProps {
    middleware: Middleware;
    onEdit: (middleware: Middleware) => void;
    onDelete: (id: string) => void;
}

export function MiddlewareCard(props: MiddlewareCardProps) {
    const getConfigPreview = () => {
        try {
            const config =
                typeof props.middleware.config === 'string'
                    ? JSON.parse(props.middleware.config)
                    : props.middleware.config;
            return JSON.stringify(config, null, 2);
        } catch {
            return props.middleware.config || 'No config';
        }
    };

    const getPriorityColor = () => {
        if (props.middleware.priority < 10) return 'bg-green-900/50 text-green-300';
        if (props.middleware.priority < 50) return 'bg-yellow-900/50 text-yellow-300';
        return 'bg-red-900/50 text-red-300';
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-medium text-white">{props.middleware.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor()}`}>
                            Priority: {props.middleware.priority}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">ID: {props.middleware.id}</p>
                    <p className="text-sm text-gray-400 mb-3">{props.middleware.description || 'No description'}</p>

                    <div className="bg-gray-900 rounded p-3 text-xs font-mono text-gray-300 overflow-x-auto">
                        <div className="mb-1 text-gray-500">Config:</div>
                        <pre className="whitespace-pre-wrap">{getConfigPreview()}</pre>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => props.onEdit(props.middleware)}
                        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => props.onDelete(props.middleware.id)}
                        className="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
