/**
 * History Panel Component
 * 历史记录面板 - 使用 @langgraph-js/sdk
 * 支持 macOS 风格红绿灯按钮
 */

import React, { useState, useEffect } from 'react';
import { ChatProvider, useChat } from '@langgraph-js/sdk/react';
import { TrafficLights } from './ui/TrafficLights.js';

interface HistoryThread {
    thread_id: string;
    title?: string;
    metadata?: Record<string, any>;
    status?: 'idle' | 'busy' | 'interrupted' | 'error';
    created_at?: string;
    updated_at?: string;
}

const HistoryPanelContent: React.FC<{ onSwitchToChat?: () => void; onClose?: () => void }> = ({
    onSwitchToChat,
    onClose,
}) => {
    const {
        historyList = [],
        currentChatId,
        refreshHistoryList,
        toHistoryChat,
        createNewChat,
        loading: chatLoading,
    } = useChat();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Load history on mount
    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                await refreshHistoryList();
            } catch (e: any) {
                setError(e.message || '加载历史记录失败');
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, [refreshHistoryList]);

    // Filter history based on search query
    const filteredHistory = historyList.filter((thread: HistoryThread) => {
        const query = searchQuery.toLowerCase();
        return (
            thread.thread_id.toLowerCase().includes(query) ||
            thread.title?.toLowerCase().includes(query) ||
            thread.metadata?.agent_id?.toLowerCase().includes(query)
        );
    });

    // Format date helper
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Get status emoji and color
    const getStatusInfo = (status?: string) => {
        switch (status) {
            case 'idle':
                return { emoji: '🟢', color: 'text-green-600', label: '空闲' };
            case 'busy':
                return { emoji: '🟡', color: 'text-yellow-600', label: '忙碌' };
            case 'interrupted':
                return { emoji: '🟠', color: 'text-orange-600', label: '中断' };
            case 'error':
                return { emoji: '🔴', color: 'text-red-600', label: '错误' };
            default:
                return { emoji: '⚪', color: 'text-gray-500', label: '-' };
        }
    };

    const handleSelectThread = async (thread: HistoryThread) => {
        try {
            await toHistoryChat(thread);
            if (onSwitchToChat) {
                onSwitchToChat();
            }
        } catch (e: any) {
            setError(e.message || '切换对话失败');
        }
    };

    const handleNewChat = () => {
        createNewChat({});
        if (onSwitchToChat) {
            onSwitchToChat();
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-screen bg-gray-50 p-8 items-center justify-center">
                <div className="text-gray-500">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p>加载历史记录中...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-screen bg-gray-50 p-8 items-center justify-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                    <h2 className="text-red-700 font-bold text-xl mb-2">加载错误</h2>
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        重试
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header with Traffic Lights */}
            <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <TrafficLights onClose={onClose} />
                    <h1 className="text-xl font-bold text-gray-800 ml-2">📜 History</h1>
                    <span className="text-sm text-gray-500">{filteredHistory.length} 条记录</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => refreshHistoryList()}
                        disabled={chatLoading}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        刷新
                    </button>
                    <button
                        onClick={handleNewChat}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        + 新对话
                    </button>
                </div>
            </header>

            {/* Search Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <input
                        type="text"
                        placeholder="搜索对话 ID、标题或 Agent ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {filteredHistory.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500">
                            <div className="text-4xl mb-4">📭</div>
                            <p className="text-lg">{searchQuery ? '没有找到匹配的对话' : '暂无历史记录'}</p>
                            <button
                                onClick={handleNewChat}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                创建第一个对话
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 max-w-7xl mx-auto">
                        {filteredHistory.map((thread) => {
                            const statusInfo = getStatusInfo(thread.status);
                            const isCurrent = thread.thread_id === currentChatId;

                            return (
                                <div
                                    key={thread.thread_id}
                                    onClick={() => handleSelectThread(thread)}
                                    className={`
                                        bg-white border rounded-lg p-4 cursor-pointer
                                        transition-all duration-200
                                        hover:shadow-md hover:border-blue-300
                                        ${isCurrent ? 'border-blue-500 shadow-sm' : 'border-gray-200'}
                                    `}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span
                                                    className={`text-lg ${statusInfo.color}`}
                                                    title={statusInfo.label}
                                                >
                                                    {statusInfo.emoji}
                                                </span>
                                                <h3
                                                    className={`font-semibold ${
                                                        isCurrent ? 'text-blue-700' : 'text-gray-800'
                                                    }`}
                                                >
                                                    {thread.title || thread.thread_id.slice(0, 8)}
                                                </h3>
                                                {isCurrent && (
                                                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                                        当前
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-1 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">ID:</span>
                                                    <span className="font-mono text-xs">{thread.thread_id}</span>
                                                </div>
                                                {thread.metadata?.agent_id && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Agent:</span>
                                                        <span className="font-mono text-xs">
                                                            {thread.metadata.agent_id}
                                                        </span>
                                                    </div>
                                                )}
                                                {thread.metadata?.path && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Path:</span>
                                                        <span className="text-xs truncate max-w-md">
                                                            {thread.metadata.path}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right text-sm text-gray-500">
                                            <div>更新: {formatDate(thread.updated_at)}</div>
                                            <div className="text-xs mt-1">创建: {formatDate(thread.created_at)}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

interface HistoryPanelProps {
    onSwitchToChat?: () => void;
    onClose?: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = (props) => {
    return (
        <ChatProvider
            apiUrl="http://127.0.0.1:8124/api/langgraph"
            defaultAgent="swarm"
            defaultHeaders={{}}
            withCredentials={false}
            showHistory={false}
            showGraph={false}
            onInitError={(error, currentAgent) => {
                console.error('History panel init error:', error, currentAgent);
            }}
            autoRestoreLastSession
        >
            <HistoryPanelContent {...props} />
        </ChatProvider>
    );
};
