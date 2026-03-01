/**
 * ProviderCard 组件 - 提供商卡片
 */

import { Check, Edit, Trash2, Key, Globe, Zap } from '../ui/Icons.js';
import type { Provider } from './types.js';

interface ProviderCardProps {
    provider: Provider;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onSetActive: (id: string) => void;
    isDeleting?: boolean;
}

export function ProviderCard({ provider, onEdit, onDelete, onSetActive, isDeleting }: ProviderCardProps) {
    const typeLabels: Record<string, string> = {
        openai: 'OpenAI',
        anthropic: 'Anthropic',
    };

    const typeColors: Record<string, string> = {
        openai: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        anthropic: 'bg-orange-100 text-orange-800 border-orange-200',
    };

    return (
        <div
            className={`p-4 bg-white rounded-lg border transition-all duration-200 ${
                provider.isActive
                    ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">{provider.name}</h4>
                        {provider.isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                <Zap className="w-3 h-3" />
                                活跃
                            </span>
                        )}
                    </div>
                    <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${typeColors[provider.type]}`}
                    >
                        {typeLabels[provider.type]}
                    </span>
                </div>
            </div>

            {/* Info */}
            <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-mono text-xs truncate">{provider.apiKey}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs truncate">{provider.baseUrl}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                    onClick={() => onSetActive(provider.id)}
                    disabled={provider.isActive}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        provider.isActive
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700'
                    }`}
                >
                    <Check className="w-3.5 h-3.5" />
                    设为活跃
                </button>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onEdit(provider.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="编辑"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(provider.id)}
                        disabled={isDeleting}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="删除"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
