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
} from '../common/lazyPanels';
import { useChatPanel } from '../../context/ChatPanelContext';
import ErrorBoundary from '../common/ErrorBoundary';

// Fallback component for lazy loading
const LoadingFallback: React.FC = () => (
    <Box paddingX={1} paddingY={1}>
        <Text color="grey">Loading...</Text>
    </Box>
);

// Panel-specific error fallbacks
const PanelErrorFallback = (panelName: string) => (
    <Box paddingX={1} paddingY={1}>
        <Text color="red">✗ {panelName} panel error</Text>
        <Box marginTop={1}>
            <Text color="gray">Try reopening or press ESC to return</Text>
        </Box>
    </Box>
);

/**
 * Render appropriate panel based on active view (lazy-loaded).
 * Gets all actions from context - no props needed.
 * Each panel wrapped with ErrorBoundary for isolation.
 */
export const LazyChatViewManager: React.FC = memo(() => {
    const { activeView, closePanel, handleExecuteTask } = useChatPanel();

    return (
        <Box flexGrow={1} flexDirection="row">
            {activeView === 'history' && (
                <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary name="HistoryPanel" fallback={PanelErrorFallback('History')}>
                        <LazyHistoryPanel onClose={closePanel} />
                    </ErrorBoundary>
                </Suspense>
            )}
            {activeView === 'knowledge' && (
                <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary name="KnowledgePanel" fallback={PanelErrorFallback('Knowledge')}>
                        <LazyKnowledgePanel onClose={closePanel} />
                    </ErrorBoundary>
                </Suspense>
            )}
            {activeView === 'settings' && (
                <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary name="SettingsPanel" fallback={PanelErrorFallback('Settings')}>
                        <LazySettingsPanel onClose={closePanel} />
                    </ErrorBoundary>
                </Suspense>
            )}
            {activeView === 'model-provider' && (
                <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary name="ModelProviderPanel" fallback={PanelErrorFallback('Model Provider')}>
                        <LazyModelProviderPanel onClose={closePanel} />
                    </ErrorBoundary>
                </Suspense>
            )}
            {activeView === 'agent' && (
                <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary name="AgentPanel" fallback={PanelErrorFallback('Agent')}>
                        <LazyAgentPanel onClose={closePanel} />
                    </ErrorBoundary>
                </Suspense>
            )}
            {activeView === 'task' && (
                <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary name="TaskPanel" fallback={PanelErrorFallback('Task')}>
                        <LazyTaskPanel onClose={closePanel} onExecuteTask={handleExecuteTask} />
                    </ErrorBoundary>
                </Suspense>
            )}
            {activeView === 'mcp' && (
                <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary name="McpPanel" fallback={PanelErrorFallback('MCP')}>
                        <LazyMcpPanel onClose={closePanel} />
                    </ErrorBoundary>
                </Suspense>
            )}
        </Box>
    );
});

LazyChatViewManager.displayName = 'LazyChatViewManager';
