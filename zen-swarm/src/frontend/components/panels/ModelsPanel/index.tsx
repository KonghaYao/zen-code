/**
 * ModelsPanel 主组件
 */

import { useState, useEffect } from 'react';
import type { Model } from '../../../types/index.js';
import { apiClient } from '../../../api.js';
import { ModelCard } from './ModelCard.js';
import { ModelForm } from './ModelForm.js';
import { Modal } from '../../Modal.js';
import { LoadingOverlay } from '../../LoadingSpinner.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function ModelsPanel() {
    const [showModal, setShowModal] = useState(false);
    const [editingModel, setEditingModel] = useState<Model | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [models, setModels] = useState<Model[]>([]);

    const loadModels = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.models.list.query();
            setModels(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

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
        try {
            await apiClient.models.delete.mutate({ id });
            await loadModels();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleSave = async (formData: any) => {
        try {
            if (editingModel) {
                await apiClient.models.update.mutate(formData);
            } else {
                await apiClient.models.create.mutate(formData);
            }
            setShowModal(false);
            await loadModels();
        } catch (e: any) {
            setError(e.message);
        }
    };

    useEffect(() => {
        loadModels();
    }, []);

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

            {loading && <LoadingOverlay />}

            {error && <ErrorDisplay error={error} onRetry={loadModels} />}

            {!loading && !error && models.length === 0 && (
                <EmptyState
                    message="No models yet. Create your first model!"
                    action={{ label: 'Create Model', onClick: handleCreate }}
                />
            )}

            {!loading && !error && models.length > 0 && (
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
