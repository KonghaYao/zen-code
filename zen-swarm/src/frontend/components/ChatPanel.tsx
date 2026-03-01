/**
 * ChatPanel - Chat 面板组件（独立提取）
 *
 * 功能：
 * - 消息展示（Human、AI、Tool）
 * - 输入框
 * - Agent 选择器
 * - Stop 生成按钮
 * - 消息滚动与自动跟随
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import { HumanMessage, AIMessage, ToolMessage } from './index.js';
import { AgentSelect } from './AgentSelect.js';

// ========================================
// Types
// ========================================

interface ChatPanelProps {
    modelName?: string;
    onClose?: () => void;
    rootPath: string;
}

// ========================================
// Mini Input Component (简化版输入框)
// ========================================

interface MiniInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (value: string) => void;
    loading?: boolean;
    disabled?: boolean;
}

const MiniInput: React.FC<MiniInputProps> = ({ value, onChange, onSubmit, loading, disabled }) => {
    const isDisabled = disabled || loading;
    const isComposingRef = useRef(false);

    const handleSubmit = useCallback(() => {
        const trimmed = value.trim();
        if (trimmed && !isDisabled) {
            onSubmit(trimmed);
        }
    }, [value, isDisabled, onSubmit]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
                e.preventDefault();
                handleSubmit();
            }
        },
        [handleSubmit],
    );

    return (
        <div className="p-2 border-t border-border-subtle bg-bg-tertiary">
            <div className="flex gap-2">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => {
                        isComposingRef.current = true;
                    }}
                    onCompositionEnd={() => {
                        isComposingRef.current = false;
                    }}
                    placeholder={loading ? 'Thinking...' : 'Message...'}
                    disabled={isDisabled}
                    rows={1}
                    className="flex-1 px-2 py-1.5 text-xs bg-bg-primary border border-border-default rounded resize-none text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary disabled:bg-bg-tertiary disabled:cursor-not-allowed"
                />
                <button
                    onClick={handleSubmit}
                    disabled={isDisabled || !value.trim()}
                    className="px-2 py-1 text-xs font-medium bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Send
                </button>
            </div>
            <div className="mt-1 text-[10px] text-text-muted">Enter to send</div>
        </div>
    );
};

// ========================================
// ChatPanel Component
// ========================================

export const ChatPanel: React.FC<ChatPanelProps> = ({ modelName, onClose, rootPath }) => {
    const chatStore = useChat();
    const {
        userInput,
        setUserInput,
        loading,
        renderMessages,
        sendMessage,
        stopGeneration,
        createNewChat,
        currentAgent,
    } = chatStore;

    const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAgent || '');
    const [isUserNearBottom, setIsUserNearBottom] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

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

    // 只在用户在底部时自动滚动
    useEffect(() => {
        if (isUserNearBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [renderMessages, isUserNearBottom]);

    const handleSubmit = async (inputValue: string) => {
        if (!inputValue.trim()) return;

        await sendMessage([{ type: 'human', content: inputValue }], {
            extraParams: {
                agent_id: selectedAgentId,
                cwd: rootPath,
            },
            metadata: {
                path: rootPath,
            },
        });
        setUserInput('');
    };

    const handleStop = () => {
        stopGeneration();
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Header */}
            <header className="flex-shrink-0 bg-white border-b border-border-subtle px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="text-sm font-medium text-text-primary">Chat</h1>
                </div>
                <div className="flex items-center gap-2">
                    <AgentSelect
                        value={selectedAgentId}
                        onChange={(agentId) => {
                            setSelectedAgentId(agentId);
                        }}
                        disabled={loading}
                    />
                    {loading ? (
                        <button
                            onClick={handleStop}
                            className="px-3 py-1.5 text-xs font-medium bg-white border border-border-default text-text-primary rounded hover:bg-bg-tertiary transition-colors"
                        >
                            Stop
                        </button>
                    ) : null}
                </div>
            </header>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 bg-bg-primary">
                {renderMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <p className="text-lg font-medium text-text-primary mb-2">Start a conversation</p>
                            <p className="text-sm text-text-muted">Type your message below</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 max-w-3xl mx-auto">
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
            <MiniInput value={userInput} onChange={setUserInput} onSubmit={handleSubmit} loading={loading} />
        </div>
    );
};

// 导出别名，用于向后兼容
export const ChatPanelContent = ChatPanel;
