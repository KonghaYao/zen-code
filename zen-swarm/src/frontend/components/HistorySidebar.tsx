/**
 * HistorySidebar 组件 - 聊天历史侧边栏
 *
 * 从 ChatPanel 中提取为独立组件
 * 优化点：
 * - 使用外部工具函数（规则：js-hoist-regexp, js-early-exit）
 */

import { useState } from 'react';
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
        <div className="w-64 flex-shrink-0 bg-gray-900 text-gray-100 flex flex-col h-full overflow-hidden border-r border-gray-700">
            {/* New Chat Button */}
            <div className="p-3 border-b border-gray-700">
                <button
                    onClick={handleNewChat}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                >
                    <span className="text-lg">➕</span>
                    <span>新对话</span>
                </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-gray-700">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="搜索对话..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 pl-8 bg-gray-800 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-400"
                    />
                    <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
                </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        {searchQuery ? '没有找到匹配的对话' : '暂无历史记录'}
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
                                    w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200
                                    ${isCurrent ? 'bg-gray-700 text-white' : 'hover:bg-gray-800 text-gray-300'}
                                `}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-xs mt-0.5" title={thread.status || '未知'}>
                                        {statusEmoji}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm truncate">
                                            {thread.title || thread.thread_id.slice(0, 12)}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                            <span className="truncate">{formatDate(thread.updated_at)}</span>
                                            {thread.metadata?.agent_id && (
                                                <>
                                                    <span>•</span>
                                                    <span className="truncate max-w-16">
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
            <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                    <span>{filteredHistory.length} 条记录</span>
                    <button
                        onClick={() => refreshHistoryList()}
                        className="hover:text-gray-300 transition-colors"
                        title="刷新"
                    >
                        🔄
                    </button>
                </div>
            </div>
        </div>
    );
}
