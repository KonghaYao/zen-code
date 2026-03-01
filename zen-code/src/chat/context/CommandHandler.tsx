/**
 * 命令处理组件 - 负责命令的检测、建议和执行
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { useTimeout } from 'usehooks-ts';
import { commandRegistry } from '../commands';
import { CommandContext } from '../commands/types';
import { useChat } from '@langgraph-js/sdk/react';
import { useSettings } from './SettingsContext';
import { Message } from '@langgraph-js/sdk';
import { metadataOfChat } from '../../utils/metadata';

interface CommandHandlerProps {
    /** 额外参数 */
    extraParams?: any;
    /** 命令执行完成回调 */
    onCommandExecuted?: () => void;
    /** 切换到历史面板 */
    switchToHistory?: () => void;
    /** 切换到知识库面板 */
    switchToKnowledge?: () => void;
    /** 切换到 Settings 面板（通用设置） */
    switchToSettings?: () => void;
    /** 切换到 Model/Provider 配置面板 */
    switchToModelProvider?: () => void;
    /** 切换到 Agent 面板 */
    switchToAgent?: () => void;
    switchToTask?: () => void;
    switchToMcp?: () => void;
    switchToProcess?: () => void;
    /** 切换到错误日志面板 */
    switchToErrors?: () => void;
    /** 关闭面板返回聊天 */
    closePanel?: () => void;
    startRalphLoop: (text: string) => void;
}

interface CommandHandlerReturn {
    /** 是否为命令输入 */
    isCommandInput: boolean;
    /** 命令建议列表 */
    commandSuggestions: any[];
    /** 是否显示命令提示 */
    showCommandHint: boolean;
    /** 命令错误信息 */
    commandError: string | null;
    /** 执行命令函数 */
    executeCommand: (inputValue?: string) => Promise<boolean>;
    /** 命令提示UI组件 */
    CommandHintUI: React.FC;
    /** 命令错误UI组件 */
    CommandErrorUI: React.FC;
    /** 命令成功消息UI组件 */
    CommandSuccessUI: React.FC;
}

export const useCommandHandler = (props: CommandHandlerProps): CommandHandlerReturn => {
    const {
        onCommandExecuted,
        switchToHistory,
        switchToKnowledge,
        switchToSettings,
        switchToAgent,
        closePanel,
        switchToTask,
        switchToModelProvider,
        switchToMcp,
        switchToProcess,
        switchToErrors,
    } = props;

    // 从 useChat 获取所有需要的状态和函数
    const { userInput, setUserInput, sendMessage, currentAgent, client, createNewChat, renderMessages } = useChat();
    // 从 useSettings 获取配置更新函数
    const { extraParams, updateConfig, AVAILABLE_MODELS, compactMode } = useSettings();

    const [commandError, setCommandError] = useState<string | null>(null);
    const [commandSuccessMessage, setCommandSuccessMessage] = useState<string | null>(null);

    // 使用 usehooks-ts 的 useTimeout 替代原生 setTimeout，自动处理组件卸载清理
    useTimeout(
        () => {
            setCommandError(null);
        },
        commandError ? 3000 : null,
    );

    useTimeout(
        () => {
            setCommandSuccessMessage(null);
        },
        commandSuccessMessage ? 5000 : null,
    );

    // 检查是否为命令输入并获取建议
    const isCommandInput = userInput.startsWith('/');
    const commandSuggestions = isCommandInput ? commandRegistry.getSuggestions(userInput) : [];
    const showCommandHint = isCommandInput;

    const executeCommand = useCallback(
        async (inputValue?: string): Promise<boolean> => {
            // 使用传入的 inputValue 或回退到 userInput 状态
            const commandInput = inputValue || userInput;

            if (!commandRegistry.isCommand(commandInput)) {
                return false; // 不是命令，返回 false 让调用者继续处理
            }

            try {
                const commandContext: CommandContext = {
                    userInput: commandInput,
                    setUserInput,
                    sendMessage(messages, options = {}) {
                        return sendMessage(messages, {
                            extraParams: { ...extraParams, ...options.extraParams },
                            ...options,
                            metadata: metadataOfChat,
                        });
                    },
                    currentAgent,
                    client,
                    extraParams,
                    createNewChat() {
                        return createNewChat(metadataOfChat);
                    },
                    updateConfig,
                    AVAILABLE_MODELS,
                    renderMessages,
                    compactMode,
                    switchToHistory,
                    switchToKnowledge,
                    switchToSettings,
                    switchToModelProvider,
                    switchToAgent,
                    switchToTask,
                    switchToMcp,
                    switchToProcess,
                    switchToErrors,
                    closePanel,
                    startRalphLoop: props.startRalphLoop,
                };

                const result = await commandRegistry.executeCommand(commandInput, commandContext);

                if (!result.success) {
                    setCommandError(result.message || '命令执行失败');
                } else {
                    if (result.message) {
                        setCommandSuccessMessage(result.message);
                    }
                }

                if (result.shouldClearInput) {
                    setUserInput('');
                }

                // 如果命令要求发送消息，则发送
                if (result.shouldSendMessage && result.messageContent) {
                    const content: Message[] = [
                        {
                            type: 'human',
                            content: result.messageContent,
                        },
                    ];
                    sendMessage(content, { extraParams });
                }

                onCommandExecuted?.();
                return true; // 命令已处理
            } catch (error) {
                setCommandError(`命令执行错误: ${error instanceof Error ? error.message : String(error)}`);
                return true; // 即使出错也认为命令已处理
            }
        },
        [
            userInput,
            setUserInput,
            sendMessage,
            currentAgent,
            client,
            extraParams,
            createNewChat,
            onCommandExecuted,
            AVAILABLE_MODELS,
            compactMode,
            switchToHistory,
            switchToKnowledge,
            switchToSettings,
            switchToModelProvider,
            switchToAgent,
            switchToTask,
            switchToMcp,
            switchToProcess,
            switchToErrors,
            closePanel,
            props.startRalphLoop,
        ],
    );

    // 命令提示UI组件
    const CommandHintUI: React.FC = () => {
        if (!showCommandHint || commandSuggestions.length === 0) {
            return null;
        }

        return (
            <Box marginBottom={1} flexDirection="column">
                <Text color="yellow" bold>
                    命令建议:
                </Text>
                {commandSuggestions.slice(0, 5).map((suggestion, index: number) => (
                    <Text key={index} color="cyan">
                        {suggestion.displayText} - {suggestion.description}
                    </Text>
                ))}
                {commandSuggestions.length > 5 && (
                    <Text color="gray">...还有 {commandSuggestions.length - 5} 个命令</Text>
                )}
            </Box>
        );
    };

    // 命令错误UI组件
    const CommandErrorUI: React.FC = () => {
        if (!commandError) {
            return null;
        }

        return (
            <Box marginBottom={1}>
                <Text color="red">❌ {commandError}</Text>
            </Box>
        );
    };

    // 命令成功消息UI组件
    const CommandSuccessUI: React.FC = () => {
        if (!commandSuccessMessage) {
            return null;
        }

        return (
            <Box marginBottom={1}>
                <Text color="green">✅ {commandSuccessMessage}</Text>
            </Box>
        );
    };

    return {
        isCommandInput,
        commandSuggestions,
        showCommandHint,
        commandError,
        executeCommand,
        CommandHintUI,
        CommandErrorUI,
        CommandSuccessUI,
    };
};
