/**
 * ChatInput Component
 *
 * Chat input with command handling and autocomplete.
 * Uses ChatPanelContext to access panel actions - no props drilling.
 *
 * Follows Vercel best practices:
 * - Component memoization (rerender-memo)
 * - Context for shared actions
 */

import React, { useCallback, memo } from 'react';
import { Box } from 'ink';
import { useChat } from '@langgraph-js/sdk/react';
import { useSettings } from '../../context/SettingsContext';
import { useCommandHandler } from '../../context/CommandHandler';
import { useSkills } from '../../hooks/useSkills';
import { useAgents } from '../../hooks/useAgents';
import { useRalphLoop } from '../../hooks/useRalphLoop';
import { useChatPanel } from '../../context/ChatPanelContext';
import { ChatInputBuffer } from './ChatInputBuffer';

import { notify } from '../../../utils/notify';

/**
 * Chat input component with command handling and autocomplete.
 * Gets all panel actions from context instead of props.
 */
export const ChatInput: React.FC = memo(() => {
    const { userInput, setUserInput, loading, renderMessages, sendMessage } = useChat();
    const { extraParams, manager } = useSettings();

    // Get panel actions from context (no props drilling)
    const {
        switchToHistory,
        switchToKnowledge,
        switchToSettings,
        switchToModelProvider,
        switchToAgent,
        switchToTask,
        switchToMcp,
        closePanel,
    } = useChatPanel();

    // Fetch skills for autocomplete
    const { data: skills = [] } = useSkills({ manager });

    // Fetch agents for autocomplete
    const { data: agents = [] } = useAgents();

    // Use Ralph Loop hook
    const { startRalphLoop, sendTextMessage } = useRalphLoop({
        loading,
        renderMessages,
        sendMessage,
        setUserInput,
        extraParams,
    });

    // Use command handler component
    const commandHandler = useCommandHandler({
        extraParams,
        switchToHistory,
        switchToKnowledge,
        switchToSettings,
        switchToModelProvider,
        switchToAgent,
        switchToTask,
        switchToMcp,
        closePanel,
        startRalphLoop,
    });

    // Handle message submission
    const handleSendMessage = useCallback(
        async (inputValue: string) => {
            if (!inputValue) return;

            // Command优先处理
            if (inputValue.startsWith('/')) {
                const commandHandled = await commandHandler.executeCommand(inputValue);
                if (commandHandled) {
                    setUserInput('');
                    return;
                }
            }

            // 普通消息处理
            await sendTextMessage(inputValue);
            notify('Zen Code 完成任务');
        },
        [commandHandler, setUserInput, sendTextMessage],
    );

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
});

ChatInput.displayName = 'ChatInput';
