/**
 * Chat Panel Component
 * 主聊天面板组件 - 基于 @langgraph-js/sdk
 * 左侧历史记录侧边栏 + 右侧聊天区域（深色主题）
 *
 * 优化点：
 * - 提取 HistorySidebar 为独立组件
 * - 优化自动滚动逻辑（规则：rerender-move-effect-to-event）
 * - 支持 macOS 风格红绿灯按钮
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatProvider, useChat } from '@langgraph-js/sdk/react';
import type { Message } from '@langgraph-js/sdk';
import { HumanMessage, AIMessage, ToolMessage } from './messages';
import { ChatInput } from './ChatInput';
import { AgentSelect } from './AgentSelect';
import { HistorySidebar } from './HistorySidebar.js';
import { TrafficLights } from './ui/TrafficLights.js';

interface ChatPanelProps {
    apiUrl?: string;
    defaultAgent?: string;
    modelName?: string;
    onClose?: () => void;
}

const ChatPanelContent: React.FC<{ modelName?: string; defaultAgent?: string; onClose?: () => void }> = ({
    modelName,
    defaultAgent,
    onClose,
}) => {
    const chatStore = useChat();
    const { userInput, setUserInput, loading, renderMessages, inChatError, currentAgent, sendMessage, stopGeneration } =
        chatStore;

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

    const handleStop = () => {
        stopGeneration();
    };

    const handleAgentChange = (agentId: string) => {
        setSelectedAgentId(agentId);
    };

    if (inChatError) {
        return (
            <div className="flex flex-col h-full bg-[var(--color-bg-primary)] p-8 items-center justify-center">
                <div className="bg-white border border-[var(--color-border-subtle)] rounded-xl p-8 max-w-md text-center shadow-sm">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--color-error-light)] flex items-center justify-center">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-[var(--color-text-primary)] font-semibold text-lg mb-3">Connection Error</h2>
                    <p className="text-[var(--color-text-secondary)] mb-4">{JSON.stringify(inChatError)}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Please check if the server is running (default port: 8124)
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full overflow-hidden bg-white">
            {/* Left Sidebar - History */}
            <HistorySidebar />

            {/* Right Side - Chat Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header with Traffic Lights */}
                <header className="flex-shrink-0 bg-white border-b border-[var(--color-border-subtle)] px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <TrafficLights onClose={onClose} />
                        <div className="w-px h-5 bg-[var(--color-border-subtle)]"></div>
                        <h1 className="text-lg font-medium text-[var(--color-text-primary)]">Chat</h1>
                        <div className="w-px h-5 bg-[var(--color-border-subtle)]"></div>
                        <AgentSelect value={selectedAgentId} onChange={handleAgentChange} disabled={loading} />
                    </div>
                    <div className="flex gap-2">
                        {loading ? (
                            <button
                                onClick={handleStop}
                                className="px-4 py-2 text-sm font-medium bg-white border border-[var(--color-border-default)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors duration-150"
                            >
                                Stop
                            </button>
                        ) : null}
                    </div>
                </header>

                {/* Messages */}
                <div
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto px-6 py-4 bg-[var(--color-bg-primary)]"
                >
                    {renderMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <p className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                                    Start a conversation
                                </p>
                                <p className="text-sm text-[var(--color-text-muted)]">
                                    Select an agent and type your message below
                                </p>
                                <div className="mt-8 flex justify-center gap-4">
                                    <div className="px-4 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
                                        <div className="text-xs text-[var(--color-primary)]">Enter</div>
                                        <div className="text-xs text-[var(--color-text-muted)]">to send</div>
                                    </div>
                                    <div className="px-4 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
                                        <div className="text-xs text-[var(--color-primary)]">Shift + Enter</div>
                                        <div className="text-xs text-[var(--color-text-muted)]">for new line</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-4xl mx-auto">
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
                    placeholder="Type your message..."
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
            autoRestoreLastSession
        >
            <ChatPanelContent modelName={modelName} defaultAgent={defaultAgent} onClose={onClose} />
        </ChatProvider>
    );
};
