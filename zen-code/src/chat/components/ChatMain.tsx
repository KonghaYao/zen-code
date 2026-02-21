/**
 * ChatMain Component
 *
 * Main chat interface with messages and input.
 * Uses ChatPanelContext to access panel actions.
 *
 * Note: This component only renders when activeView === 'chat'.
 * The parent (Chat.tsx) handles view switching and StatusBar.
 *
 * Follows Vercel best practices:
 * - Component memoization (rerender-memo)
 * - Context to avoid props drilling
 */

import React, { memo, useMemo, useCallback } from 'react';
import { Box } from 'ink';
import { MessagesBox } from './MessageBox';
import { CompactMessagesBox } from './CompactMessagesBox';
import WelcomeHeader from './WelcomeHeader';
import { useChat } from '@langgraph-js/sdk/react';
import { useSettings } from '../context/SettingsContext';
import { UnifiedUIPanel } from '../interaction/UnifiedUIPanel';
import { useInteractionContext } from '../interaction/context';
import { ChatInput } from './ChatInput';
import { RenderMessage } from '@langgraph-js/sdk';

// Memoize heavy components to prevent unnecessary re-renders
const MemoizedWelcomeHeader = memo(WelcomeHeader);
const MemoizedMessagesBox = memo(MessagesBox);
const MemoizedCompactMessagesBox = memo(CompactMessagesBox);
const MemoizedChatInput = memo(ChatInput);
const MemoizedUnifiedUIPanel = memo(UnifiedUIPanel);

/**
 * ChatMessages - displays the message list
 */
const ChatMessages: React.FC = () => {
    const { renderMessages, currentChatId, getToolUIRender } = useChat();
    const { compactMode } = useSettings();

    // Stable key for Static component re-mount
    const staticKey = useMemo(() => {
        return `${currentChatId}-${renderMessages.length}`;
    }, [currentChatId, renderMessages.length]);

    // Wrap getToolUIRender with useCallback to stabilize reference
    // Type assertion to handle SDK's Object vs ReactNode type mismatch
    const stableGetToolUIRender = useCallback(
        (toolName: string) => getToolUIRender(toolName) as ((msg: RenderMessage) => React.ReactNode) | null,
        [getToolUIRender],
    );

    return (
        <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
            {renderMessages.length === 0 && <MemoizedWelcomeHeader />}
            {compactMode ? (
                <MemoizedCompactMessagesBox
                    renderMessages={renderMessages}
                    startIndex={0}
                    staticKey={staticKey}
                    getToolUIRender={stableGetToolUIRender}
                />
            ) : (
                <MemoizedMessagesBox renderMessages={renderMessages} startIndex={0} staticKey={staticKey} />
            )}
        </Box>
    );
};

/**
 * Main chat component with messages and input.
 * Uses Context to access panel actions - no props drilling.
 */
export const ChatMain: React.FC = () => {
    const { currentChatId } = useChat();
    const { hasPendingInteractions } = useInteractionContext();

    return (
        <Box flexDirection="column" flexGrow={1}>
            <ChatMessages key={currentChatId} />
            {hasPendingInteractions ? (
                <Box paddingX={0} paddingY={0}>
                    <MemoizedUnifiedUIPanel />
                </Box>
            ) : (
                <MemoizedChatInput />
            )}
        </Box>
    );
};

ChatMain.displayName = 'ChatMain';
