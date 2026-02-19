/**
 * MiddlewareCard 组件 - 单个 Middleware 卡片展示
 *
 * 优化点：
 * - 使用外部工具函数 getJsonPreview, getPriorityColor（规则：js-early-exit）
 * - 使用三元运算符替代 && 条件渲染（规则：rendering-conditional-render）
 */

import type { Middleware } from '../../../types/index.js';
import { getJsonPreview, getPriorityColor } from '../../../utils/formatters.js';

interface MiddlewareCardProps {
    middleware: Middleware;
    onEdit?: (middleware: Middleware) => void;
    onDelete?: (id: string) => void;
}

export function MiddlewareCard(props: MiddlewareCardProps) {
    const { middleware } = props;

    const configPreview = getJsonPreview(middleware.config);
    const priorityColorClass = getPriorityColor(middleware.priority);

    return (
        <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-medium text-white">{middleware.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColorClass}`}>
                            Priority: {middleware.priority}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">ID: {middleware.id}</p>
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                        {middleware.description || 'No description'}
                    </p>

                    <div className="bg-gray-900 rounded p-3 text-xs font-mono text-gray-300 overflow-x-auto">
                        <div className="mb-1 text-gray-500">Config:</div>
                        <pre className="whitespace-pre-wrap">{configPreview}</pre>
                    </div>
                </div>

                {props.onEdit && props.onDelete ? (
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
                ) : null}
            </div>
        </div>
    );
}
