/**
 * Agent Select Component
 * 选择 Agent 进行对话（深色主题）
 */

import React, { useEffect, useState } from 'react';
import { apiClient } from '../api.js';
import type { Agent } from '../types/index.js';

interface AgentSelectProps {
    value?: string;
    onChange: (agentId: string) => void;
    disabled?: boolean;
}

export const AgentSelect: React.FC<AgentSelectProps> = ({ value, onChange, disabled = false }) => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAgents();
    }, []);

    const loadAgents = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await apiClient.agents.list.query();
            setAgents(result || []);
        } catch (err) {
            setError('Failed to load agents');
            console.error('Failed to load agents:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Loading agents...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-red-400">{error}</span>
                <button onClick={loadAgents} className="text-xs text-teal-400 hover:underline">
                    Retry
                </button>
            </div>
        );
    }

    if (agents.length === 0) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">No agents available</span>
                <button onClick={loadAgents} className="text-xs text-teal-400 hover:underline">
                    Refresh
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <label htmlFor="agent-select" className="text-sm font-medium text-gray-300">
                Agent:
            </label>
            <select
                id="agent-select"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
                <option value="">Select an agent...</option>
                {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                        {agent.name} - {agent.description}
                    </option>
                ))}
            </select>
        </div>
    );
};
