/**
 * AgentPanel 主组件
 */

import { useState } from 'react';
import type { Agent } from '../../../types/index.js';
import { trpc } from '../../../api.js';
import { AgentCard } from './AgentCard.js';
import { AgentForm } from './AgentForm.js';
import { Modal } from '../../Modal.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function AgentPanel() {
    const [showModal, setShowModal] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

    const { data: agents = [], isLoading, error, refetch } = trpc.agents.list.useQuery();

    const createMutation = trpc.agents.create.useMutation({
        onSuccess: () => {
            setShowModal(false);
            refetch();
        },
    });

    const updateMutation = trpc.agents.update.useMutation({
        onSuccess: () => {
            setShowModal(false);
            refetch();
        },
    });

    const deleteMutation = trpc.agents.delete.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

    const handleCreate = () => {
        setEditingAgent(null);
        setShowModal(true);
    };

    const handleEdit = (agent: Agent) => {
        setEditingAgent(agent);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this agent?')) return;
        deleteMutation.mutate({ id });
    };

    const handleSave = async (formData: any) => {
        if (editingAgent) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Agents ({agents.length})</h2>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                    + Create Agent
                </button>
            </div>

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
                        <AgentCard key={agent.id} agent={agent} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingAgent ? 'Edit Agent' : 'Create Agent'}
            >
                <AgentForm agent={editingAgent} onSave={handleSave} onCancel={() => setShowModal(false)} />
            </Modal>
        </div>
    );
}
