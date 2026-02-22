import React from 'react';
import { Box } from 'ink';
import { ChatProvider } from '@langgraph-js/sdk/react';
import { TanStackQueryProvider } from './QueryClientProvider';
import { ApprovalProvider } from '@codegraph/union-client';
import { LangGraphFetch } from '@codegraph/agent/src/export';
import { InteractionProvider } from './interaction/context';
import { SettingsProvider } from './context/SettingsContext';
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
                <ErrorBoundary name="ChatMain" fallback={<Text color="yellow">Chat view unavailable</Text>}>
                    {activeView === 'chat' ? <ChatMain /> : null}
                </ErrorBoundary>
                <ErrorBoundary name="PanelView" fallback={<Text color="yellow">Panel unavailable</Text>}>
                    {activeView !== 'chat' ? <LazyChatViewManager /> : null}
                </ErrorBoundary>
            </Box>
            <ErrorBoundary name="StatusBar" fallback={null}>
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
 * Wrapper with all required providers.
 * Top-level ErrorBoundary catches any errors from providers themselves.
 */
const ChatWrapper: React.FC = () => {
    return (
        <ErrorBoundary name="AppRoot">
            <ChatProvider
                apiUrl="http://127.0.0.1:8123"
                defaultAgent="code"
                defaultHeaders={{}}
                withCredentials={false}
                showHistory={false}
                showGraph={false}
                onInitError={(error, currentAgent) => {
                    console.error(error, currentAgent);
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
                <ErrorBoundary name="TanStackQueryProvider">
                    <TanStackQueryProvider>
                        <ErrorBoundary name="SettingsProvider">
                            <SettingsProvider get_allowed_models={get_allowed_models}>
                                <ErrorBoundary name="ApprovalProvider">
                                    <ApprovalProvider>
                                        <ErrorBoundary name="InteractionProvider">
                                            <InteractionProvider>
                                                <Chat />
                                            </InteractionProvider>
                                        </ErrorBoundary>
                                    </ApprovalProvider>
                                </ErrorBoundary>
                            </SettingsProvider>
                        </ErrorBoundary>
                    </TanStackQueryProvider>
                </ErrorBoundary>
            </ChatProvider>
        </ErrorBoundary>
    );
};

/**
 * Entry point - export default for app bootstrap
 */
const AppProviders: React.FC = () => <ChatWrapper />;

export default AppProviders;
