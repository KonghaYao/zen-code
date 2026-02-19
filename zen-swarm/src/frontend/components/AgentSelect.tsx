/**
 * Agent Select Component
 * 选择 Agent 进行对话（深色主题）
 */

import React, { useEffect, useRef } from 'react';
import { trpc } from '../api.js';
import type { Agent } from '../types/index.js';

interface AgentSelectProps {
    value?: string;
    onChange: (agentId: string) => void;
    disabled?: boolean;
}

export const AgentSelect: React.FC<AgentSelectProps> = ({ value, onChange, disabled = false }) => {
    const { data: agents = [], isLoading, error, refetch } = trpc.agents.list.useQuery();
    const hasAutoSelected = useRef(false);

    // Auto-select first agent when list loads
    useEffect(() => {
        // Only auto-select if:
        // 1. Not loading
        // 2. Have agents
        // 3. Haven't auto-selected yet
        // 4. Current value is empty OR doesn't exist in agents list
        if (!isLoading && agents.length > 0 && !hasAutoSelected.current) {
            const valueExists = agents.some((a) => a.id === value);

            if (!value || !valueExists) {
                onChange(agents[0].id);
                hasAutoSelected.current = true;
            }
        }
    }, [agents, isLoading, value, onChange]);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Loading agents...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-red-400">{error.message}</span>
                <button onClick={() => refetch()} className="text-xs text-teal-400 hover:underline">
                    Retry
                </button>
            </div>
        );
    }

    if (agents.length === 0) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">No agents available</span>
                <button onClick={() => refetch()} className="text-xs text-teal-400 hover:underline">
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
