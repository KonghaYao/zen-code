/**
 * PromptsPanel 主组件
 */

import { useState, useEffect } from 'react';
import type { Prompt } from '../../../types/index.js';
import { apiClient } from '../../../api.js';
import { PromptCard } from './PromptCard.js';
import { PromptForm } from './PromptForm.js';
import { Modal } from '../../Modal.js';
import { LoadingOverlay } from '../../LoadingSpinner.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function PromptsPanel() {
    const [showModal, setShowModal] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [prompts, setPrompts] = useState<Prompt[]>([]);

    const loadPrompts = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.prompts.list.query();
            setPrompts(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingPrompt(null);
        setShowModal(true);
    };

    const handleEdit = (prompt: Prompt) => {
        setEditingPrompt(prompt);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this prompt?')) return;
        try {
            await apiClient.prompts.delete.mutate({ id });
            await loadPrompts();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleSave = async (formData: any) => {
        try {
            if (editingPrompt) {
                await apiClient.prompts.update.mutate(formData);
            } else {
                await apiClient.prompts.create.mutate(formData);
            }
            setShowModal(false);
            await loadPrompts();
        } catch (e: any) {
            setError(e.message);
        }
    };

    useEffect(() => {
        loadPrompts();
    }, []);

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

            {loading && <LoadingOverlay />}

            {error && <ErrorDisplay error={error} onRetry={loadPrompts} />}

            {!loading && !error && prompts.length === 0 && (
                <EmptyState
                    message="No prompts yet. Create your first prompt!"
                    action={{ label: 'Create Prompt', onClick: handleCreate }}
                />
            )}

            {!loading && !error && prompts.length > 0 && (
                <div className="grid gap-4">
                    {prompts.map((prompt) => (
                        <PromptCard key={prompt.id} prompt={prompt} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingPrompt ? 'Edit Prompt' : 'Create Prompt'}
            >
                <PromptForm prompt={editingPrompt} onSave={handleSave} onCancel={() => setShowModal(false)} />
            </Modal>
        </div>
    );
}
