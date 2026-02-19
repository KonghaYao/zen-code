/**
 * ToolCard 组件 - 单个 Tool 卡片展示
 */

import type { Tool } from '../../../types/index.js';

interface ToolCardProps {
    tool: Tool;
    onEdit?: (tool: Tool) => void;
    onDelete?: (id: string) => void;
}

export function ToolCard(props: ToolCardProps) {
    const getSchemaPreview = () => {
        try {
            const schema = typeof props.tool.schema === 'string' ? JSON.parse(props.tool.schema) : props.tool.schema;
            return JSON.stringify(schema, null, 2);
        } catch {
            return props.tool.schema || 'No schema';
        }
    };

    const getParametersPreview = () => {
        try {
            const parameters =
                typeof props.tool.parameters === 'string' ? JSON.parse(props.tool.parameters) : props.tool.parameters;
            return JSON.stringify(parameters, null, 2);
        } catch {
            return props.tool.parameters || 'No parameters';
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-white mb-1">{props.tool.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">ID: {props.tool.id}</p>
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                        {props.tool.description || 'No description'}
                    </p>

                    {props.tool.schema && (
                        <div className="bg-gray-900 rounded p-3 text-xs font-mono text-gray-300 overflow-x-auto mb-2">
                            <div className="mb-1 text-gray-500">Schema:</div>
                            <pre className="whitespace-pre-wrap">{getSchemaPreview()}</pre>
                        </div>
                    )}

                    {props.tool.parameters && (
                        <div className="bg-gray-900 rounded p-3 text-xs font-mono text-gray-300 overflow-x-auto">
                            <div className="mb-1 text-gray-500">Parameters:</div>
                            <pre className="whitespace-pre-wrap">{getParametersPreview()}</pre>
                        </div>
                    )}
                </div>

                {props.onEdit && props.onDelete && (
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
                )}
            </div>
        </div>
    );
}
