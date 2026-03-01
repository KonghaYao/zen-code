/**
 * ProviderPanel 组件 - 提供商配置面板
 *
 * 功能：
 * - 管理多个 AI 提供商配置（OpenAI、Anthropic）
 * - 支持新增、编辑、删除提供商
 * - 设置活跃提供商
 * - API Key 加密存储
 */

import { useState } from 'react';
import { Modal } from '../Modal.js';
import { ProviderList } from './ProviderList.js';
import { ProviderForm } from './ProviderForm.js';
import { ConfirmModal } from '../ui/ConfirmModal.js';
import {
    useProviders,
    useCreateProvider,
    useUpdateProvider,
    useDeleteProvider,
    useSetActiveProvider,
} from '../../hooks/useProviders.js';
import type { ProviderUpdateInput } from '../../hooks/useProviders.js';
import type { Provider, ProviderFormData, ProviderPanelState } from './types.js';

interface ProviderPanelProps {
    open: boolean;
    onClose: () => void;
}

export function ProviderPanel({ open, onClose }: ProviderPanelProps) {
    // State
    const [panelState, setPanelState] = useState<ProviderPanelState>({
        mode: 'list',
        editingId: null,
        deleteConfirmId: null,
    });

    // Queries
    const { data: providers = [], isLoading } = useProviders();

    // Mutations
    const createMutation = useCreateProvider();
    const updateMutation = useUpdateProvider();
    const deleteMutation = useDeleteProvider();
    const setActiveMutation = useSetActiveProvider();

    // Get editing provider
    const editingProvider = panelState.editingId ? providers.find((p) => p.id === panelState.editingId) : null;

    // Handlers
    const handleCreateNew = () => {
        setPanelState({ mode: 'create', editingId: null, deleteConfirmId: null });
    };

    const handleEdit = (id: string) => {
        setPanelState({ mode: 'edit', editingId: id, deleteConfirmId: null });
    };

    const handleCancel = () => {
        setPanelState({ mode: 'list', editingId: null, deleteConfirmId: null });
    };

    const handleSubmit = async (data: ProviderFormData) => {
        try {
            if (panelState.mode === 'create') {
                await createMutation.mutateAsync({
                    name: data.name,
                    type: data.type,
                    apiKey: data.apiKey,
                    baseUrl: data.baseUrl,
                    isActive: data.isActive,
                });
            } else if (panelState.mode === 'edit' && panelState.editingId) {
                const updateData: ProviderUpdateInput = {
                    id: panelState.editingId,
                    name: data.name,
                    type: data.type,
                    baseUrl: data.baseUrl,
                    isActive: data.isActive,
                    ...(data.apiKey ? { apiKey: data.apiKey } : {}),
                };
                await updateMutation.mutateAsync(updateData);
            }
            setPanelState({ mode: 'list', editingId: null, deleteConfirmId: null });
        } catch (error) {
            console.error('Failed to save provider:', error);
            // Error handling could be improved with toast notifications
        }
    };

    const handleDelete = (id: string) => {
        setPanelState({ ...panelState, deleteConfirmId: id });
    };

    const handleConfirmDelete = async () => {
        if (!panelState.deleteConfirmId) return;

        try {
            await deleteMutation.mutateAsync(panelState.deleteConfirmId);
            setPanelState({ mode: 'list', editingId: null, deleteConfirmId: null });
        } catch (error) {
            console.error('Failed to delete provider:', error);
        }
    };

    const handleSetActive = async (id: string) => {
        try {
            await setActiveMutation.mutateAsync(id);
        } catch (error) {
            console.error('Failed to set active provider:', error);
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <>
            <Modal open={open} onClose={onClose} title="提供商配置">
                <div className="min-w-[480px]">
                    {panelState.mode === 'list' ? (
                        <ProviderList
                            providers={providers}
                            isLoading={isLoading}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onSetActive={handleSetActive}
                            onCreateNew={handleCreateNew}
                            deletingId={deleteMutation.isPending ? panelState.deleteConfirmId : null}
                        />
                    ) : (
                        <ProviderForm
                            provider={editingProvider}
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                            isSaving={isSaving}
                        />
                    )}
                </div>
            </Modal>

            {/* 删除确认对话框 */}
            <ConfirmModal
                open={panelState.deleteConfirmId !== null}
                onClose={() => setPanelState({ ...panelState, deleteConfirmId: null })}
                onConfirm={handleConfirmDelete}
                title="确认删除"
                message="确定要删除此提供商吗？此操作无法撤销。"
                confirmText="删除"
                isDestructive
                isLoading={deleteMutation.isPending}
            />
        </>
    );
}
