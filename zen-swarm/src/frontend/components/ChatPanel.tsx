/**
 * Chat Panel Component
 * 主聊天面板组件 - 基于 @langgraph-js/sdk
 * 左侧历史记录侧边栏 + 右侧聊天区域（深色主题）
 *
 * 优化点：
 * - 提取 HistorySidebar 为独立组件
 * - 优化自动滚动逻辑（规则：rerender-move-effect-to-event）
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatProvider, useChat } from '@langgraph-js/sdk/react';
import type { Message } from '@langgraph-js/sdk';
import { HumanMessage, AIMessage, ToolMessage } from './messages';
import { ChatInput } from './ChatInput';
import { AgentSelect } from './AgentSelect';
import { HistorySidebar } from './HistorySidebar.js';

interface ChatPanelProps {
    apiUrl?: string;
    defaultAgent?: string;
    modelName?: string;
    onClose?: () => void;
}

const ChatPanelContent: React.FC<{ modelName?: string; defaultAgent?: string }> = ({ modelName, defaultAgent }) => {
    const chatStore = useChat();
    const {
        userInput,
        setUserInput,
        loading,
        renderMessages,
        inChatError,
        currentAgent,
        sendMessage,
        stopGeneration,
        createNewChat,
    } = chatStore;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(defaultAgent);
    const [isUserNearBottom, setIsUserNearBottom] = useState(true);

    // 检测用户是否在底部
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setIsUserNearBottom(isNearBottom);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    // 只在用户在底部时自动滚动（规则：rerender-move-effect-to-event）
    useEffect(() => {
        if (isUserNearBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [renderMessages, isUserNearBottom]);

    // Initialize selected agent - auto-select first available if none selected
    useEffect(() => {
        // Don't override if user has already selected an agent
        if (selectedAgentId) return;

        if (currentAgent) {
            setSelectedAgentId(currentAgent);
        }
        // Note: Auto-selection will be handled in AgentSelect component
        // when agents list loads
    }, [currentAgent, selectedAgentId]);

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
                        {loading ? (
                            <button
                                onClick={handleStop}
                                className="px-3 py-1.5 text-sm bg-red-900 text-red-200 rounded hover:bg-red-800 transition-colors"
                            >
                                停止
                            </button>
                        ) : null}
                    </div>
                </header>

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-4">
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
            <ChatPanelContent modelName={modelName} defaultAgent={defaultAgent} />
        </ChatProvider>
    );
};
