/**
 * AgentPanel 主组件
 *
 * 优化点：
 * - 使用 useModal 统一状态管理（规则：rerender-derived-state）
 * - 在父组件查询所有依赖数据，避免重复查询（规则：rerender-memo）
 * - 使用 Map 优化数据查找（规则：js-index-maps）
 * - 使用 ConfirmModal 替代 confirm()（规则：rerender-move-effect-to-event）
 * - 支持 macOS 风格红绿灯按钮
 */

import { useMemo, useState } from 'react';
import type { Agent } from '../../../types/index.js';
import { trpc } from '../../../api.js';
import { AgentCard } from './AgentCard.js';
import { AgentForm } from './AgentForm.js';
import { Modal } from '../../Modal.js';
import { ConfirmModal } from '../../ui/ConfirmModal.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';
import { useModal } from '../../ui/hooks/useModal.js';
import { TrafficLights } from '../../ui/TrafficLights.js';

interface AgentPanelProps {
    onClose?: () => void;
}

export function AgentPanel({ onClose }: AgentPanelProps) {
    const modal = useModal<Agent>();

    // 在父组件查询所有依赖数据，避免在 Card 中重复查询（规则：rerender-memo）
    const { data: agents = [], isLoading, error, refetch } = trpc.agents.list.useQuery();

    const { data: models = [] } = trpc.models.list.useQuery();
    const { data: prompts = [] } = trpc.prompts.list.useQuery();
    const { data: tools = [] } = trpc.tools.list.useQuery();
    const { data: middlewares = [] } = trpc.middlewares.list.useQuery();

    // 使用 Map 优化查找性能（规则：js-index-maps）
    const modelMap = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
    const promptMap = useMemo(() => new Map(prompts.map((p) => [p.id, p])), [prompts]);
    const toolMap = useMemo(() => new Map(tools.map((t) => [t.id, t])), [tools]);
    const middlewareMap = useMemo(() => new Map(middlewares.map((m) => [m.id, m])), [middlewares]);

    const createMutation = trpc.agents.create.useMutation({
        onSuccess: () => {
            modal.close();
            refetch();
        },
    });

    const updateMutation = trpc.agents.update.useMutation({
        onSuccess: () => {
            modal.close();
            refetch();
        },
    });

    const deleteMutation = trpc.agents.delete.useMutation({
        onSuccess: () => {
            setShowDeleteModal(false);
            refetch();
        },
    });

    // 删除确认对话框状态
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);

    const handleCreate = () => {
        modal.openCreate();
    };

    const handleEdit = (agent: Agent) => {
        modal.openEdit(agent);
    };

    const handleDeleteClick = (id: string) => {
        setDeletingAgentId(id);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        if (deletingAgentId) {
            deleteMutation.mutate({ id: deletingAgentId });
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
            <header className="shrink-0 bg-transparent px-4 py-3 flex items-center justify-between border-b border-border-subtle">
                <div className="flex items-center gap-3">
                    <TrafficLights onClose={onClose} />
                    <h2 className="text-xl font-semibold text-text-primary ml-2">
                        Agents
                        <span className="badge badge-primary ml-3">{agents.length}</span>
                    </h2>
                </div>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    + Create Agent
                </button>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
                {error && <ErrorDisplay error={error.message} onRetry={() => refetch()} />}

                {!isLoading && !error && agents.length === 0 && (
                    <EmptyState
                        message="No agents yet. Create your first agent!"
                        action={{ label: 'Create Agent', onClick: handleCreate }}
                    />
                )}

                {!isLoading && !error && agents.length > 0 && (
                    <div className="grid gap-4">
                        {agents.map((agent) => (
                            <AgentCard
                                key={agent.id}
                                agent={agent}
                                modelMap={modelMap}
                                promptMap={promptMap}
                                toolMap={toolMap}
                                middlewareMap={middlewareMap}
                                onEdit={handleEdit}
                                onDelete={handleDeleteClick}
                            />
                        ))}
                    </div>
                )}
            </div>

            <Modal open={modal.isOpen} onClose={modal.close} title={modal.getTitle('Agent')} size="lg">
                <AgentForm
                    agent={modal.editingItem}
                    models={models}
                    prompts={prompts}
                    tools={tools}
                    middlewares={middlewares}
                    onSave={handleSave}
                    onCancel={modal.close}
                />
            </Modal>

            {/* 非阻塞式删除确认对话框（规则：rerender-move-effect-to-event） */}
            <ConfirmModal
                open={showDeleteModal}
                title="删除 Agent"
                message="确定要删除这个 Agent 吗？此操作无法撤销。"
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
