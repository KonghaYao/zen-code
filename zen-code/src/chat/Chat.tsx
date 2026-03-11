import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { ChatProvider } from '@langgraph-js/sdk/react';
import { TanStackQueryProvider } from './QueryClientProvider';
import { LangGraphFetch } from '@codegraph/agent/src/export';
import { InteractionProvider } from './interaction/context';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { get_allowed_models } from '@codegraph/agent/src/utils/get_allowed_models';
import { ChatController } from './components/layout/ChatController';
import { ChatMain } from './components/layout/ChatMain';
import { LazyChatViewManager } from './components/layout/LazyChatViewManager';
import StatusBar from './components/status/StatusBar';
import { useChatPanel } from './context/ChatPanelContext';
import ErrorBoundary from './components/common/ErrorBoundary';

/**
 * ChatLayout - renders the main chat UI structure.
 * Uses ChatPanelContext to determine which view to show.
 * Each major section wrapped with ErrorBoundary for error isolation.
 */
const ChatLayout: React.FC = () => {
    const { activeView } = useChatPanel();

    return (
        <Box flexDirection="column" width="100%">
            <Box flexGrow={1} flexDirection="row">
                <ErrorBoundary
                    key="chat-main-view"
                    name="ChatMain"
                    fallback={<Text color="yellow">Chat view unavailable</Text>}
                >
                    {activeView === 'chat' ? <ChatMain /> : null}
                </ErrorBoundary>
                <ErrorBoundary
                    key="panel-view"
                    name="PanelView"
                    fallback={<Text color="yellow">Panel unavailable</Text>}
                >
                    {activeView !== 'chat' ? <LazyChatViewManager /> : null}
                </ErrorBoundary>
            </Box>
            <ErrorBoundary key="status-bar" name="StatusBar" fallback={null}>
                <StatusBar />
            </ErrorBoundary>
        </Box>
    );
};

/**
 * Main Chat component.
 * Wraps ChatLayout with ChatController for state management.
 * ErrorBoundary here catches errors from ChatController.
 */
const Chat: React.FC = () => {
    return (
        <ErrorBoundary name="Chat">
            <ChatController>
                <ChatLayout />
            </ChatController>
        </ErrorBoundary>
    );
};

/**
 * Internal component that wraps ChatProvider with SettingsProvider
 * This allows us to access settings for defaultHeaders configuration
 */
const ChatProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <ChatProvider
            apiUrl="http://127.0.0.1:8123"
            defaultAgent="code"
            defaultHeaders={{}}
            withCredentials={false}
            showHistory={false}
            showGraph={false}
            onInitError={(error, currentAgent) => {
                console.error(error, currentAgent);
                // 记录初始化错误到错误日志
                import('./services/ErrorInterceptor')
                    .then(({ logAgentError }) => {
                        logAgentError('ChatProvider', error as Error);
                    })
                    .catch(() => {
                        // 忽略错误
                    });
            }}
            fetch={LangGraphFetch as any}
            autoRestoreLastSession
            /** @ts-ignore */
            historyFilter={{
                metadata: {
                    path: process.cwd(),
                },
            }}
        >
            {children}
        </ChatProvider>
    );
};

/**
 * Wrapper with all required providers.
 * Top-level ErrorBoundary catches any errors from providers themselves.
 */
const ChatWrapper: React.FC = () => {
    return (
        <ErrorBoundary key="app-root" name="AppRoot">
            <ErrorBoundary key="tanstack-query-provider" name="TanStackQueryProvider">
                <TanStackQueryProvider>
                    <ErrorBoundary key="settings-provider" name="SettingsProvider">
                        <SettingsProvider get_allowed_models={get_allowed_models}>
                            <ChatProviderWrapper>
                                <ErrorBoundary key="approval-provider" name="ApprovalProvider">
                                    <ErrorBoundary key="interaction-provider" name="InteractionProvider">
                                        <InteractionProvider>
                                            <Chat />
                                        </InteractionProvider>
                                    </ErrorBoundary>
                                </ErrorBoundary>
                            </ChatProviderWrapper>
                        </SettingsProvider>
                    </ErrorBoundary>
                </TanStackQueryProvider>
            </ErrorBoundary>
        </ErrorBoundary>
    );
};

/**
 * Entry point - export default for app bootstrap
 */
const AppProviders: React.FC = () => <ChatWrapper />;

export default AppProviders;
