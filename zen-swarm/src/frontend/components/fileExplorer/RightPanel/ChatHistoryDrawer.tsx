/**
 * ChatHistoryDrawer - 历史记录抽屉
 * 从底部弹出，显示历史对话列表
 *
 * 优化点（Vercel React Best Practices）：
 * - rerender-memo: 使用 React.memo 优化列表项渲染
 * - js-combine-iterations: 合并过滤逻辑
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import type { Thread } from '@langgraph-js/sdk';
import { formatDate, getStatusEmoji } from '../../../utils/chatHelpers.js';

// ========================================
// Types
// ========================================

type HistoryThread = Thread<any>;

interface ChatHistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

// ========================================
// Helper Functions
// ========================================

/**
 * 获取线程标题
 */
function getThreadTitle(thread: HistoryThread): string {
    // 尝试从 metadata 中获取标题
    const metadata = thread.metadata as Record<string, unknown> | undefined;
    if (metadata?.title && typeof metadata.title === 'string') {
        return metadata.title;
    }
    // 回退到 thread_id
    return thread.thread_id.slice(0, 10);
}

/**
 * 获取 Agent ID
 */
function getAgentId(thread: HistoryThread): string | null {
    const metadata = thread.metadata as Record<string, unknown> | undefined;
    if (metadata?.agent_id && typeof metadata.agent_id === 'string') {
        return metadata.agent_id;
    }
    return null;
}

// ========================================
// History Item Component
// ========================================

interface HistoryItemProps {
    thread: HistoryThread;
    isCurrent: boolean;
    onClick: () => void;
}

const HistoryItem = React.memo<HistoryItemProps>(({ thread, isCurrent, onClick }) => {
    const statusEmoji = getStatusEmoji(thread.status);
    const title = getThreadTitle(thread);
    const agentId = getAgentId(thread);

    return (
        <button
            onClick={onClick}
            className={`
                w-full text-left px-2.5 py-2 rounded text-xs transition-colors
                ${
                    isCurrent
                        ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]'
                        : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                }
            `}
        >
            <div className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0" title={thread.status || 'Unknown'}>
                    {statusEmoji}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{title}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                        <span className="truncate">{formatDate(thread.updated_at)}</span>
                        {agentId && (
                            <>
                                <span>·</span>
                                <span className="truncate max-w-12 font-mono text-[var(--color-primary)]">
                                    {agentId}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
});

HistoryItem.displayName = 'HistoryItem';

// ========================================
// Main Component
// ========================================

export const ChatHistoryDrawer: React.FC<ChatHistoryDrawerProps> = ({ isOpen, onClose }) => {
    const { historyList = [], currentChatId, refreshHistoryList, toHistoryChat, createNewChat } = useChat();
    const [searchQuery, setSearchQuery] = useState('');

    // 过滤历史记录（规则：js-combine-iterations）
    const filteredHistory = useMemo(() => {
        if (!searchQuery.trim()) return historyList;

        const query = searchQuery.toLowerCase();
        return historyList.filter((thread: HistoryThread) => {
            const threadId = thread.thread_id.toLowerCase();
            const title = getThreadTitle(thread).toLowerCase();
            const agentId = getAgentId(thread)?.toLowerCase() || '';

            return threadId.includes(query) || title.includes(query) || agentId.includes(query);
        });
    }, [historyList, searchQuery]);

    // 选择历史会话
    const handleSelectThread = useCallback(
        async (thread: HistoryThread) => {
            await toHistoryChat(thread);
            onClose();
        },
        [toHistoryChat, onClose],
    );

    // 新建对话
    const handleNewChat = useCallback(() => {
        createNewChat({});
        onClose();
    }, [createNewChat, onClose]);

    // 刷新列表
    const handleRefresh = useCallback(() => {
        refreshHistoryList();
    }, [refreshHistoryList]);

    if (!isOpen) return null;

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border-subtle)] shadow-lg z-10 animate-slide-up max-h-[60%] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] shrink-0">
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">History</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleNewChat}
                        className="px-2 py-1 text-xs text-[var(--color-primary)] hover:bg-[var(--color-bg-secondary)] rounded transition-colors"
                        title="New chat"
                    >
                        + New
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] rounded transition-colors"
                        title="Refresh"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] rounded transition-colors"
                        title="Close"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-[var(--color-border-subtle)] shrink-0">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border-default)] rounded focus:outline-none focus:border-[var(--color-primary)]"
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2">
                {filteredHistory.length === 0 ? (
                    <div className="text-center py-4 text-xs text-[var(--color-text-muted)]">
                        {searchQuery ? 'No results' : 'No history yet'}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredHistory.map((thread) => (
                            <HistoryItem
                                key={thread.thread_id}
                                thread={thread}
                                isCurrent={thread.thread_id === currentChatId}
                                onClick={() => handleSelectThread(thread)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-3 py-1.5 border-t border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-muted)] shrink-0">
                {filteredHistory.length} conversation{filteredHistory.length !== 1 ? 's' : ''}
            </div>
        </div>
    );
};

export default ChatHistoryDrawer;
