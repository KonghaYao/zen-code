/**
 * HistorySidebar 组件 - 聊天历史侧边栏
 *
 * 从 ChatPanel 中提取为独立组件
 * 优化点：
 * - 使用外部工具函数（规则：js-hoist-regexp, js-early-exit）
 */

import { useEffect, useState } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import type { Thread } from '@langgraph-js/sdk';
import { formatDate, getStatusEmoji } from '../utils/chatHelpers.js';

type HistoryThread = Thread<any>;

interface HistorySidebarProps {
    onSwitchToChat?: () => void;
}

export function HistorySidebar(props: HistorySidebarProps) {
    const { historyList = [], currentChatId, refreshHistoryList, toHistoryChat, createNewChat } = useChat();

    const [searchQuery, setSearchQuery] = useState('');

    const handleSelectThread = async (thread: HistoryThread) => {
        await toHistoryChat(thread);
    };

    const handleNewChat = () => {
        createNewChat({});
    };

    // 过滤历史记录（规则：js-combine-iterations）
    const filteredHistory = historyList.filter((thread: HistoryThread) => {
        const query = searchQuery.toLowerCase();
        return (
            thread.thread_id.toLowerCase().includes(query) ||
            thread.title?.toLowerCase().includes(query) ||
            thread.metadata?.agent_id?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="flex-shrink-0 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] flex flex-col h-full overflow-hidden">
            {/* New Chat Button */}
            <div className="p-4 border-b border-[var(--color-border-subtle)]">
                <button
                    onClick={handleNewChat}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg text-sm font-medium text-white transition-colors duration-150"
                >
                    <span>+</span>
                    <span>New Chat</span>
                </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-2">
                {filteredHistory.length === 0 ? (
                    <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
                        {searchQuery ? 'No conversations found' : 'No history yet'}
                    </div>
                ) : (
                    filteredHistory.map((thread) => {
                        const isCurrent = thread.thread_id === currentChatId;
                        const statusEmoji = getStatusEmoji(thread.status);

                        return (
                            <button
                                key={thread.thread_id}
                                onClick={() => handleSelectThread(thread)}
                                className={`
                                    w-full text-left px-3 py-2.5 rounded-lg transition-colors duration-150
                                    ${
                                        isCurrent
                                            ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]'
                                            : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                                    }
                                `}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-xs mt-0.5" title={thread.status || 'Unknown'}>
                                        {statusEmoji}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm truncate">
                                            {thread.title || thread.thread_id.slice(0, 12)}
                                        </div>
                                        <div className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                                            <span className="truncate">{formatDate(thread.updated_at)}</span>
                                            {thread.metadata?.agent_id && (
                                                <>
                                                    <span>·</span>
                                                    <span className="truncate max-w-16 font-mono text-[var(--color-primary)]">
                                                        {thread.metadata.agent_id}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)]">
                <div className="flex items-center justify-between">
                    <span>{filteredHistory.length} conversations</span>
                    <button
                        onClick={() => refreshHistoryList()}
                        className="text-[var(--color-primary)] hover:underline"
                        title="Refresh"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        </div>
    );
}
