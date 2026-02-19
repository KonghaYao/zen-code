/**
 * Chat Panel Component
 * 主聊天面板组件 - 基于 @langgraph-js/sdk
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatProvider, useChat } from '@langgraph-js/sdk/react';
import type { Message } from '@langgraph-js/sdk';
import { HumanMessage, AIMessage, ToolMessage } from './messages';
import { ChatInput } from './ChatInput';
import { AgentSelect } from './AgentSelect';

interface ChatPanelProps {
    apiUrl?: string;
    defaultAgent?: string;
    modelName?: string;
    onClose?: () => void;
}

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
            <div className="flex flex-col h-screen bg-gray-50 p-8 items-center justify-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                    <h2 className="text-red-700 font-bold text-xl mb-2">连接错误</h2>
                    <p className="text-red-600 mb-4">{JSON.stringify(inChatError)}</p>
                    <p className="text-sm text-gray-600">请检查服务器是否正在运行（默认端口: 8124）</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-800">💬 Chat</h1>
                    <AgentSelect value={selectedAgentId} onChange={handleAgentChange} disabled={loading} />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleNewChat}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                        新对话
                    </button>
                    {loading && (
                        <button
                            onClick={handleStop}
                            className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
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
                        <div className="text-center text-gray-500">
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
