/**
 * ChatController Component
 *
 * Main controller component that orchestrates chat functionality.
 * Manages state and provides ChatPanelContext to children.
 *
 * Architecture:
 *   ChatController (state + context)
 *   └── ChatLayout (layout structure)
 *       ├── ChatMain (when activeView === 'chat')
 *       │   ├── ChatMessages
 *       │   └── ChatInput / UnifiedUIPanel
 *       ├── LazyChatViewManager (when activeView !== 'chat')
 *       └── StatusBar
 *
 * Follows Vercel best practices:
 * - Eliminate useEffect waterfalls (async-defer-await)
 * - Derived state in render (rerender-derived-state-no-effect)
 * - Move effect to event handler (rerender-move-effect-to-event)
 */

import React, { useMemo } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import { useSettings } from '../../context/SettingsContext';
import { useInteractionContext } from '../../interaction/context';
import { useInput } from 'ink-pro';
import { useToolInitialization } from '../../hooks/useToolInitialization';
import { useConfigValidation } from '../../hooks/useConfigValidation';
import { useAutoFocus } from '../../hooks/useAutoFocus';
import { useChatPanels } from '../../hooks/useChatPanels';
import { ChatPanelProvider, type ChatPanelContextValue } from '../../context/ChatPanelContext';
import DefaultTools from '../../tools/index';
import SetupWizard from '../setup/SetupWizard';
import ErrorBoundary from '../common/ErrorBoundary';

interface ChatControllerProps {
    children: React.ReactNode;
}

/**
 * Internal component that manages state and provides context
 */
const ChatControllerInternal: React.FC<ChatControllerProps> = ({ children }) => {
    const { extraParams, toggleCompactMode, config } = useSettings();
    const { setTools, loading } = useChat();
    const { hasPendingInteractions } = useInteractionContext();

    // Initialize tools once
    useToolInitialization({ tools: DefaultTools, setTools });

    // Validate config state (derived state in render)
    const { needsSetup, validation } = useConfigValidation({ config });

    // Auto-focus logic
    useAutoFocus({ shouldFocus: !loading });

    // Panel management
    const panelState = useChatPanels();
    const { isChatView } = panelState;

    // Global keyboard shortcuts
    useInput(
        (input, key) => {
            if (key.ctrl && input === 'o' && isChatView && !loading) {
                toggleCompactMode();
            } else if (key.ctrl && input === 'z' && globalThis.Bun) {
                import('v8').then((res) => {
                    res.writeHeapSnapshot('my-application.heapsnapshot');
                });
            }
        },
        { isActive: isChatView },
    );

    // Show setup wizard if config is invalid
    if (needsSetup && validation) {
        return (
            <ErrorBoundary name="SetupWizard" fallback={null}>
                <SetupWizard validation={validation} onComplete={panelState.closePanel} />
            </ErrorBoundary>
        );
    }

    // useMemo 包裹 context value，只在真正影响消费者的值变化时才重建对象。
    //
    // 为什么这里 useMemo 是有效的？
    // - panelState 中所有回调（switchToXxx / closePanel）均由 useChatPanels
    //   内的 useCallback 包裹，其引用在 activeView 不变时保持稳定。
    // - 因此只需将 activeView 和 hasPendingInteractions 列为依赖，
    //   就能精确控制 Context 更新频率，避免所有 useChatPanel() 消费者
    //   在无关渲染时重渲。
    const contextValue = useMemo<ChatPanelContextValue>(
        () => ({
            activeView: panelState.activeView,
            isChatView: panelState.isChatView,
            switchToHistory: panelState.switchToHistory,
            switchToKnowledge: panelState.switchToKnowledge,
            switchToSettings: panelState.switchToSettings,
            switchToModelProvider: panelState.switchToModelProvider,
            switchToAgent: panelState.switchToAgent,
            switchToMcp: panelState.switchToMcp,
            switchToProcess: panelState.switchToProcess,
            switchToErrors: panelState.switchToErrors,
            switchToCron: panelState.switchToCron,
            closePanel: panelState.closePanel,
            hasPendingInteractions,
        }),
        [
            panelState.activeView,
            panelState.isChatView,
            panelState.switchToHistory,
            panelState.switchToKnowledge,
            panelState.switchToSettings,
            panelState.switchToModelProvider,
            panelState.switchToAgent,
            panelState.switchToMcp,
            panelState.switchToProcess,
            panelState.switchToErrors,
            panelState.switchToCron,
            panelState.closePanel,
            hasPendingInteractions,
        ],
    );

    return (
        <ErrorBoundary name="ChatPanelContext" fallback={null}>
            <ChatPanelProvider value={contextValue}>{children}</ChatPanelProvider>
        </ErrorBoundary>
    );
};

/**
 * Main controller component for chat logic.
 * Wrap your chat UI with this component to get access to ChatPanelContext.
 */
export const ChatController: React.FC<ChatControllerProps> = ({ children }) => {
    return <ChatControllerInternal>{children}</ChatControllerInternal>;
};
