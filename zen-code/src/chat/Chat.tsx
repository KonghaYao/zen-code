import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useFocusManager } from 'ink';
import { MessagesBox } from './components/MessageBox';
import { CompactMessagesBox } from './components/CompactMessagesBox';
import HistoryPanel from './components/HistoryPanel';
import { ChatProvider, useChat } from '@langgraph-js/sdk/react';
import { Message } from '@langgraph-js/sdk';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { TanStackQueryProvider } from './QueryClientProvider';
import { ChatInputBufferProvider, useChatInputBuffer } from '@codegraph/union-client';
import { useCommandHandler } from './context/CommandHandler';
import { LangGraphFetch } from '@codegraph/agent/src/export';
import WelcomeHeader from './components/WelcomeHeader';
import DefaultTools from './tools/index';
import { ChatInputBuffer } from './components/input/ChatInputBuffer';
import { notify } from '../utils/notify';
import KnowledgePanel from './components/KnowledgePanel';
import SettingsPanel from './components/SettingsPanel';
import AgentPanel from './components/AgentPanel';
import StatusBar from './components/StatusBar';
import { useInput } from 'ink-pro';
import { ApprovalProvider } from '@codegraph/union-client';
import TaskPanel from './components/TaskPanel';
import { useSkills } from './hooks/useSkills';
import { useAgents } from './hooks/useAgents';

import { InteractionProvider, useInteractionContext, UnifiedUIPanel } from './interaction';
import { useRalphLoop } from './hooks/useRalphLoop';
import { get_allowed_models } from '@codegraph/agent/src/utils/get_allowed_models';
import { configStore } from './store';
import { TaskNode } from '@codegraph/config';
import { metadataOfChat } from '../utils/metadata';

interface ChatMessagesProps {}

const ChatMessages: React.FC<ChatMessagesProps> = () => {
    const { renderMessages } = useChat();
    const { compactMode } = useSettings();
    const visibleMessages = renderMessages;

    return (
        <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
            {visibleMessages.length === 0 && <WelcomeHeader />}
            {compactMode ? (
                <CompactMessagesBox renderMessages={visibleMessages} startIndex={0} />
            ) : (
                <MessagesBox renderMessages={visibleMessages} startIndex={0} />
            )}
        </Box>
    );
};

