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

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
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
import { ChatInputBufferProvider } from '@codegraph/union-client';
import { useDebounceValue } from 'usehooks-ts';
import ErrorBoundary from '../common/ErrorBoundary';

/**
 * ChatMessages - displays the message list
 */
const ChatMessages: React.FC = () => {
    const { renderMessages, currentChatId, getToolUIRender, loading } = useChat();
    const { compactMode } = useSettings();

    // Debounce renderMessages updates to 500ms to reduce re-renders during fast updates
    const [debouncedRenderMessages] = useDebounceValue(renderMessages, 500);

    // Wrap getToolUIRender with useCallback to stabilize reference
    // Type assertion to handle SDK's Object vs ReactNode type mismatch
    const stableGetToolUIRender = useCallback(
        (toolName: string) => getToolUIRender(toolName) as ((msg: RenderMessage) => React.ReactNode) | null,
        [getToolUIRender],
    );

    return (
        <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
            {debouncedRenderMessages.length === 0 ? (
                <WelcomeHeader />
            ) : compactMode ? (
                <CompactMessagesBox
                    renderMessages={debouncedRenderMessages}
                    startIndex={0}
                    staticKey={currentChatId!}
                    getToolUIRender={stableGetToolUIRender}
                    loading={loading}
                    key={currentChatId}
                />
            ) : (
                <MessagesBox
                    loading={loading}
                    renderMessages={debouncedRenderMessages}
                    startIndex={0}
                    staticKey={currentChatId!}
                />
            )}
        </Box>
    );
};

/**
 * Main chat component with messages and input.
 * Uses Context to access panel actions - no props drilling.
 * Key sections wrapped with ErrorBoundary for isolation.
 */
export const ChatMain: React.FC = () => {
    const { hasPendingInteractions } = useInteractionContext();

    return (
        <Box flexDirection="column" flexGrow={1}>
            <ErrorBoundary name="ChatMessages" fallback={null}>
                <ChatMessages />
            </ErrorBoundary>
            <ChatInputBufferProvider>
                <ErrorBoundary name="InteractionArea" fallback={null}>
                    {hasPendingInteractions ? (
                        <Box paddingX={0} paddingY={0}>
                            <UnifiedUIPanel />
                        </Box>
                    ) : (
                        <ChatInput />
                    )}
                </ErrorBoundary>
            </ChatInputBufferProvider>
        </Box>
    );
};

ChatMain.displayName = 'ChatMain';
