/**
 * ToolCard 组件 - 单个 Tool 卡片展示
 *
 * 优化点：
 * - 使用外部工具函数 getJsonPreview（规则：js-early-exit）
 * - 使用三元运算符替代 && 条件渲染（规则：rendering-conditional-render）
 */

import type { Tool } from '../../../types/index.js';
import { getJsonPreview } from '../../../utils/formatters.js';

interface ToolCardProps {
    tool: Tool;
    onEdit?: (tool: Tool) => void;
    onDelete?: (id: string) => void;
}

export function ToolCard(props: ToolCardProps) {
    const { tool } = props;

    const hasSchema = !!tool.schema;
    const hasParameters = !!tool.parameters;
    const schemaPreview = hasSchema ? getJsonPreview(tool.schema) : null;
    const parametersPreview = hasParameters ? getJsonPreview(tool.parameters) : null;

    return (
        <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-white mb-1">{tool.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">ID: {tool.id}</p>
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{tool.description || 'No description'}</p>

                    {hasSchema ? (
                        <div className="bg-gray-900 rounded p-3 text-xs font-mono text-gray-300 overflow-x-auto mb-2">
                            <div className="mb-1 text-gray-500">Schema:</div>
                            <pre className="whitespace-pre-wrap">{schemaPreview}</pre>
                        </div>
                    ) : null}

                    {hasParameters ? (
                        <div className="bg-gray-900 rounded p-3 text-xs font-mono text-gray-300 overflow-x-auto">
                            <div className="mb-1 text-gray-500">Parameters:</div>
                            <pre className="whitespace-pre-wrap">{parametersPreview}</pre>
                        </div>
                    ) : null}
                </div>

                {props.onEdit && props.onDelete ? (
                    <div className="flex gap-2">
                        <button
                            onClick={() => props.onEdit(props.tool)}
                            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => props.onDelete(props.tool.id)}
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
