/**
 * MiddlewaresPanel 主组件
 */

import { useState, useEffect } from 'react';
import type { Middleware } from '../../../types/index.js';
import { apiClient } from '../../../api.js';
import { MiddlewareCard } from './MiddlewareCard.js';
import { MiddlewareForm } from './MiddlewareForm.js';
import { Modal } from '../../Modal.js';
import { LoadingOverlay } from '../../LoadingSpinner.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function MiddlewaresPanel() {
    const [showModal, setShowModal] = useState(false);
    const [editingMiddleware, setEditingMiddleware] = useState<Middleware | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [middlewares, setMiddlewares] = useState<Middleware[]>([]);

    const loadMiddlewares = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.middlewares.list.query();
            setMiddlewares(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingMiddleware(null);
        setShowModal(true);
    };

    const handleEdit = (middleware: Middleware) => {
        setEditingMiddleware(middleware);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this middleware?')) return;
        try {
            await apiClient.middlewares.delete.mutate({ id });
            await loadMiddlewares();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleSave = async (formData: any) => {
        try {
            if (editingMiddleware) {
                await apiClient.middlewares.update.mutate(formData);
            } else {
                await apiClient.middlewares.create.mutate(formData);
            }
            setShowModal(false);
            await loadMiddlewares();
        } catch (e: any) {
            setError(e.message);
        }
    };

    useEffect(() => {
        loadMiddlewares();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Middlewares ({middlewares.length})</h2>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                    + Create Middleware
                </button>
            </div>

            {loading && <LoadingOverlay />}

            {error && <ErrorDisplay error={error} onRetry={loadMiddlewares} />}

            {!loading && !error && middlewares.length === 0 && (
                <EmptyState
                    message="No middlewares yet. Create your first middleware!"
                    action={{ label: 'Create Middleware', onClick: handleCreate }}
                />
            )}

            {!loading && !error && middlewares.length > 0 && (
                <div className="grid gap-4">
                    {middlewares
                        .sort((a, b) => a.priority - b.priority)
                        .map((middleware) => (
                            <MiddlewareCard
                                key={middleware.id}
                                middleware={middleware}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                </div>
            )}

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingMiddleware ? 'Edit Middleware' : 'Create Middleware'}
            >
                <MiddlewareForm
                    middleware={editingMiddleware}
                    onSave={handleSave}
                    onCancel={() => setShowModal(false)}
                />
            </Modal>
        </div>
    );
}
