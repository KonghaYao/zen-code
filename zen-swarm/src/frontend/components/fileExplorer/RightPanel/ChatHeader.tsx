/**
 * ChatHeader - Chat 面板头部
 * 压缩设计，包含 Agent 选择器和停止按钮
 */

import React from 'react';
import { AgentSelect } from '../../AgentSelect.js';

interface ChatHeaderProps {
    selectedAgentId?: string;
    onAgentChange: (agentId: string) => void;
    loading: boolean;
    onStop: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ selectedAgentId, onAgentChange, loading, onStop }) => {
    return (
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]">
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs font-medium text-[var(--color-text-secondary)] shrink-0">Agent:</span>
                <div className="min-w-0">
                    <AgentSelect value={selectedAgentId} onChange={onAgentChange} disabled={loading} />
                </div>
            </div>
            {loading && (
                <button
                    onClick={onStop}
                    className="ml-2 px-2 py-1 text-xs font-medium bg-white border border-[var(--color-border-default)] text-[var(--color-text-primary)] rounded hover:bg-[var(--color-bg-tertiary)] transition-colors shrink-0"
                >
                    Stop
                </button>
            )}
        </div>
    );
};

export default ChatHeader;
