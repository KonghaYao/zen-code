/**
 * MCPPanel 主组件
 *
 * 优化点：
 * - 使用 useModal 统一状态管理（规则：rerender-derived-state）
 * - 使用 ConfirmModal 替代 confirm()（规则：rerender-move-effect-to-event）
 * - 支持 macOS 风格红绿灯按钮
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
import { TrafficLights } from '../../ui/TrafficLights.js';

interface MCPPanelProps {
    onClose?: () => void;
}

export function MCPPanel({ onClose }: MCPPanelProps) {
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
        <div className="flex flex-col h-full">
            {/* macOS Style Header with Traffic Lights */}
            <header className="flex-shrink-0 bg-transparent px-4 py-3 flex items-center justify-between border-b border-border-subtle">
                <div className="flex items-center gap-3">
                    <TrafficLights onClose={onClose} />
                    <h2 className="text-xl font-semibold text-text-primary ml-2">
                        MCP Servers
                        <span className="badge badge-primary ml-3">{servers.length}</span>
                    </h2>
                </div>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    + Add Server
                </button>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
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
            </div>

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
