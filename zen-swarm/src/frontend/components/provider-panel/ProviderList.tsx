/**
 * ProviderList 组件 - 提供商列表
 */

import { Plus, AlertCircle } from '../ui/Icons.js';
import { ProviderCard } from './ProviderCard.js';
import { LoadingSpinner } from '../LoadingSpinner.js';
import type { Provider } from './types.js';

interface ProviderListProps {
    providers: Provider[];
    isLoading?: boolean;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onSetActive: (id: string) => void;
    onCreateNew: () => void;
    deletingId?: string | null;
}

export function ProviderList({
    providers,
    isLoading,
    onEdit,
    onDelete,
    onSetActive,
    onCreateNew,
    deletingId,
}: ProviderListProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 提供商卡片列表 */}
            {providers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">暂无提供商配置</p>
                    <p className="text-xs text-gray-400 mt-1">点击下方按钮添加新的提供商</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {providers.map((provider) => (
                        <ProviderCard
                            key={provider.id}
                            provider={provider}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onSetActive={onSetActive}
                            isDeleting={deletingId === provider.id}
                        />
                    ))}
                </div>
            )}

            {/* 新增按钮 */}
            <button
                onClick={onCreateNew}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">添加新提供商</span>
            </button>
        </div>
    );
}
