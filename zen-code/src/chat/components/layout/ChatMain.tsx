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
import { MessagesBox } from '../messages/MessageBox';
import { CompactMessagesBox } from '../messages/CompactMessagesBox';
import WelcomeHeader from '../common/WelcomeHeader';
import { useChat } from '@langgraph-js/sdk/react';
import { useSettings } from '../../context/SettingsContext';
import { UnifiedUIPanel } from '../../interaction/UnifiedUIPanel';
import { useInteractionContext } from '../../interaction/context';
import { ChatInput } from '../input/ChatInput';
import { RenderMessage } from '@langgraph-js/sdk';
import { useDebounceValue } from 'usehooks-ts';

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
    const { renderMessages, currentChatId, getToolUIRender, loading } = useChat();
    const { compactMode } = useSettings();

    // Debounce renderMessages updates to 500ms to reduce re-renders during fast updates
    const [debouncedRenderMessages] = useDebounceValue(renderMessages, 500);

    // Stable key for Static component re-mount
    const staticKey = useMemo(() => {
        return `${currentChatId}-${debouncedRenderMessages.length}`;
    }, [currentChatId, debouncedRenderMessages.length]);

    // Wrap getToolUIRender with useCallback to stabilize reference
    // Type assertion to handle SDK's Object vs ReactNode type mismatch
    const stableGetToolUIRender = useCallback(
        (toolName: string) => getToolUIRender(toolName) as ((msg: RenderMessage) => React.ReactNode) | null,
        [getToolUIRender],
    );

    return (
        <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
            {debouncedRenderMessages.length === 0 && <MemoizedWelcomeHeader />}
            {compactMode ? (
                <MemoizedCompactMessagesBox
                    renderMessages={debouncedRenderMessages}
                    startIndex={0}
                    staticKey={staticKey}
                    getToolUIRender={stableGetToolUIRender}
                    loading={loading}
                />
            ) : (
                <MemoizedMessagesBox renderMessages={debouncedRenderMessages} startIndex={0} staticKey={staticKey} />
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
