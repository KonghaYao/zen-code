/**
 * Agent Select Component
 * 选择 Agent 进行对话（深色主题）
 */

import React, { useEffect, useRef } from 'react';
import { trpc } from '../api.js';
import type { Agent } from '../types/index.js';
import { Select } from './ui/Select.js';

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
                console.log('AgentSelect: Auto-selecting first agent', agents[0].id);
                onChange(agents[0].id);
                hasAutoSelected.current = true;
            }
        }
    }, [agents, isLoading, value, onChange]);

    const handleAgentChange = (agentId: string) => {
        console.log('AgentSelect: Agent changed to', agentId);
        onChange(agentId);
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-2">
                <div className="loading-spinner w-4 h-4"></div>
                <span className="text-sm text-[var(--color-text-muted)]">Loading agents...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--color-error)]">{error.message}</span>
                <button
                    onClick={() => refetch()}
                    className="text-xs text-[var(--color-primary)] hover:underline transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (agents.length === 0) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--color-text-muted)]">No agents available</span>
                <button
                    onClick={() => refetch()}
                    className="text-xs text-[var(--color-primary)] hover:underline transition-colors"
                >
                    Refresh
                </button>
            </div>
        );
    }

    const options = agents.map((agent) => ({
        value: agent.id,
        label: `${agent.name} - ${agent.description}`,
    }));

    return (
        <div className="flex items-center gap-2">
            <label htmlFor="agent-select" className="text-sm font-medium text-[var(--color-text-secondary)]">
                Agent:
            </label>
            <Select
                value={value || ''}
                onChange={handleAgentChange}
                options={options}
                placeholder="Select an agent..."
                disabled={disabled}
                className="w-64"
            />
        </div>
    );
};
