/**
 * MCPPanel 主组件
 *
 * 优化点：
 * - 使用 useModal 统一状态管理（规则：rerender-derived-state）
 * - 使用 ConfirmModal 替代 confirm()（规则：rerender-move-effect-to-event）
 */

import { useState } from 'react';
import type { MCPServer } from '../../../types/index.js';
import { trpc } from '../../../api.js';
import { MCPServerCard } from './MCPServerCard.js';
import { MCPServerForm } from './MCPServerForm.js';
import { Modal } from '../../Modal.js';
import { ConfirmModal } from '../../ui/ConfirmModal.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';
import { useModal } from '../../ui/hooks/useModal.js';

export function MCPPanel() {
    const modal = useModal<MCPServer>();

    const { data: servers = [], isLoading, error, refetch } = trpc.mcp.list.useQuery();

    const createMutation = trpc.mcp.create.useMutation({
        onSuccess: () => {
            modal.close();
            refetch();
        },
    });

    const updateMutation = trpc.mcp.update.useMutation({
        onSuccess: () => {
            modal.close();
            refetch();
        },
    });

    const deleteMutation = trpc.mcp.delete.useMutation({
        onSuccess: () => {
            setShowDeleteModal(false);
            refetch();
        },
    });

    // 删除确认对话框状态
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingServerId, setDeletingServerId] = useState<string | null>(null);

    const handleCreate = () => {
        modal.openCreate();
    };

    const handleEdit = (server: MCPServer) => {
        modal.openEdit(server);
    };

    const handleDeleteClick = (id: string) => {
        setDeletingServerId(id);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        if (deletingServerId) {
            deleteMutation.mutate({ id: deletingServerId });
        }
    };

    const handleSave = async (formData: any) => {
        if (modal.editingItem) {
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
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
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
                        <MCPServerCard
                            key={server.id}
                            server={server}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                        />
                    ))}
                </div>
            )}

            <Modal
                open={modal.isOpen}
                onClose={modal.close}
                title={modal.editingItem ? 'Edit MCP Server' : 'Add MCP Server'}
            >
                <MCPServerForm server={modal.editingItem} onSave={handleSave} onCancel={modal.close} />
            </Modal>

            {/* 非阻塞式删除确认对话框（规则：rerender-move-effect-to-event） */}
            <ConfirmModal
                open={showDeleteModal}
                title="删除 MCP Server"
                message="确定要删除这个 MCP Server 吗？此操作无法撤销。"
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
