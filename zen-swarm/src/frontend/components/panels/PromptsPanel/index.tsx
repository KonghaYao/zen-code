/**
 * PromptsPanel 主组件
 *
 * 优化点：
 * - 使用 useModal 统一状态管理（规则：rerender-derived-state）
 * - PromptCard 的版本数据管理提升到父组件
 * - 使用 ConfirmModal 替代 confirm()（规则：rerender-move-effect-to-event）
 */

import { useState } from 'react';
import type { Prompt, PromptVersion } from '../../../types/index.js';
import { trpc, apiClient } from '../../../api.js';
import { PromptCard } from './PromptCard.js';
import { PromptForm, type FormMode } from './PromptForm.js';
import { Modal } from '../../Modal.js';
import { ConfirmModal } from '../../ui/ConfirmModal.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';
import { useModal } from '../../ui/hooks/useModal.js';

type VersionToggleState = Record<string, boolean>;

export function PromptsPanel() {
    const modal = useModal<Prompt>();

    const { data: prompts = [], isLoading, error, refetch } = trpc.prompts.list.useQuery();

    const createMutation = trpc.prompts.create.useMutation({
        onSuccess: () => {
            modal.close();
            refetch();
        },
    });

    const updateMutation = trpc.prompts.update.useMutation({
        onSuccess: () => {
            modal.close();
            refetch();
        },
    });

    const createVersionMutation = trpc.prompts.createVersion.useMutation({
        onSuccess: () => {
            modal.close();
            refetch();
        },
    });

    const deleteMutation = trpc.prompts.delete.useMutation({
        onSuccess: () => {
            setShowDeleteModal(false);
            refetch();
        },
    });

    const rollbackMutation = trpc.prompts.rollbackVersion.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

    // 版本历史状态管理
    const [versionToggleState, setVersionToggleState] = useState<VersionToggleState>({});
    const [versionsCache, setVersionsCache] = useState<Record<string, PromptVersion[]>>({});
    const [loadingVersions, setLoadingVersions] = useState<Record<string, boolean>>({});

    // 删除确认对话框状态
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingPromptId, setDeletingPromptId] = useState<string | null>(null);

    // 回滚确认对话框状态
    const [showRollbackModal, setShowRollbackModal] = useState(false);
    const [rollbackData, setRollbackData] = useState<{ promptId: string; version: number } | null>(null);

    const [formMode, setFormMode] = useState<FormMode>('create');

    const handleCreate = () => {
        setFormMode('create');
        modal.openCreate();
    };

    const handleEdit = (prompt: Prompt) => {
        setFormMode('edit');
        modal.openEdit(prompt);
    };

    const handleCreateVersion = (prompt: Prompt) => {
        setFormMode('newVersion');
        modal.openEdit(prompt);
    };

    const handleDeleteClick = (id: string) => {
        setDeletingPromptId(id);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        if (deletingPromptId) {
            deleteMutation.mutate({ id: deletingPromptId });
        }
    };

    const handleRollbackClick = (promptId: string, version: number) => {
        setRollbackData({ promptId, version });
        setShowRollbackModal(true);
    };

    const handleRollbackConfirm = () => {
        if (rollbackData) {
            rollbackMutation.mutate({
                promptId: rollbackData.promptId,
                targetVersion: rollbackData.version,
            });
        }
    };

    const handleToggleVersions = async (promptId: string) => {
        const newShow = !versionToggleState[promptId];
        setVersionToggleState((prev) => ({ ...prev, [promptId]: newShow }));

        if (newShow && !versionsCache[promptId]) {
            setLoadingVersions((prev) => ({ ...prev, [promptId]: true }));
            try {
                const versions = await apiClient.prompts.getVersions.query({ promptId });
                setVersionsCache((prev) => ({ ...prev, [promptId]: versions }));
            } finally {
                setLoadingVersions((prev) => ({ ...prev, [promptId]: false }));
            }
        }
    };

    const handleSave = async (formData: any) => {
        switch (formMode) {
            case 'create':
                createMutation.mutate({
                    id: formData.id,
                    name: formData.name,
                    content: formData.content,
                    change_note: formData.change_note,
                });
                break;
            case 'edit':
                updateMutation.mutate({
                    id: formData.id,
                    name: formData.name,
                });
                break;
            case 'newVersion':
                createVersionMutation.mutate({
                    promptId: formData.id,
                    content: formData.content,
                    changeNote: formData.change_note,
                });
                break;
        }
    };

    const isMutating =
        createMutation.isPending ||
        updateMutation.isPending ||
        createVersionMutation.isPending ||
        deleteMutation.isPending ||
        rollbackMutation.isPending;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Prompts ({prompts.length})</h2>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    + Create Prompt
                </button>
            </div>

            {error && <ErrorDisplay error={error.message} onRetry={() => refetch()} />}

            {!isLoading && !error && prompts.length === 0 && (
                <EmptyState
                    message="No prompts yet. Create your first prompt!"
                    action={{ label: 'Create Prompt', onClick: handleCreate }}
                />
            )}

            {!isLoading && !error && prompts.length > 0 && (
                <div className="grid gap-4">
                    {prompts.map((prompt) => (
                        <PromptCard
                            key={prompt.id}
                            prompt={prompt}
                            versions={versionsCache[prompt.id] || []}
                            loadingVersions={loadingVersions[prompt.id] || false}
                            showVersions={versionToggleState[prompt.id] || false}
                            onToggleVersions={() => handleToggleVersions(prompt.id)}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            onCreateVersion={handleCreateVersion}
                            onRollback={handleRollbackClick}
                        />
                    ))}
                </div>
            )}

            <Modal
                open={modal.isOpen}
                onClose={modal.close}
                title={
                    modal.editingItem ? (formMode === 'newVersion' ? 'New Version' : 'Edit Prompt') : 'Create Prompt'
                }
            >
                <PromptForm prompt={modal.editingItem} mode={formMode} onSave={handleSave} onCancel={modal.close} />
            </Modal>

            {/* 删除确认对话框 */}
            <ConfirmModal
                open={showDeleteModal}
                title="删除 Prompt"
                message="确定要删除这个 Prompt 吗？所有版本也将被删除，此操作无法撤销。"
                confirmText="删除"
                cancelText="取消"
                confirmVariant="danger"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setShowDeleteModal(false)}
                isLoading={deleteMutation.isPending}
            />

            {/* 回滚确认对话框 */}
            <ConfirmModal
                open={showRollbackModal}
                title="回滚版本"
                message={`确定要回滚到版本 ${rollbackData?.version} 吗？当前版本将被修改但历史记录将保留。`}
                confirmText="回滚"
                cancelText="取消"
                onConfirm={handleRollbackConfirm}
                onCancel={() => setShowRollbackModal(false)}
                isLoading={rollbackMutation.isPending}
            />
        </div>
    );
}
