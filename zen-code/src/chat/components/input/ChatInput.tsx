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

import React, { useCallback, memo, useState } from 'react';
import { Box } from 'ink';
import { useChat } from '@langgraph-js/sdk/react';
import { useSettings } from '../../context/SettingsContext';
import { useCommandHandler } from '../../context/CommandHandler';
import { useSkills } from '../../hooks/useSkills';
import { useAgents } from '../../hooks/useAgents';
import { useRalphLoop } from '../../hooks/useRalphLoop';
import { useChatPanel } from '../../context/ChatPanelContext';
import { useShellCommand } from '../../hooks/useShellCommand';
import { ChatInputBuffer } from './ChatInputBuffer';
import { ShellOutputPreview } from '../ShellOutputPreview';

import { notify } from '../../../utils/notify';
import { metadataOfChat } from '../../../utils';

/**
 * Chat input component with command handling and autocomplete.
 * Gets all panel actions from context instead of props.
 */
export const ChatInput: React.FC = memo(() => {
    const { userInput, setUserInput, loading, renderMessages, sendMessage } = useChat();
    const { extraParams, manager } = useSettings();

    // Shell command hook for executing ! commands
    const {
        executeCommand: executeShellCommand,
        activeCommand: shellCommand,
        clearOutput: clearShellOutput,
        isExecuting: isShellExecuting,
    } = useShellCommand();

    // Get panel actions from context (no props drilling)
    const {
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
    } = useChatPanel();

    // Fetch skills for autocomplete
    const { data: skills = [] } = useSkills({ manager });

    // Fetch agents for autocomplete
    const { data: agents = [] } = useAgents();

    // Use Ralph Loop hook
    const { startRalphLoop } = useRalphLoop({
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
        switchToProcess,
        switchToErrors,
        closePanel,
        startRalphLoop,
    });

    // Handle message submission
    const handleSendMessage = useCallback(
        async (inputValue: string) => {
            if (!inputValue) return;

            // Shell command处理 (! 前缀)
            if (inputValue.startsWith('!')) {
                const command = inputValue.slice(1).trim();
                if (command) {
                    await executeShellCommand(command);
                    setUserInput('');
                }
                return;
            }

            // Command优先处理
            if (inputValue.startsWith('/')) {
                const commandHandled = await commandHandler.executeCommand(inputValue);
                if (commandHandled) {
                    setUserInput('');
                    return;
                }
            }

            // 普通消息处理
            await sendMessage(
                [
                    {
                        type: 'human',
                        content: inputValue,
                    },
                ],
                { extraParams, metadata: metadataOfChat },
            );
            notify('Zen Code 完成任务');
        },
        [commandHandler, setUserInput, executeShellCommand, extraParams, sendMessage],
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
            {/* Shell 命令输出预览 */}
            {shellCommand && <ShellOutputPreview commandResult={shellCommand} onClose={clearShellOutput} />}

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
