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
        <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-white mb-1">{props.model.model_name}</h3>
                    <p className="text-sm text-gray-500 mb-2">ID: {props.model.id}</p>
                    <div className="flex flex-wrap gap-3 text-sm mb-3">
                        <div className="flex items-center gap-1">
                            <span className="text-gray-500">Provider:</span>
                            <span className="text-blue-400">{props.model.model_provider}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-900 rounded px-3 py-2">
                            <span className="text-gray-500">Temperature:</span>
                            <span className="text-white ml-1">{props.model.temperature}</span>
                        </div>
                        <div className="bg-gray-900 rounded px-3 py-2">
                            <span className="text-gray-500">Max Tokens:</span>
                            <span className="text-white ml-1">{props.model.max_tokens}</span>
                        </div>
                        <div className="bg-gray-900 rounded px-3 py-2">
                            <span className="text-gray-500">Top P:</span>
                            <span className="text-white ml-1">{props.model.top_p}</span>
                        </div>
                        <div className="bg-gray-900 rounded px-3 py-2">
                            <span className="text-gray-500">Freq Penalty:</span>
                            <span className="text-white ml-1">{props.model.frequency_penalty}</span>
                        </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                        {props.model.stream_usage && (
                            <span className="px-2 py-0.5 bg-green-900/50 text-green-300 text-xs rounded">
                                Stream Usage
                            </span>
                        )}
                        {props.model.enable_thinking && (
                            <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded">
                                Thinking
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => props.onEdit(props.model)}
                        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => props.onDelete(props.model.id)}
                        className="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
