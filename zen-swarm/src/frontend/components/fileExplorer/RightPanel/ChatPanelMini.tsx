/**
 * ChatPanelMini - 简化版 Chat 面板
 * 适用于 FileExplorer 右侧面板
 *
 * 特点：
 * - 压缩的头部设计
 * - 复用现有的消息组件
 * - 底部历史记录按钮展开抽屉
 * - 默认宽度 280px 适配
 *
 * 优化点（Vercel React Best Practices）：
 * - rerender-move-effect-to-event: 自动滚动逻辑仅在用户在底部时触发
 * - rerender-memo: 提取消息渲染为独立组件
 * - js-early-exit: 提前返回优化
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChatProvider, useChat } from '@langgraph-js/sdk/react';
import type { Message, RenderMessage } from '@langgraph-js/sdk';
import { HumanMessage, AIMessage, ToolMessage } from '../../messages';
import { ChatHeader } from './ChatHeader.js';
import { ChatHistoryButton } from './ChatHistoryButton.js';
import { ChatHistoryDrawer } from './ChatHistoryDrawer.js';

// ========================================
// Types
// ========================================

interface ChatPanelMiniProps {
    apiUrl?: string;
    defaultAgent?: string;
    modelName?: string;
    cwd?: string; // 当前工作目录路径
}

interface ChatPanelMiniContentProps {
    modelName?: string;
    defaultAgent?: string;
    cwd?: string; // 当前工作目录路径
}

// ========================================
// Constants
// ========================================

const DEFAULT_API_URL = 'http://127.0.0.1:8124/api/langgraph';
const DEFAULT_AGENT = 'swarm';

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
        <div className="p-2 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]">
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
                    className="flex-1 px-2 py-1.5 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border-default)] rounded resize-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] disabled:bg-[var(--color-bg-tertiary)] disabled:cursor-not-allowed"
                />
                <button
                    onClick={handleSubmit}
                    disabled={isDisabled || !value.trim()}
                    className="px-2 py-1 text-xs font-medium bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Send
                </button>
            </div>
            <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">Enter to send</div>
        </div>
    );
};

// ========================================
// Message Item Component (优化渲染)
// ========================================

interface MessageItemProps {
    message: RenderMessage;
    index: number;
    modelName?: string;
}

const MessageItem: React.FC<MessageItemProps> = React.memo(({ message, index, modelName }) => {
    if (message.type === 'human') {
        return <HumanMessage key={message.id || `human-${index}`} message={message} messageNumber={index + 1} />;
    }
    if (message.type === 'tool') {
        return <ToolMessage key={message.id || `tool-${index}`} message={message} messageNumber={index + 1} />;
    }
    return (
        <AIMessage
            key={message.id || `ai-${index}`}
            message={message}
            messageNumber={index + 1}
            modelName={modelName}
        />
    );
});

MessageItem.displayName = 'MessageItem';

// ========================================
// Main Content Component
// ========================================

const ChatPanelMiniContent: React.FC<ChatPanelMiniContentProps> = ({ modelName, defaultAgent, cwd }) => {
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
    const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

    // 检测用户是否在底部（规则：rerender-move-effect-to-event）
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
            setIsUserNearBottom(isNearBottom);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    // 只在用户在底部时自动滚动
    useEffect(() => {
        if (isUserNearBottom && renderMessages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [renderMessages, isUserNearBottom]);

    // 初始化 Agent
    useEffect(() => {
        if (selectedAgentId) return;
        if (currentAgent) {
            setSelectedAgentId(currentAgent);
        }
    }, [currentAgent, selectedAgentId]);

    // 发送消息
    const handleSubmit = useCallback(
        async (inputValue: string) => {
            if (!inputValue.trim()) return;

            const content: Message[] = [
                {
                    type: 'human',
                    content: inputValue,
                },
            ];

            await sendMessage(content, {
                extraParams: {
                    agent_id: selectedAgentId,
                    cwd,
                },
            });
            setUserInput('');
        },
        [sendMessage, selectedAgentId, cwd, setUserInput],
    );

    // Agent 切换
    const handleAgentChange = useCallback(
        (agentId: string) => {
            setSelectedAgentId(agentId);
            createNewChat({
                agent_id: agentId,
            });
        },
        [createNewChat],
    );

    // 停止生成
    const handleStop = useCallback(() => {
        stopGeneration();
    }, [stopGeneration]);

    // 切换历史抽屉
    const toggleHistoryDrawer = useCallback(() => {
        setHistoryDrawerOpen((prev) => !prev);
    }, []);

    // 错误状态
    if (inChatError) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[var(--color-error-light)] flex items-center justify-center">
                    <span className="text-xl">⚠️</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-2">Connection Error</p>
                <p className="text-xs text-[var(--color-text-muted)]">Check server (port: 8124)</p>
            </div>
        );
    }

    // 消息列表（使用 useMemo 优化）
    const messageList = useMemo(
        () =>
            renderMessages.map((message, index) => (
                <MessageItem key={message.id || `msg-${index}`} message={message} index={index} modelName={modelName} />
            )),
        [renderMessages, modelName],
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <ChatHeader
                selectedAgentId={selectedAgentId}
                onAgentChange={handleAgentChange}
                loading={loading}
                onStop={handleStop}
            />

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2">
                {renderMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center p-4">
                        <div>
                            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                                Start a conversation
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">Select agent & type message</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">{messageList}</div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <MiniInput value={userInput} onChange={setUserInput} onSubmit={handleSubmit} loading={loading} />

            {/* History Button */}
            <ChatHistoryButton onClick={toggleHistoryDrawer} isOpen={historyDrawerOpen} />

            {/* History Drawer */}
            <ChatHistoryDrawer isOpen={historyDrawerOpen} onClose={() => setHistoryDrawerOpen(false)} />
        </div>
    );
};

// ========================================
// Main Component with Provider
// ========================================

export const ChatPanelMini: React.FC<ChatPanelMiniProps> = ({
    apiUrl = DEFAULT_API_URL,
    defaultAgent = DEFAULT_AGENT,
    modelName = 'AI',
    cwd,
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
                console.error('ChatPanelMini init error:', error, currentAgent);
            }}
            autoRestoreLastSession={false}
        >
            <ChatPanelMiniContent modelName={modelName} defaultAgent={defaultAgent} cwd={cwd} />
        </ChatProvider>
    );
};

export default ChatPanelMini;
