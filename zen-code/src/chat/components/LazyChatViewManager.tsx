/**
 * LazyChatViewManager Component
 *
 * Manages view switching with lazy-loaded panels.
 * Uses ChatPanelContext to access panel actions.
 *
 * Note: This component only renders when activeView !== 'chat'.
 *
 * Follows Vercel best practices:
 * - Dynamic imports for code splitting (bundle-dynamic-imports)
 * - Context to avoid props drilling
 */

import React, { Suspense, memo } from 'react';
import { Box, Text } from 'ink';
import {
    LazyHistoryPanel,
    LazyKnowledgePanel,
    LazySettingsPanel,
    LazyModelProviderPanel,
    LazyAgentPanel,
    LazyTaskPanel,
    LazyMcpPanel,
} from './lazyPanels';
import { useChatPanel } from '../context/ChatPanelContext';

// Fallback component for lazy loading
const LoadingFallback: React.FC = () => (
    <Box paddingX={1} paddingY={1}>
        <Text color="grey">Loading...</Text>
    </Box>
);

/**
 * Render appropriate panel based on active view (lazy-loaded).
 * Gets all actions from context - no props needed.
 */
export const LazyChatViewManager: React.FC = memo(() => {
    const { activeView, closePanel, handleExecuteTask } = useChatPanel();

    return (
        <Box flexGrow={1} flexDirection="row">
            {activeView === 'history' && (
                <Suspense fallback={<LoadingFallback />}>
                    <LazyHistoryPanel onClose={closePanel} />
                </Suspense>
            )}
            {activeView === 'knowledge' && (
                <Suspense fallback={<LoadingFallback />}>
                    <LazyKnowledgePanel onClose={closePanel} />
                </Suspense>
            )}
            {activeView === 'settings' && (
                <Suspense fallback={<LoadingFallback />}>
                    <LazySettingsPanel onClose={closePanel} />
                </Suspense>
            )}
            {activeView === 'model-provider' && (
                <Suspense fallback={<LoadingFallback />}>
                    <LazyModelProviderPanel onClose={closePanel} />
                </Suspense>
            )}
            {activeView === 'agent' && (
                <Suspense fallback={<LoadingFallback />}>
                    <LazyAgentPanel onClose={closePanel} />
                </Suspense>
            )}
            {activeView === 'task' && (
                <Suspense fallback={<LoadingFallback />}>
                    <LazyTaskPanel onClose={closePanel} onExecuteTask={handleExecuteTask} />
                </Suspense>
            )}
            {activeView === 'mcp' && (
                <Suspense fallback={<LoadingFallback />}>
                    <LazyMcpPanel onClose={closePanel} />
                </Suspense>
            )}
        </Box>
    );
});

LazyChatViewManager.displayName = 'LazyChatViewManager';
