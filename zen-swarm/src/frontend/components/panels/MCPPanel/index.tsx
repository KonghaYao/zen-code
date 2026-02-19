/**
 * MCPPanel 主组件
 */

import { useState, useEffect } from 'react';
import type { MCPServer } from '../../../types/index.js';
import { apiClient } from '../../../api.js';
import { MCPServerCard } from './MCPServerCard.js';
import { MCPServerForm } from './MCPServerForm.js';
import { Modal } from '../../Modal.js';
import { LoadingOverlay } from '../../LoadingSpinner.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function MCPPanel() {
    const [showModal, setShowModal] = useState(false);
    const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [servers, setServers] = useState<MCPServer[]>([]);

    const loadServers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.mcp.list.query();
            setServers(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingServer(null);
        setShowModal(true);
    };

    const handleEdit = (server: MCPServer) => {
        setEditingServer(server);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this MCP server?')) return;
        try {
            await apiClient.mcp.delete.mutate({ id });
            await loadServers();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleSave = async (formData: any) => {
        try {
            if (editingServer) {
                await apiClient.mcp.update.mutate(formData);
            } else {
                await apiClient.mcp.create.mutate(formData);
            }
            setShowModal(false);
            await loadServers();
        } catch (e: any) {
            setError(e.message);
        }
    };

    useEffect(() => {
        loadServers();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">MCP Servers ({servers.length})</h2>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                    + Add Server
                </button>
            </div>

            {loading && <LoadingOverlay />}

            {error && <ErrorDisplay error={error} onRetry={loadServers} />}

            {!loading && !error && servers.length === 0 && (
                <EmptyState
                    message="No MCP servers configured yet. Add your first MCP server!"
                    action={{ label: 'Add Server', onClick: handleCreate }}
                />
            )}

            {!loading && !error && servers.length > 0 && (
                <div className="grid gap-4">
                    {servers.map((server) => (
                        <MCPServerCard key={server.id} server={server} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingServer ? 'Edit MCP Server' : 'Add MCP Server'}
            >
                <MCPServerForm server={editingServer} onSave={handleSave} onCancel={() => setShowModal(false)} />
            </Modal>
        </div>
    );
}
