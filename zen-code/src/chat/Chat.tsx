import React from 'react';
import { Box } from 'ink';
import { ChatProvider } from '@langgraph-js/sdk/react';
import { TanStackQueryProvider } from './QueryClientProvider';
import { ChatInputBufferProvider, ApprovalProvider } from '@codegraph/union-client';
import { LangGraphFetch } from '@codegraph/agent/src/export';
import { InteractionProvider } from './interaction/context';
import { SettingsProvider } from './context/SettingsContext';
import { get_allowed_models } from '@codegraph/agent/src/utils/get_allowed_models';
import { ChatController } from './components/layout/ChatController';
import { ChatMain } from './components/layout/ChatMain';
import { LazyChatViewManager } from './components/layout/LazyChatViewManager';
import StatusBar from './components/status/StatusBar';
import { useChatPanel } from './context/ChatPanelContext';

/**
 * ChatLayout - renders the main chat UI structure.
 * Uses ChatPanelContext to determine which view to show.
 */
const ChatLayout: React.FC = () => {
    const { activeView } = useChatPanel();

    return (
        <Box flexDirection="column" width="100%">
            <Box flexGrow={1} flexDirection="row">
                {activeView === 'chat' ? <ChatMain /> : <LazyChatViewManager />}
            </Box>
            <StatusBar />
        </Box>
    );
};

/**
 * Main Chat component.
 * Wraps ChatLayout with ChatController for state management.
 */
const Chat: React.FC = () => {
    return (
        <ChatController>
            <ChatLayout />
        </ChatController>
    );
};

/**
 * Wrapper with all required providers.
 */
const ChatWrapper: React.FC = () => {
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
            }}
            fetch={LangGraphFetch as any}
            autoRestoreLastSession
            /** @ts-ignore */
            historyFilter={{
                metadata: {
                    path: process.cwd(),
                },
            }}
            debounceTime={500}
        >
            <TanStackQueryProvider>
                <ChatInputBufferProvider>
                    <SettingsProvider get_allowed_models={get_allowed_models}>
                        <ApprovalProvider>
                            <InteractionProvider>
                                <Chat />
                            </InteractionProvider>
                        </ApprovalProvider>
                    </SettingsProvider>
                </ChatInputBufferProvider>
            </TanStackQueryProvider>
        </ChatProvider>
    );
};

/**
 * Entry point - export default for app bootstrap
 */
const AppProviders: React.FC = () => <ChatWrapper />;

export default AppProviders;
