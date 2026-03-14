/**
 * ChatPanel - Chat 面板组件（独立提取）
 *
 * 功能：
 * - 消息展示（Human、AI、Tool）
 * - 输入框
 * - Agent / Model 状态徽章（只读，点击打开 Config Drawer）
 * - ⚙️ 按钮展开/收起 Config Drawer
 * - Stop 生成按钮
 * - 消息滚动与自动跟随
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import { Bot, Brain, Settings, Square } from 'lucide-react';
import { IconButton } from './ui/IconButton.js';
import { HumanMessage, AIMessage, ToolMessage } from './index.js';
import type { ConfigDrawerSection } from './ConfigDrawer.js';

// ========================================
// Types
// ========================================

interface ChatPanelProps {
    modelName?: string;
    onClose?: () => void;
    rootPath: string;
    /** 当前选中的 Agent ID（由 ChatView 管理） */
    selectedAgentId?: string;
    /** 当前 Agent 名称（由 ChatView 传入） */
    currentAgentName?: string;
    /** 当前使用的 Model 名称（由 ChatView 管理） */
    currentModelName?: string;
    /** 打开 Config Drawer 并跳到指定分区 */
    onOpenConfig?: (section?: ConfigDrawerSection) => void;
    /** Config Drawer 是否处于打开状态（用于高亮 ⚙️ 按钮） */
    configDrawerOpen?: boolean;
    /** 移动端：打开历史记录抽屉（仅移动端传入） */
    onOpenMobileHistory?: () => void;
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
    /** Agent 徽章内容 */
    agentBadge?: React.ReactNode;
    /** Model 徽章内容 */
    modelBadge?: React.ReactNode;
    /** Config 按钮内容 */
    configButton?: React.ReactNode;
    /** Stop 按钮内容 */
    stopButton?: React.ReactNode;
}

const MiniInput: React.FC<MiniInputProps> = ({
    value,
    onChange,
    onSubmit,
    loading,
    disabled,
    agentBadge,
    modelBadge,
    configButton,
    stopButton,
}) => {
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
        <div className="border-t border-border-subtle bg-bg-tertiary">
            {/* 徽章行 */}
            {(agentBadge || modelBadge || configButton || stopButton) && (
                <div className="px-2 py-1.5 flex items-center gap-2 border-b border-border-subtle">
                    {agentBadge}
                    {modelBadge}
                    <div className="flex-1" />
                    {configButton}
                    {stopButton}
                </div>
            )}

            {/* 输入行 */}
            <div className="p-2">
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
        </div>
    );
};

// ========================================
// ChatPanel Component
// ========================================

export const ChatPanel: React.FC<ChatPanelProps> = ({
    modelName,
    onClose,
    rootPath,
    selectedAgentId,
    currentAgentName = '—',
    currentModelName,
    onOpenConfig,
    configDrawerOpen,
    onOpenMobileHistory,
}) => {
    const chatStore = useChat();
    const { userInput, setUserInput, loading, renderMessages, sendMessage, stopGeneration, inChatError } = chatStore;

    const activeAgentName = currentAgentName;
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
            <header className="flex-shrink-0 bg-white border-b border-border-subtle px-3 py-2.5">
                <h1 className="text-sm font-medium text-text-primary">Chat</h1>
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
                    <div className="max-w-3xl mx-auto space-y-4">
                        {renderMessages.map((message, index) => {
                            const prevType = index > 0 ? renderMessages[index - 1].type : null;
                            const isTool = message.type === 'tool';
                            // 连续工具消息之间不加额外间距（由 ToolMessage 自身的 mb-0.5 控制）
                            const toolGroupClass = isTool && prevType === 'tool' ? '-mt-3.5' : '';

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
                                    <div key={message.id || `tool-${index}`} className={toolGroupClass}>
                                        <ToolMessage message={message} messageNumber={index + 1} />
                                    </div>
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
                        {inChatError && <div>{JSON.stringify(inChatError)}</div>}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <MiniInput
                value={userInput}
                onChange={setUserInput}
                onSubmit={handleSubmit}
                loading={loading}
                agentBadge={
                    <button
                        onClick={() => onOpenConfig?.('agents')}
                        title="切换 Agent"
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-secondary hover:bg-bg-tertiary border border-border-subtle text-xs text-text-secondary transition-colors max-w-[120px]"
                    >
                        <Bot className="w-3 h-3" />
                        <span className="truncate">{activeAgentName}</span>
                    </button>
                }
                modelBadge={
                    currentModelName && (
                        <button
                            onClick={() => onOpenConfig?.('models')}
                            title="切换 Model"
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-secondary hover:bg-bg-tertiary border border-border-subtle text-xs text-text-secondary transition-colors max-w-[120px]"
                        >
                            <Brain className="w-3 h-3" />
                            <span className="truncate">{currentModelName}</span>
                        </button>
                    )
                }
                configButton={
                    <div className="flex items-center gap-1">
                        {/* 移动端历史记录按钮 */}
                        {onOpenMobileHistory && (
                            <IconButton onClick={onOpenMobileHistory} title="查看历史记录">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                    <path d="M3 3v5h5" />
                                    <path d="M12 7v5l4 2" />
                                </svg>
                            </IconButton>
                        )}
                        {/* 配置按钮 */}
                        <IconButton
                            onClick={() => onOpenConfig?.()}
                            title={configDrawerOpen ? '收起配置' : '展开配置'}
                            variant={configDrawerOpen ? 'primary' : 'default'}
                            className={configDrawerOpen ? '!bg-primary !text-white hover:!bg-primary' : ''}
                        >
                            <Settings className="w-4 h-4" />
                        </IconButton>
                    </div>
                }
                stopButton={
                    loading ? (
                        <button
                            onClick={handleStop}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-border-default text-text-primary rounded hover:bg-bg-tertiary transition-colors"
                        >
                            <Square className="w-3 h-3" />
                            Stop
                        </button>
                    ) : null
                }
            />
        </div>
    );
};
