/**
 * PromptsPanel 主组件
 */

import { useState } from 'react';
import type { Prompt } from '../../../types/index.js';
import { trpc } from '../../../api.js';
import { PromptCard } from './PromptCard.js';
import { PromptForm, type FormMode } from './PromptForm.js';
import { Modal } from '../../Modal.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function PromptsPanel() {
    const [showModal, setShowModal] = useState(false);
    const [formMode, setFormMode] = useState<FormMode>('create');
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

    const { data: prompts = [], isLoading, error, refetch } = trpc.prompts.list.useQuery();

    const createMutation = trpc.prompts.create.useMutation({
        onSuccess: () => {
            setShowModal(false);
            refetch();
        },
    });

    const updateMutation = trpc.prompts.update.useMutation({
        onSuccess: () => {
            setShowModal(false);
            refetch();
        },
    });

    const createVersionMutation = trpc.prompts.createVersion.useMutation({
        onSuccess: () => {
            setShowModal(false);
            refetch();
        },
    });

    const deleteMutation = trpc.prompts.delete.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

    const rollbackMutation = trpc.prompts.rollbackVersion.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

    const handleCreate = () => {
        setEditingPrompt(null);
        setFormMode('create');
        setShowModal(true);
    };

    const handleEdit = (prompt: Prompt) => {
        setEditingPrompt(prompt);
        setFormMode('edit');
        setShowModal(true);
    };

    const handleCreateVersion = (prompt: Prompt) => {
        setEditingPrompt(prompt);
        setFormMode('newVersion');
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this prompt? All versions will be deleted.')) return;
        deleteMutation.mutate({ id });
    };

    const handleRollback = async (promptId: string, version: number) => {
        rollbackMutation.mutate({ promptId, targetVersion: version });
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Prompts ({prompts.length})</h2>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
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
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onCreateVersion={handleCreateVersion}
                            onRollback={handleRollback}
                        />
                    ))}
                </div>
            )}

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingPrompt ? 'Edit Prompt' : 'Create Prompt'}
            >
                <PromptForm
                    prompt={editingPrompt}
                    mode={formMode}
                    onSave={handleSave}
                    onCancel={() => setShowModal(false)}
                />
            </Modal>
        </div>
    );
}
