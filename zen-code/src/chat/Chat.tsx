import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { ChatProvider } from '@langgraph-js/sdk/react';
import { TanStackQueryProvider } from './QueryClientProvider';
import { InteractionProvider } from './interaction/context';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { ZenCoreProvider } from './context/ZenCoreContext';
import { get_allowed_models } from '@codegraph/agent/src/utils/get_allowed_models';
import { ChatController } from './components/layout/ChatController';
import { ChatMain } from './components/layout/ChatMain';
import { LazyChatViewManager } from './components/layout/LazyChatViewManager';
import StatusBar from './components/status/StatusBar';
import { useChatPanel } from './context/ChatPanelContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import type { ZenCoreConnection } from '@codegraph/union-client';

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
const ChatProviderWrapper: React.FC<{ children: React.ReactNode; apiUrl: string }> = ({ children, apiUrl }) => {
    return (
        <ChatProvider
            apiUrl={apiUrl}
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
 *
 * ErrorBoundary 层级设计（3层，每层职责明确）：
 *
 * 1. AppRoot     — 兜底层，捕获所有未被下层处理的错误
 * 2. DataLayer   — 保护数据层 Provider（QueryClient + Settings + ChatProvider）
 *                  数据层出错时，整个应用降级为错误提示，无需细分
 * 3. UILayer     — 保护交互层（InteractionProvider + Chat）
 *                  与数据层隔离，UI 崩溃不会污染数据 Provider
 *
 * 已移除的冗余层：
 * - "TanStackQueryProvider" 单独的 EB 层（QueryClient 初始化几乎不会抛错）
 * - "ApprovalProvider" 空包裹层（该层内部没有额外逻辑，与 InteractionProvider 合并）
 */
const ChatWrapper: React.FC = () => {
    // 从全局获取 zen-core 连接（由 cli.ts 初始化）
    const zenCoreConnection: ZenCoreConnection | null = (globalThis as any).__zenCoreConnection || null;
    // 如果没有 zen-core 连接，使用旧的默认地址（向后兼容）
    const apiUrl = zenCoreConnection?.apiUrl || 'http://127.0.0.1:8125';

    return (
        <ErrorBoundary key="app-root" name="AppRoot">
            <TanStackQueryProvider>
                <ZenCoreProvider value={zenCoreConnection}>
                    <ErrorBoundary key="data-layer" name="DataLayer">
                        <SettingsProvider get_allowed_models={get_allowed_models}>
                            <ChatProviderWrapper apiUrl={apiUrl}>
                                <ErrorBoundary key="ui-layer" name="UILayer">
                                    <InteractionProvider>
                                        <Chat />
                                    </InteractionProvider>
                                </ErrorBoundary>
                            </ChatProviderWrapper>
                        </SettingsProvider>
                    </ErrorBoundary>
                </ZenCoreProvider>
            </TanStackQueryProvider>
        </ErrorBoundary>
    );
};

/**
 * Entry point - export default for app bootstrap
 */
const AppProviders: React.FC = () => <ChatWrapper />;

export default AppProviders;
