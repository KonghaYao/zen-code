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

import React from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import { useSettings } from '../../context/SettingsContext';
import { useInteractionContext } from '../../interaction/context';
import { useInput } from 'ink-pro';
import { useToolInitialization } from '../../hooks/useToolInitialization';
import { useConfigValidation } from '../../hooks/useConfigValidation';
import { useBufferedMessageSender } from '../../hooks/useBufferedMessageSender';
import { useAutoFocus } from '../../hooks/useAutoFocus';
import { useChatPanels } from '../../hooks/useChatPanels';
import { useTaskExecutor } from '../../hooks/useTaskExecutor';
import { ChatPanelProvider, type ChatPanelContextValue } from '../../context/ChatPanelContext';
import DefaultTools from '../../tools/index';
import SetupWizard from '../setup/SetupWizard';

interface ChatControllerProps {
    children: React.ReactNode;
}

/**
 * Internal component that manages state and provides context
 */
const ChatControllerInternal: React.FC<ChatControllerProps> = ({ children }) => {
    const { extraParams, toggleCompactMode, config } = useSettings();
    const { setTools, loading, stopGeneration } = useChat();
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

    // Task execution handler
    const { handleExecuteTask } = useTaskExecutor({ closePanel: panelState.closePanel });

    // Global keyboard shortcuts
    useInput(
        (input, key) => {
            if (key.ctrl && input === 'c') {
                if (loading) {
                    stopGeneration();
                } else {
                    process.exit();
                }
            } else if (key.ctrl && input === 'o' && isChatView && !loading) {
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
        return <SetupWizard validation={validation} onComplete={panelState.closePanel} />;
    }

    // Build context value with stable references
    // Note: All callback functions in panelState are already useCallback-wrapped
    const contextValue: ChatPanelContextValue = {
        activeView: panelState.activeView,
        isChatView: panelState.isChatView,
        switchToHistory: panelState.switchToHistory,
        switchToKnowledge: panelState.switchToKnowledge,
        switchToSettings: panelState.switchToSettings,
        switchToModelProvider: panelState.switchToModelProvider,
        switchToAgent: panelState.switchToAgent,
        switchToTask: panelState.switchToTask,
        switchToMcp: panelState.switchToMcp,
        closePanel: panelState.closePanel,
        handleExecuteTask,
        hasPendingInteractions,
    };

    return <ChatPanelProvider value={contextValue}>{children}</ChatPanelProvider>;
};

/**
 * Main controller component for chat logic.
 * Wrap your chat UI with this component to get access to ChatPanelContext.
 */
export const ChatController: React.FC<ChatControllerProps> = ({ children }) => {
    return <ChatControllerInternal>{children}</ChatControllerInternal>;
};
