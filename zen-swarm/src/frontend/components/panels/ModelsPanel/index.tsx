/**
 * ModelsPanel 主组件
 *
 * 优化点：
 * - 使用 useModal 统一状态管理（规则：rerender-derived-state）
 * - 使用 ConfirmModal 替代 confirm()（规则：rerender-move-effect-to-event）
 */

import { useState } from 'react';
import type { Model } from '../../../types/index.js';
import { trpc } from '../../../api.js';
import { ModelCard } from './ModelCard.js';
import { ModelForm } from './ModelForm.js';
import { Modal } from '../../Modal.js';
import { ConfirmModal } from '../../ui/ConfirmModal.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';
import { useModal } from '../../ui/hooks/useModal.js';

export function ModelsPanel() {
    const modal = useModal<Model>();

    const { data: models = [], isLoading, error, refetch } = trpc.models.list.useQuery();

    const createMutation = trpc.models.create.useMutation({
        onSuccess: () => {
            modal.close();
            refetch();
        },
    });

    const updateMutation = trpc.models.update.useMutation({
        onSuccess: () => {
            modal.close();
            refetch();
        },
    });

    const deleteMutation = trpc.models.delete.useMutation({
        onSuccess: () => {
            setShowDeleteModal(false);
            refetch();
        },
    });

    // 删除确认对话框状态
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingModelId, setDeletingModelId] = useState<string | null>(null);

    const handleCreate = () => {
        modal.openCreate();
    };

    const handleEdit = (model: Model) => {
        modal.openEdit(model);
    };

    const handleDeleteClick = (id: string) => {
        setDeletingModelId(id);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        if (deletingModelId) {
            deleteMutation.mutate({ id: deletingModelId });
        }
    };

    const handleSave = async (formData: any) => {
        if (modal.editingItem) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    const isMutating = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Models ({models.length})</h2>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    + Create Model
                </button>
            </div>

            {error && <ErrorDisplay error={error.message} onRetry={() => refetch()} />}

            {!isLoading && !error && models.length === 0 && (
                <EmptyState
                    message="No models yet. Create your first model!"
                    action={{ label: 'Create Model', onClick: handleCreate }}
                />
            )}

            {!isLoading && !error && models.length > 0 && (
                <div className="grid gap-4">
                    {models.map((model) => (
                        <ModelCard key={model.id} model={model} onEdit={handleEdit} onDelete={handleDeleteClick} />
                    ))}
                </div>
            )}

            <Modal open={modal.isOpen} onClose={modal.close} title={modal.getTitle('Model')}>
                <ModelForm model={modal.editingItem} onSave={handleSave} onCancel={modal.close} />
            </Modal>

            {/* 非阻塞式删除确认对话框（规则：rerender-move-effect-to-event） */}
            <ConfirmModal
                open={showDeleteModal}
                title="删除 Model"
                message="确定要删除这个 Model 吗？此操作无法撤销。"
                confirmText="删除"
                cancelText="取消"
                confirmVariant="danger"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setShowDeleteModal(false)}
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
