/**
 * MCPPanel 主组件
 */

import { useState } from 'react';
import type { MCPServer } from '../../../types/index.js';
import { trpc } from '../../../api.js';
import { MCPServerCard } from './MCPServerCard.js';
import { MCPServerForm } from './MCPServerForm.js';
import { Modal } from '../../Modal.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function MCPPanel() {
    const [showModal, setShowModal] = useState(false);
    const [editingServer, setEditingServer] = useState<MCPServer | null>(null);

    const { data: servers = [], isLoading, error, refetch } = trpc.mcp.list.useQuery();

    const createMutation = trpc.mcp.create.useMutation({
        onSuccess: () => {
            setShowModal(false);
            refetch();
        },
    });

    const updateMutation = trpc.mcp.update.useMutation({
        onSuccess: () => {
            setShowModal(false);
            refetch();
        },
    });

    const deleteMutation = trpc.mcp.delete.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

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
        deleteMutation.mutate({ id });
    };

    const handleSave = async (formData: any) => {
        if (editingServer) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

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

            {error && <ErrorDisplay error={error.message} onRetry={() => refetch()} />}

            {!isLoading && !error && servers.length === 0 && (
                <EmptyState
                    message="No MCP servers configured yet. Add your first MCP server!"
                    action={{ label: 'Add Server', onClick: handleCreate }}
                />
            )}

            {!isLoading && !error && servers.length > 0 && (
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
