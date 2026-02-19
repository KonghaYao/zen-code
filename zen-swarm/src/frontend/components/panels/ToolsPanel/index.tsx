/**
 * ToolsPanel 主组件
 */

import { useState, useEffect } from 'react';
import type { Tool } from '../../../types/index.js';
import { apiClient } from '../../../api.js';
import { ToolCard } from './ToolCard.js';
import { ToolForm } from './ToolForm.js';
import { Modal } from '../../Modal.js';
import { LoadingOverlay } from '../../LoadingSpinner.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function ToolsPanel() {
    const [showModal, setShowModal] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tools, setTools] = useState<Tool[]>([]);

    const loadTools = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.tools.list.query();
            setTools(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingTool(null);
        setShowModal(true);
    };

    const handleEdit = (tool: Tool) => {
        setEditingTool(tool);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this tool?')) return;
        try {
            await apiClient.tools.delete.mutate({ id });
            await loadTools();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleSave = async (formData: any) => {
        try {
            if (editingTool) {
                await apiClient.tools.update.mutate(formData);
            } else {
                await apiClient.tools.create.mutate(formData);
            }
            setShowModal(false);
            await loadTools();
        } catch (e: any) {
            setError(e.message);
        }
    };

    useEffect(() => {
        loadTools();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Tools ({tools.length})</h2>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                    + Create Tool
                </button>
            </div>

            {loading && <LoadingOverlay />}

            {error && <ErrorDisplay error={error} onRetry={loadTools} />}

            {!loading && !error && tools.length === 0 && (
                <EmptyState
                    message="No tools yet. Create your first tool!"
                    action={{ label: 'Create Tool', onClick: handleCreate }}
                />
            )}

            {!loading && !error && tools.length > 0 && (
                <div className="grid gap-4">
                    {tools.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingTool ? 'Edit Tool' : 'Create Tool'}
            >
                <ToolForm tool={editingTool} onSave={handleSave} onCancel={() => setShowModal(false)} />
            </Modal>
        </div>
    );
}
