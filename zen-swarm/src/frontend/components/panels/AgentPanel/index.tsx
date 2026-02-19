/**
 * AgentPanel 主组件
 */

import { useState, useEffect } from 'react';
import type { Agent } from '../../../types/index.js';
import { apiClient } from '../../../api.js';
import { AgentCard } from './AgentCard.js';
import { AgentForm } from './AgentForm.js';
import { Modal } from '../../Modal.js';
import { LoadingOverlay } from '../../LoadingSpinner.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function AgentPanel() {
    // Direct state management with tRPC
    const [showModal, setShowModal] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);

    const loadAgents = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.agents.list.query();
            setAgents(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

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
        try {
            await apiClient.agents.delete.mutate({ id });
            await loadAgents();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleSave = async (formData: any) => {
        try {
            if (editingAgent) {
                await apiClient.agents.update.mutate(formData);
            } else {
                await apiClient.agents.create.mutate(formData);
            }
            setShowModal(false);
            await loadAgents();
        } catch (e: any) {
            setError(e.message);
        }
    };

    useEffect(() => {
        loadAgents();
    }, []);

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

            {loading && <LoadingOverlay />}

            {error && <ErrorDisplay error={error} onRetry={loadAgents} />}

            {!loading && !error && agents.length === 0 && (
                <EmptyState
                    message="No agents yet. Create your first agent!"
                    action={{ label: 'Create Agent', onClick: handleCreate }}
                />
            )}

            {!loading && !error && agents.length > 0 && (
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
