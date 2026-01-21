import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useFocusManager } from 'ink';
import Spinner from 'ink-spinner';
import { MessagesBox } from './components/MessageBox';
import HistoryPanel from './components/HistoryPanel';
import { ChatProvider, useChat } from '@langgraph-js/sdk/react';
import { Message } from '@langgraph-js/sdk';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { ChatInputBufferProvider, useChatInputBuffer } from './context/ChatInputBufferContext';
import { useCommandHandler } from './context/CommandHandler';
import { LangGraphFetch } from '../../../agents/code/export';
import WelcomeHeader from './components/WelcomeHeader';
import DefaultTools from './tools/index';
import Shimmer from './components/Shimmer';
import { ChatInputBuffer } from './components/input/ChatInputBuffer';
import { notify } from '../utils/notify';
import KnowledgePanel from './components/KnowledgePanel';
import ModelPanel from './components/ModelPanel';
import AgentPanel from './components/AgentPanel';
import StatusBar from './components/StatusBar';
import { useInput } from '../utils/use-input';
import { ApprovalProvider, useApproval } from './context/ApprovalContext';
import { GlobalApprovalPanel } from './components/GlobalApprovalPanel';
import { ApprovalRequest, ApprovalStatus } from './components/GlobalApprovalPanel/types';
import { useRalphLoop } from './hooks/useRalphLoop';

const ChatMessages = () => {
    const { renderMessages, loading, inChatError, isFELocking } = useChat();
    const visibleMessages = renderMessages;

    return (
        <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
            {visibleMessages.length === 0 && <WelcomeHeader />}
            <MessagesBox renderMessages={visibleMessages} startIndex={0} />
            {loading && !isFELocking() && (
                <Box marginTop={1} paddingLeft={1}>
                    <Text>
                        <Spinner type="dots" /> <Shimmer text="正在思考中... Ctrl + C 中断"></Shimmer>
                    </Text>
                </Box>
            )}
            {inChatError && (
                <Box marginTop={0} paddingLeft={1}>
                    <Text color="red">❌ {JSON.stringify(inChatError)}</Text>
                </Box>
            )}
        </Box>
    );
};

interface ChatInputProps {
    // MODIFIED: 添加面板切换回调 props
    switchToHistory?: () => void;
    switchToKnowledge?: () => void;
    switchToModel?: () => void;
    switchToAgent?: () => void;
    closePanel?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
    switchToHistory,
    switchToKnowledge,
    switchToModel,
    switchToAgent,
    closePanel,
}) => {
    const { userInput, setUserInput, sendMessage, loading, renderMessages } = useChat();
    const { extraParams } = useSettings();

    // 使用 Ralph Loop hook
    const { ralphLoopText, startRalphLoop, sendTextMessage } = useRalphLoop({
        loading,
        renderMessages,
        sendMessage,
        setUserInput,
        extraParams,
    });

    // 使用命令处理组件，传递面板切换回调
    const commandHandler = useCommandHandler({
        extraParams,
        switchToHistory,
        switchToKnowledge,
        switchToModel,
        switchToAgent,
        closePanel,
        startRalphLoop,
    });

    const handleSendMessage = async (inputValue: string) => {
        if (!inputValue) return;

        // 命令优先处理：直接检查而不是依赖 executeCommand 内部检测
        if (inputValue.startsWith('/')) {
            // 先更新 userInput，让 CommandHandler 能读取到
            setUserInput(inputValue);

            // 等待状态更新后再执行命令
            await new Promise((resolve) => setTimeout(resolve, 0));

            const commandHandled = await commandHandler.executeCommand();
            if (commandHandled) {
                setUserInput(''); // 命令已处理，清空输入
                return;
            }
        }

        // 普通消息处理
        sendTextMessage(inputValue).then(() => {
            notify('Zen Code 完成任务');
        });
    };

    return (
        <Box
            flexDirection="column"
            paddingX={0}
            paddingY={0}
            borderColor="grey"
            borderTop
            borderStyle="single"
            borderLeft={false}
            borderBottom={false}
            borderRight={false}
        >
            {/* 命令错误显示 */}
            <commandHandler.CommandErrorUI />

            {/* 命令成功消息显示 */}
            <commandHandler.CommandSuccessUI />
            {/* <Text>{JSON.stringify(userInput)}</Text> */}
            {/* 使用 ChatInputBuffer 组件 */}
            <ChatInputBuffer
                value={userInput}
                onChange={setUserInput}
                onSubmit={handleSendMessage}
                loading={loading}
                placeholder="输入消息..."
                commandHandler={commandHandler}
            />
        </Box>
    );
};

