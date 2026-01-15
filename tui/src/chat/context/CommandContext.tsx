/**
 * CommandContext Provider - 提供命令系统所需的 UI 和 SDK 操作回调
 * 实现轻量级回调模式，避免命令直接依赖 React Hooks
 */

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { Box, Text } from 'ink';
import { useChat } from '@langgraph-js/sdk/react';
import { Message } from '@langgraph-js/sdk';
import { useSettings } from './SettingsContext';
import type { CommandContext } from '../commands/types';

const CommandContext = createContext<CommandContext | undefined>(undefined);

export interface CommandContextProviderProps {
    children: ReactNode;
    /** 面板切换回调（由 Chat 组件提供） */
    onSwitchPanel: (panel: 'chat' | 'history' | 'knowledge' | 'model') => void;
}

// 通知 UI 组件
const NotificationUI: React.FC<{ notification: { type: 'error' | 'success'; message: string } | null }> = ({ notification }) => {
    if (!notification) return null;

    return (
        <Box marginBottom={1}>
            <Text color={notification.type === 'error' ? 'red' : 'green'}>
                {notification.type === 'error' ? '❌ ' : '✅ '}
                {notification.message}
            </Text>
        </Box>
    );
};

export const CommandContextProvider: React.FC<CommandContextProviderProps> = ({ children, onSwitchPanel }) => {
    const { sendMessage: sdkSendMessage, createNewChat, setUserInput, userInput, currentAgent, renderMessages } = useChat();
    const { updateConfig, extraParams, AVAILABLE_MODELS } = useSettings();

    // UI 状态管理
    const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

    // UI 操作回调
    const switchPanel = useCallback((panel: 'chat' | 'history' | 'knowledge' | 'model') => {
        onSwitchPanel(panel);
    }, [onSwitchPanel]);

    const showNotification = useCallback((type: 'error' | 'success', message: string, duration = 3000) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), duration);
    }, []);

    // SDK 操作回调
    const sendMessage = useCallback(async (content: string | unknown[], params?: Record<string, unknown>) => {
        let messages: Message[];
        if (typeof content === 'string') {
            messages = [{ type: 'human', content }];
        } else {
            messages = content as Message[];
        }
        await sdkSendMessage(messages, { extraParams: { ...extraParams, ...params } });
    }, [sdkSendMessage, extraParams]);

    const createChat = useCallback(() => {
        createNewChat();
    }, [createNewChat]);

    const clearInput = useCallback(() => {
        setUserInput('');
    }, [setUserInput]);

    const contextValue: CommandContext = {
        // UI 操作
        switchPanel,
        showNotification,

        // SDK 操作
        sendMessage,
        createChat,
        updateConfig: async (config) => {
            await updateConfig(config);
        },
        clearInput,
        setUserInput,

        // 只读状态
        userInput,
        currentAgent,
        AVAILABLE_MODELS,
        extraParams,
        renderMessages,
    };

    return (
        <CommandContext.Provider value={contextValue}>
            <NotificationUI notification={notification} />
            {children}
        </CommandContext.Provider>
    );
};

export const useCommandContext = () => {
    const context = useContext(CommandContext);
    if (!context) {
        throw new Error('useCommandContext must be used within CommandContextProvider');
    }
    return context;
};
