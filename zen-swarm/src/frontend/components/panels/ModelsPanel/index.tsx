/**
 * ModelsPanel 主组件
 */

import { useState } from 'react';
import type { Model } from '../../../types/index.js';
import { trpc } from '../../../api.js';
import { ModelCard } from './ModelCard.js';
import { ModelForm } from './ModelForm.js';
import { Modal } from '../../Modal.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function ModelsPanel() {
    const [showModal, setShowModal] = useState(false);
    const [editingModel, setEditingModel] = useState<Model | null>(null);

    const { data: models = [], isLoading, error, refetch } = trpc.models.list.useQuery();

    const createMutation = trpc.models.create.useMutation({
        onSuccess: () => {
            setShowModal(false);
            refetch();
        },
    });

    const updateMutation = trpc.models.update.useMutation({
        onSuccess: () => {
            setShowModal(false);
            refetch();
        },
    });

    const deleteMutation = trpc.models.delete.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

    const handleCreate = () => {
        setEditingModel(null);
        setShowModal(true);
    };

    const handleEdit = (model: Model) => {
        setEditingModel(model);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this model?')) return;
        deleteMutation.mutate({ id });
    };

    const handleSave = async (formData: any) => {
        if (editingModel) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Models ({models.length})</h2>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
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
                        <ModelCard key={model.id} model={model} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingModel ? 'Edit Model' : 'Create Model'}
            >
                <ModelForm model={editingModel} onSave={handleSave} onCancel={() => setShowModal(false)} />
            </Modal>
        </div>
    );
}
