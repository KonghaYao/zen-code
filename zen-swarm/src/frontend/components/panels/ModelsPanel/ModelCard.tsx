/**
 * ModelCard 组件 - 单个 Model 卡片展示
 */

import type { Model } from '../../../types/index.js';

interface ModelCardProps {
    model: Model;
    onEdit: (model: Model) => void;
    onDelete: (id: string) => void;
}

export function ModelCard(props: ModelCardProps) {
    return (
        <div className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors">
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-medium text-white truncate">{props.model.model_name}</h3>
                        <span className="text-xs text-gray-500 shrink-0">{props.model.id}</span>
                        <span className="text-xs text-blue-400 shrink-0">{props.model.model_provider}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 text-xs mb-2">
                        {props.model.temperature && (
                            <span className="bg-gray-900 rounded px-2 py-0.5">
                                <span className="text-gray-500">T:</span>
                                <span className="text-white ml-1">{props.model.temperature}</span>
                            </span>
                        )}
                        {props.model.max_tokens && (
                            <span className="bg-gray-900 rounded px-2 py-0.5">
                                <span className="text-gray-500">Max:</span>
                                <span className="text-white ml-1">{props.model.max_tokens}</span>
                            </span>
                        )}
                        {props.model.top_p && (
                            <span className="bg-gray-900 rounded px-2 py-0.5">
                                <span className="text-gray-500">TopP:</span>
                                <span className="text-white ml-1">{props.model.top_p}</span>
                            </span>
                        )}
                        {props.model.frequency_penalty && (
                            <span className="bg-gray-900 rounded px-2 py-0.5">
                                <span className="text-gray-500">Freq:</span>
                                <span className="text-white ml-1">{props.model.frequency_penalty}</span>
                            </span>
                        )}
                        {props.model.presence_penalty && (
                            <span className="bg-gray-900 rounded px-2 py-0.5">
                                <span className="text-gray-500">Pres:</span>
                                <span className="text-white ml-1">{props.model.presence_penalty}</span>
                            </span>
                        )}
                        {props.model.stream_usage && (
                            <span className="px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded">Stream</span>
                        )}
                        {props.model.enable_thinking && (
                            <span className="px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded">Thinking</span>
                        )}
                    </div>
                </div>

                <div className="flex gap-1.5 shrink-0">
                    <button
                        onClick={() => props.onEdit(props.model)}
                        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => props.onDelete(props.model.id)}
                        className="px-2 py-1 text-xs bg-red-900/50 hover:bg-red-800 text-red-300 rounded"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
