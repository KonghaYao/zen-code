/**
 * StoreView — 远程仓库主视图
 * 左侧：Store 管理（添加/删除/启用）
 * 右侧：StorePanel（浏览 + 导入）
 */

import { useState } from 'react';
import { StorePanel } from '../components/panels/StorePanel/index.js';
import { ConfirmModal } from '../components/ui/ConfirmModal.js';
import { useStores, useAddStore, useUpdateStore, useDeleteStore } from '../hooks/useStore.js';

interface AddStoreFormProps {
    onAdd: (data: {
        id: string;
        name: string;
        type: 'generic_http' | 'clawhub';
        base_url?: string;
        api_key?: string;
    }) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

function AddStoreForm({ onAdd, onCancel, isLoading }: AddStoreFormProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<'generic_http' | 'clawhub'>('clawhub');
    const [baseUrl, setBaseUrl] = useState('');
    const [apiKey, setApiKey] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({
            id: crypto.randomUUID(),
            name,
            type,
            base_url: type === 'clawhub' ? undefined : baseUrl,
            api_key: apiKey || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">New Store</h3>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'generic_http' | 'clawhub')}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="clawhub">ClawhHub (clawhub.ai)</option>
                    <option value="generic_http">Generic HTTP</option>
                </select>
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={type === 'clawhub' ? 'ClawhHub' : 'My Team Store'}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            {type === 'generic_http' && (
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Base URL</label>
                    <input
                        required
                        type="url"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://api.example.com"
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            )}
            <div>
                <label className="block text-xs text-gray-500 mb-1">API Key (optional)</label>
                <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="clh_..."
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div className="flex gap-2 justify-end">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-white"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? 'Adding...' : 'Add'}
                </button>
            </div>
        </form>
    );
}

export function StoreView() {
    const [showAddForm, setShowAddForm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { data: stores = [] } = useStores();
    const addMutation = useAddStore();
    const deleteMutation = useDeleteStore();
    const updateMutation = useUpdateStore();

    return (
        <div className="flex h-full">
            {/* 左侧：Store 管理侧边栏 */}
            <aside className="w-60 flex-shrink-0 border-r border-border-subtle flex flex-col bg-bg-primary">
                <div className="p-3 border-b border-border-subtle space-y-2">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Remote Stores</p>
                    {!showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            + Add Store
                        </button>
                    )}
                    {showAddForm && (
                        <AddStoreForm
                            onAdd={(data) => addMutation.mutate(data, { onSuccess: () => setShowAddForm(false) })}
                            onCancel={() => setShowAddForm(false)}
                            isLoading={addMutation.isPending}
                        />
                    )}
                </div>

                <div className="flex-1 overflow-auto p-2 space-y-1">
                    {stores.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-6 px-2">No stores yet.</p>
                    )}
                    {(stores as any[]).map((store: any) => (
                        <div
                            key={store.id}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-bg-secondary group"
                        >
                            {/* Enabled indicator */}
                            <button
                                onClick={() => updateMutation.mutate({ id: store.id, enabled: !store.enabled })}
                                title={store.enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                                className={`w-2 h-2 rounded-full shrink-0 ${store.enabled ? 'bg-green-400' : 'bg-gray-300'}`}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-text-primary truncate">{store.name}</p>
                                <p className="text-xs text-gray-400 truncate">{store.base_url}</p>
                            </div>
                            <button
                                onClick={() => setDeletingId(store.id)}
                                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            </aside>

            {/* 右侧：浏览面板 */}
            <div className="flex-1 overflow-hidden">
                <StorePanel />
            </div>

            {/* 删除确认 */}
            <ConfirmModal
                open={!!deletingId}
                title="Remove Store"
                message="Remove this remote store? Your imported prompts and skills will not be affected."
                confirmText="Remove"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={() =>
                    deletingId && deleteMutation.mutate(deletingId, { onSuccess: () => setDeletingId(null) })
                }
                onCancel={() => setDeletingId(null)}
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
