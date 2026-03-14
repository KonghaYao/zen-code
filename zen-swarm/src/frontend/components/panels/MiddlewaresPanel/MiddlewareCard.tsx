/**
 * MiddlewareCard 组件 - 单个 Middleware 卡片展示
 *
 * 优化点：
 * - 使用外部工具函数 getJsonPreview（规则：js-early-exit）
 * - 使用三元运算符替代 && 条件渲染（规则：rendering-conditional-render）
 */

import type { Middleware } from '../../../types/index.js';
import { getJsonPreview } from '../../../utils/formatters.js';
import { Edit, Trash2 } from '../../ui/Icons.js';
import { IconButton } from '../../ui/IconButton.js';

interface MiddlewareCardProps {
    middleware: Middleware;
    onEdit?: (middleware: Middleware) => void;
    onDelete?: (id: string) => void;
}

export function MiddlewareCard(props: MiddlewareCardProps) {
    const { middleware } = props;

    const parametersPreview = getJsonPreview(middleware.parameters);

    return (
        <div className="bg-white rounded-lg p-6 hover:bg-gray-50 transition-colors border border-gray-200">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-medium text-gray-900">{middleware.name}</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">ID: {middleware.id}</p>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {middleware.description || 'No description'}
                    </p>

                    {middleware.parameters && (
                        <div className="bg-gray-50 rounded p-3 text-xs font-mono text-gray-700 overflow-x-auto border border-gray-200">
                            <div className="mb-1 text-gray-400">Parameters:</div>
                            <pre className="whitespace-pre-wrap">{parametersPreview}</pre>
                        </div>
                    )}
                </div>

                {props.onEdit && props.onDelete ? (
                    <div className="flex gap-1">
                        <IconButton onClick={() => props.onEdit?.(props.middleware)} variant="primary" title="Edit">
                            <Edit className="w-4 h-4" />
                        </IconButton>
                        <IconButton
                            onClick={() => props.onDelete?.(props.middleware.id)}
                            variant="danger"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </IconButton>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
