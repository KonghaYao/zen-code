/**
 * Chat Panel Component
 * 主聊天面板组件 - 基于 @langgraph-js/sdk
 * 左侧历史记录侧边栏 + 右侧聊天区域（深色主题）
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatProvider, useChat } from '@langgraph-js/sdk/react';
import type { Message, Thread } from '@langgraph-js/sdk';
import { HumanMessage, AIMessage, ToolMessage } from './messages';
import { ChatInput } from './ChatInput';
import { AgentSelect } from './AgentSelect';

interface ChatPanelProps {
    apiUrl?: string;
    defaultAgent?: string;
    modelName?: string;
    onClose?: () => void;
}

type HistoryThread = Thread<any>;

// History Sidebar Component
const HistorySidebar: React.FC<{ onSwitchToChat?: () => void }> = () => {
    const { historyList = [], currentChatId, refreshHistoryList, toHistoryChat, createNewChat } = useChat();
    const [searchQuery, setSearchQuery] = useState('');

    const handleSelectThread = async (thread: HistoryThread) => {
        await toHistoryChat(thread);
    };

    const handleNewChat = () => {
        createNewChat({});
    };

    // Filter history based on search query
    const filteredHistory = historyList.filter((thread: HistoryThread) => {
        const query = searchQuery.toLowerCase();
        return (
            thread.thread_id.toLowerCase().includes(query) ||
            thread.title?.toLowerCase().includes(query) ||
            thread.metadata?.agent_id?.toLowerCase().includes(query)
        );
    });

    // Get status emoji
    const getStatusEmoji = (status?: string) => {
        switch (status) {
            case 'idle':
                return '🟢';
            case 'busy':
                return '🟡';
            case 'interrupted':
                return '🟠';
            case 'error':
                return '🔴';
            default:
                return '⚪';
        }
    };

    // Format date helper
    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffHours < 1) return '刚刚';
        if (diffHours < 24) return `${diffHours}小时前`;
        if (diffHours < 24 * 7) return `${Math.floor(diffHours / 24)}天前`;
        return date.toLocaleDateString('zh-CN');
    };

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
};

const ChatPanelContent: React.FC<{ modelName?: string }> = ({ modelName }) => {
    const chatStore = useChat();
    const {
        userInput,
        setUserInput,
        loading,
        renderMessages,
        inChatError,
        currentAgent,
        currentChatId,
        sendMessage,
        stopGeneration,
        createNewChat,
    } = chatStore;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [renderMessages]);

    // Initialize selected agent from currentAgent
    useEffect(() => {
        if (currentAgent && !selectedAgentId) {
            setSelectedAgentId(currentAgent);
        }
    }, [currentAgent]);

    const handleSubmit = async (inputValue: string) => {
        if (!inputValue.trim()) return;

        const content: Message[] = [
            {
                type: 'human',
                content: inputValue,
            },
        ];

        // Pass selected agent via extraParams
        await sendMessage(content, {
            extraParams: {
                agent_id: selectedAgentId,
            },
        });
        setUserInput('');
    };

    const handleNewChat = () => {
        const metadata: Record<string, any> = {};
        if (selectedAgentId) {
            metadata.agent_id = selectedAgentId;
        }
        createNewChat(metadata);
    };

    const handleStop = () => {
        stopGeneration();
    };

    const handleAgentChange = (agentId: string) => {
        setSelectedAgentId(agentId);
        // Create new chat with selected agent
        handleNewChat();
    };

    if (inChatError) {
        return (
            <div className="flex flex-col h-full bg-gray-800 p-8 items-center justify-center">
                <div className="bg-gray-700 border border-gray-600 rounded-lg p-6 max-w-md text-gray-100">
                    <h2 className="text-red-400 font-bold text-xl mb-2">连接错误</h2>
                    <p className="text-red-300 mb-4">{JSON.stringify(inChatError)}</p>
                    <p className="text-sm text-gray-400">请检查服务器是否正在运行（默认端口: 8124）</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full overflow-hidden bg-gray-800">
            {/* Left Sidebar - History */}
            <HistorySidebar />

            {/* Right Side - Chat Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="flex-shrink-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-white">💬 Chat</h1>
                        <AgentSelect value={selectedAgentId} onChange={handleAgentChange} disabled={loading} />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleNewChat}
                            className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
                        >
                            新对话
                        </button>
                        {loading && (
                            <button
                                onClick={handleStop}
                                className="px-3 py-1.5 text-sm bg-red-900 text-red-200 rounded hover:bg-red-800 transition-colors"
                            >
                                停止
                            </button>
                        )}
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {renderMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-gray-400">
                                <div className="text-4xl mb-4">👋</div>
                                <p className="text-lg">开始新的对话吧！</p>
                                <p className="text-sm mt-2">选择 Agent 并输入消息开始与 AI 交互</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            {renderMessages.map((message, index) => {
                                if (message.type === 'human') {
                                    return (
                                        <HumanMessage
                                            key={message.id || `human-${index}`}
                                            message={message}
                                            messageNumber={index + 1}
                                        />
                                    );
                                } else if (message.type === 'tool') {
                                    return (
                                        <ToolMessage
                                            key={message.id || `tool-${index}`}
                                            message={message}
                                            messageNumber={index + 1}
                                        />
                                    );
                                } else {
                                    return (
                                        <AIMessage
                                            key={message.id || `ai-${index}`}
                                            message={message}
                                            messageNumber={index + 1}
                                            modelName={modelName}
                                        />
                                    );
                                }
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input */}
                <ChatInput
                    value={userInput}
                    onChange={setUserInput}
                    onSubmit={handleSubmit}
                    loading={loading}
                    placeholder="输入消息与 AI 对话..."
                />
            </div>
        </div>
    );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
    apiUrl = 'http://127.0.0.1:8124/api/langgraph',
    defaultAgent = 'swarm',
    modelName = 'AI',
    onClose,
}) => {
    return (
        <ChatProvider
            apiUrl={apiUrl}
            defaultAgent={defaultAgent}
            defaultHeaders={{}}
            withCredentials={false}
            showHistory={false}
            showGraph={false}
            onInitError={(error, currentAgent) => {
                console.error('Chat init error:', error, currentAgent);
            }}
            autoRestoreLastSession={false}
        >
            <ChatPanelContent modelName={modelName} />
        </ChatProvider>
    );
};
