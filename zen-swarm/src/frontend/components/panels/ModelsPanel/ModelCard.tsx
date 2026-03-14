/**
 * ModelCard 组件 - 单个 Model 卡片展示
 */

import type { Model } from '../../../types/index.js';
import { Edit, Trash2 } from '../../ui/Icons.js';
import { IconButton } from '../../ui/IconButton.js';

interface ModelCardProps {
    model: Model;
    onEdit: (model: Model) => void;
    onDelete: (id: string) => void;
}

export function ModelCard(props: ModelCardProps) {
    const { model } = props;
    const displayName = model.name || model.model_name;
    const providerInfo = model.provider;

    return (
        <div className="bg-white rounded-lg p-3 hover:bg-gray-50 transition-colors border border-gray-200">
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-medium text-gray-900 truncate">{displayName}</h3>
                        <span className="text-xs text-gray-400 shrink-0">{model.id}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-2 text-xs">
                        {providerInfo ? (
                            <span
                                className={`px-1.5 py-0.5 rounded ${
                                    providerInfo.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                {providerInfo.name} ({providerInfo.type})
                            </span>
                        ) : (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">⚠️ No Provider</span>
                        )}
                        <span className="text-gray-400">{model.model_name}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 text-xs mb-2">
                        {model.temperature !== undefined && (
                            <span className="bg-gray-100 rounded px-2 py-0.5">
                                <span className="text-gray-400">T:</span>
                                <span className="text-gray-900 ml-1">{model.temperature}</span>
                            </span>
                        )}
                        {model.max_tokens && (
                            <span className="bg-gray-100 rounded px-2 py-0.5">
                                <span className="text-gray-400">Max:</span>
                                <span className="text-gray-900 ml-1">{model.max_tokens}</span>
                            </span>
                        )}
                        {model.top_p !== undefined && (
                            <span className="bg-gray-100 rounded px-2 py-0.5">
                                <span className="text-gray-400">TopP:</span>
                                <span className="text-gray-900 ml-1">{model.top_p}</span>
                            </span>
                        )}
                        {model.frequency_penalty !== undefined && (
                            <span className="bg-gray-100 rounded px-2 py-0.5">
                                <span className="text-gray-400">Freq:</span>
                                <span className="text-gray-900 ml-1">{model.frequency_penalty}</span>
                            </span>
                        )}
                        {model.presence_penalty !== undefined && (
                            <span className="bg-gray-100 rounded px-2 py-0.5">
                                <span className="text-gray-400">Pres:</span>
                                <span className="text-gray-900 ml-1">{model.presence_penalty}</span>
                            </span>
                        )}
                        {model.stream_usage && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Stream</span>
                        )}
                        {model.enable_thinking && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Thinking</span>
                        )}
                    </div>
                </div>

                <div className="flex gap-1 shrink-0">
                    <IconButton onClick={() => props.onEdit(model)} variant="primary" title="Edit">
                        <Edit className="w-4 h-4" />
                    </IconButton>
                    <IconButton onClick={() => props.onDelete(model.id)} variant="danger" title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </IconButton>
                </div>
            </div>
        </div>
    );
}
