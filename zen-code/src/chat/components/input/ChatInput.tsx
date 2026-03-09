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
import fs from 'node:fs/promises';
import path from 'node:path';
import { Box } from 'ink';
import { useChat } from '@langgraph-js/sdk/react';
import { useSettings } from '../../context/SettingsContext';
import { useCommandHandler } from '../../context/CommandHandler';
import { useSkills } from '../../hooks/useSkills';
import { useAgents } from '../../hooks/useAgents';
import { useRalphLoop } from '../../hooks/useRalphLoop';
import { useChatPanel } from '../../context/ChatPanelContext';
import { useShellCommand } from '../../hooks/useShellCommand';
import { ChatInputBuffer, type AttachedImage } from './ChatInputBuffer';
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
        switchToMcp,
        switchToProcess,
        switchToErrors,
        closePanel,
        startRalphLoop,
    });

    // Handle message submission
    const handleSendMessage = useCallback(
        async (inputValue: string, attachedImages?: AttachedImage[]) => {
            if (!inputValue && (!attachedImages || attachedImages.length === 0)) return;

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

            // 构建消息内容：支持多模态（图片 + 文字）
            const hasImages = attachedImages && attachedImages.length > 0;
            let messageContent: any = inputValue;
            if (hasImages) {
                const imageBlocks = await Promise.all(
                    attachedImages!.map(async (img) => {
                        const buf = await fs.readFile(img.filePath);
                        const base64 = buf.toString('base64');
                        const ext = path.extname(img.fileName).slice(1).toLowerCase() || 'jpeg';
                        const mimeMap: Record<string, string> = {
                            png: 'image/png',
                            jpg: 'image/jpeg',
                            jpeg: 'image/jpeg',
                            gif: 'image/gif',
                            webp: 'image/webp',
                        };
                        return {
                            type: 'image' as const,
                            source_type: 'base64',
                            data: base64,
                            mime_type: mimeMap[ext] ?? 'image/jpeg',
                            // sb langchain 文档是错的, 需要使用 mineType
                            mimeType: mimeMap[ext] ?? 'image/jpeg',
                        };
                    }),
                );
                messageContent = [...imageBlocks, ...(inputValue ? [{ type: 'text' as const, text: inputValue }] : [])];
            }

            await sendMessage(
                [
                    {
                        type: 'human',
                        content: messageContent,
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