const Chat: React.FC = () => {
    const { extraParams } = useSettings();
    const { setTools, loading, stopGeneration, currentChatId, sendMessage } = useChat();
    const { bufferedMessage, clearBuffer } = useChatInputBuffer();
    // 初始化工具
    useEffect(() => {
        console.clear();
        setTools(DefaultTools);
    }, []);

    // loading 结束时自动发送缓冲区消息
    useEffect(() => {
        if (!loading && bufferedMessage.trim()) {
            const content: Message[] = [
                {
                    type: 'human',
                    content: bufferedMessage,
                },
            ];
            sendMessage(content, {
                extraParams,
            }).then(() => {
                notify('Zen Code 完成任务');
            });
            clearBuffer(); // 发送后清空缓冲区
        }
    }, [loading, bufferedMessage, sendMessage, extraParams, clearBuffer]);

    // 自动聚焦输入框
    useEffect(() => {
        !loading && focusManager.focus('global-input');
    }, [loading]);

    const focusManager = useFocusManager();
    const [activeView, setActiveView] = useState<'chat' | 'history' | 'knowledge' | 'model' | 'agent'>('chat');
    // Global Ctrl+C exit handler
    // Disable when panel is open to avoid duplicate input handling
    useInput(
        (input, key) => {
            if (key.ctrl && input === 'c') {
                if (loading) {
                    stopGeneration();
                } else {
                    process.exit();
                }
            }
        },
        { isActive: activeView === 'chat' },
    );

    // 面板切换回调函数
    const switchToHistory = useCallback(() => {
        setActiveView('history');
    }, []);

    const switchToKnowledge = useCallback(() => {
        setActiveView('knowledge');
    }, []);

    const switchToModel = useCallback(() => {
        setActiveView('model');
    }, []);

    const switchToAgent = useCallback(() => {
        setActiveView('agent');
    }, []);

    const closePanel = useCallback(() => {
        console.clear();
        setActiveView('chat');
        focusManager.focus('global-input');
    }, [focusManager]);
    const { hasPendingRequests } = useApproval();

    return (
        <Box flexDirection="column" width="100%">
            <Box flexGrow={1} flexDirection="row">
                {activeView === 'chat' && (
                    <Box flexDirection="column" flexGrow={1}>
                        <ChatMessages key={currentChatId} />
                        {hasPendingRequests ? (
                            <Box borderStyle="single" borderColor="cyan" paddingX={0} paddingY={0}>
                                <GlobalApprovalPanel allowedDecisions={['approve', 'edit', 'reject']} autoShow={true} />
                            </Box>
                        ) : (
                            <ChatInput
                                switchToHistory={switchToHistory}
                                switchToKnowledge={switchToKnowledge}
                                switchToModel={switchToModel}
                                switchToAgent={switchToAgent}
                                closePanel={closePanel}
                            />
                        )}
                    </Box>
                )}
                {activeView === 'history' && <HistoryPanel onClose={closePanel} />}
                {activeView === 'knowledge' && <KnowledgePanel onClose={closePanel} />}
                {activeView === 'model' && <ModelPanel onClose={closePanel} />}
                {activeView === 'agent' && <AgentPanel onClose={closePanel} />}
            </Box>
            <StatusBar />
        </Box>
    );
};

const ChatWrapper: React.FC = () => {
    return (
        <ChatProvider
            apiUrl="http://127.0.0.1:8123"
            defaultAgent="code"
            defaultHeaders={{}}
            withCredentials={false}
            showHistory={false}
            showGraph={false}
            onInitError={(error, currentAgent) => {
                console.error(error, currentAgent);
            }}
            fetch={LangGraphFetch as any}
            autoRestoreLastSession
        >
            <ChatInputBufferProvider>
                <SettingsProvider>
                    <ApprovalProvider>
                        <Chat />
                    </ApprovalProvider>
                </SettingsProvider>
            </ChatInputBufferProvider>
        </ChatProvider>
    );
};

const AppProviders: React.FC = () => <ChatWrapper />;

export default AppProviders;
