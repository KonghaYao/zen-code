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

// 定义历史记录线程类型，包含可选的 title 字段
type HistoryThread = Thread<{ messages: any[] }> & {
    title?: string;
};

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
    const filteredHistory = (historyList as HistoryThread[]).filter((thread) => {
        const query = searchQuery.toLowerCase();
        const metadata = thread.metadata as Record<string, unknown> | undefined;
        const title = (thread as any).title as string | undefined;
        return (
            thread.thread_id.toLowerCase().includes(query) ||
            (title?.toLowerCase()?.includes(query) ?? false) ||
            ((metadata?.agent_id as string)?.toLowerCase()?.includes(query) ?? false)
        );
    });

    return (
        <div className="flex-shrink-0 bg-bg-secondary text-text-primary flex flex-col h-full overflow-hidden">
            {/* New Chat Button */}
            <div className="p-4 border-b border-border-subtle">
                <button
                    onClick={handleNewChat}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium text-white transition-colors duration-150"
                >
                    <span>+</span>
                    <span>New Chat</span>
                </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-2">
                {filteredHistory.length === 0 ? (
                    <div className="text-center py-8 text-sm text-text-muted">
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
                                            ? 'bg-primary-light text-primary-dark'
                                            : 'hover:bg-bg-tertiary text-text-secondary'
                                    }
                                `}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-xs mt-0.5" title={thread.status || 'Unknown'}>
                                        {statusEmoji}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm truncate">
                                            {(thread as any).title || thread.thread_id.slice(0, 12)}
                                        </div>
                                        <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                                            <span className="truncate">{formatDate(thread.updated_at)}</span>
                                            {((thread.metadata as Record<string, unknown>)?.agent_id as string) && (
                                                <>
                                                    <span>·</span>
                                                    <span className="truncate max-w-16 font-mono text-primary">
                                                        {
                                                            (thread.metadata as Record<string, unknown>)
                                                                .agent_id as string
                                                        }
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
            <div className="p-3 border-t border-border-subtle text-xs text-text-muted">
                <div className="flex items-center justify-between">
                    <span>{filteredHistory.length} conversations</span>
                    <button
                        onClick={() => refreshHistoryList()}
                        className="text-primary hover:underline"
                        title="Refresh"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        </div>
    );
}