interface ChatInputProps {
    // MODIFIED: 添加面板切换回调 props
    switchToHistory?: () => void;
    switchToKnowledge?: () => void;
    switchToSettings?: () => void;
    switchToAgent?: () => void;
    switchToTask?: () => void;
    closePanel?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
    switchToHistory,
    switchToKnowledge,
    switchToSettings,
    switchToAgent,
    switchToTask,
    closePanel,
}) => {
    const { userInput, setUserInput, sendMessage, loading, renderMessages } = useChat();
    const { extraParams, manager } = useSettings();

    // Fetch skills for autocomplete
    const { data: skills = [] } = useSkills({ manager });

    // Fetch agents for autocomplete
    const { data: agents = [] } = useAgents();

    // 使用 Ralph Loop hook
    const { startRalphLoop, sendTextMessage } = useRalphLoop({
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
        switchToSettings,
        switchToAgent,
        switchToTask,
        closePanel,
        startRalphLoop,
    });

    const handleSendMessage = async (inputValue: string) => {
        if (!inputValue) return;
        // 命令优先处理：直接检查而不是依赖 executeCommand 内部检测
        if (inputValue.startsWith('/')) {
            // 直接执行命令，不依赖 userInput 状态
            // CommandHandler 内部会用 inputValue 而不是 userInput
            const commandHandled = await commandHandler.executeCommand(inputValue);
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
                commandHandler={{
                    isCommandInput: commandHandler.isCommandInput,
                    CommandHintUI: commandHandler.CommandHintUI,
                    commandSuggestions: commandHandler.commandSuggestions,
                }}
                skills={skills}
                agents={agents}
            />
        </Box>
    );
};

const Chat: React.FC = () => {
    const { extraParams, toggleCompactMode } = useSettings();
    const { setTools, createNewChat, loading, stopGeneration, currentChatId, sendMessage } = useChat();
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
    const [activeView, setActiveView] = useState<'chat' | 'history' | 'knowledge' | 'settings' | 'agent' | 'task'>(
        'chat',
    );

    // Global Ctrl+C exit handler and Ctrl+O expand handler
    // Disable when panel is open to avoid duplicate input handling
    useInput(
        (input, key) => {
            if (key.ctrl && input === 'c') {
                if (loading) {
                    stopGeneration();
                } else {
                    process.exit();
                }
            } else if (key.ctrl && input === 'o' && activeView === 'chat' && !loading) {
                toggleCompactMode();
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

    const switchToSettings = useCallback(() => {
        setActiveView('settings');
    }, []);

    const switchToAgent = useCallback(() => {
        setActiveView('agent');
    }, []);

    const switchToTask = useCallback(() => {
        setActiveView('task');
    }, []);

    const closePanel = useCallback(() => {
        console.clear();
        setActiveView('chat');
        focusManager.focus('global-input');
    }, [focusManager]);

    // NEW: 格式化任务为提示词
    const formatTaskToPrompt = (task: TaskNode): string => {
        let prompt = `# 任务：${task.title}\n\n`;
        prompt += `**描述：**\n${task.description}\n\n`;

        if (task.agentType) {
            prompt += `**建议 Agent 类型：** ${task.agentType}\n\n`;
        }

        if (task.estimatedTime) {
            prompt += `**预估时间：** ${task.estimatedTime}\n\n`;
        }

        if (task.complexity) {
            prompt += `**复杂度：** ${task.complexity}\n\n`;
        }

        if (task.dependencies && task.dependencies.length > 0) {
            prompt += `**依赖任务：**\n${task.dependencies.map((id) => `- ${id}`).join('\n')}\n\n`;
        }

        if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
            prompt += `**验收标准：**\n${task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n`;
        }

        if (task.children && task.children.length > 0) {
            prompt += `**子任务：**\n`;
            task.children.forEach((child, idx) => {
                prompt += `\n### 子任务 ${idx + 1}: ${child.title}\n`;
                prompt += `${child.description}\n`;
                if (child.acceptanceCriteria && child.acceptanceCriteria.length > 0) {
                    prompt += `验收标准：\n${child.acceptanceCriteria.map((c) => `- ${c}`).join('\n')}\n`;
                }
            });
            prompt += '\n';
        }

        return prompt.trim();
    };

    // NEW: 执行任务的回调
    const handleExecuteTask = useCallback(
        (task: TaskNode) => {
            // 格式化任务内容为提示词
            const taskPrompt = formatTaskToPrompt(task);

            // 发送消息给 agent
            const content: Message[] = [
                {
                    type: 'human',
                    content: `${taskPrompt}\n\n请你先写一个 TODO LIST 焦后开始这个任务，最后完成任务的时候，使用 commit_task`,
                },
            ];

            createNewChat(metadataOfChat).then(() => {
                sendMessage(content, {
                    extraParams: {
                        ...extraParams,
                        is_in_task: true,
                    },
                    metadata: metadataOfChat,
                }).then(() => {
                    notify('任务已发送给 Agent');
                });
            });

            // 关闭面板并返回聊天界面
            closePanel();
        },
        [sendMessage, extraParams, closePanel],
    );
    const { hasPendingInteractions } = useInteractionContext();

    return (
        <Box flexDirection="column" width="100%">
            <Box flexGrow={1} flexDirection="row">
                {activeView === 'chat' && (
                    <Box flexDirection="column" flexGrow={1}>
                        <ChatMessages key={currentChatId} />
                        {/* 优先使用新的统一交互面板 */}
                        {hasPendingInteractions ? (
                            <Box paddingX={0} paddingY={0}>
                                <UnifiedUIPanel />
                            </Box>
                        ) : (
                            <ChatInput
                                switchToHistory={switchToHistory}
                                switchToKnowledge={switchToKnowledge}
                                switchToSettings={switchToSettings}
                                switchToAgent={switchToAgent}
                                switchToTask={switchToTask}
                                closePanel={closePanel}
                            />
                        )}
                    </Box>
                )}
                {activeView === 'history' && <HistoryPanel onClose={closePanel} />}
                {activeView === 'knowledge' && <KnowledgePanel onClose={closePanel} />}
                {activeView === 'settings' && <SettingsPanel onClose={closePanel} />}
                {activeView === 'agent' && <AgentPanel onClose={closePanel} />}
                {activeView === 'task' && <TaskPanel onClose={closePanel} onExecuteTask={handleExecuteTask} />}
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
            historyFilter={{
                metadata: {
                    path: process.cwd(),
                },
            }}
        >
            <TanStackQueryProvider>
                <ChatInputBufferProvider>
                    <SettingsProvider get_allowed_models={get_allowed_models} manager={configStore}>
                        <ApprovalProvider>
                            <InteractionProvider>
                                <Chat />
                            </InteractionProvider>
                        </ApprovalProvider>
                    </SettingsProvider>
                </ChatInputBufferProvider>
            </TanStackQueryProvider>
        </ChatProvider>
    );
};

const AppProviders: React.FC = () => <ChatWrapper />;

export default AppProviders;
