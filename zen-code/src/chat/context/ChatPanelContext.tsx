/**
 * ChatPanelContext
 *
 * Manages panel state and actions for chat interface.
 * Eliminates props drilling for panel management.
 *
 * Follows Vercel best practices:
 * - Context for shared state (avoid props drilling)
 * - Stable callbacks from parent (useCallback in controller)
 */

import { createContext, useContext, ReactNode } from 'react';
import type { ChatView } from '../hooks/useChatPanels';
import type { TaskNode } from '@codegraph/config';

export interface ChatPanelContextValue {
    activeView: ChatView;
    isChatView: boolean;
    switchToHistory: () => void;
    switchToKnowledge: () => void;
    switchToSettings: () => void;
    switchToModelProvider: () => void;
    switchToAgent: () => void;
    switchToTask: () => void;
    switchToMcp: () => void;
    switchToProcess: () => void;
    switchToErrors: () => void;
    closePanel: () => void;
    handleExecuteTask: (task: TaskNode) => void;
    hasPendingInteractions: boolean;
}

const ChatPanelContext = createContext<ChatPanelContextValue | undefined>(undefined);

export const useChatPanel = () => {
    const context = useContext(ChatPanelContext);
    if (context === undefined) {
        throw new Error(
            'useChatPanel must be used within ChatPanelProvider. ' +
                'Make sure your component is a child of ChatController.',
        );
    }
    return context;
};

interface ChatPanelProviderProps {
    children: ReactNode;
    value: ChatPanelContextValue;
}

/**
 * Provider for chat panel state.
 *
 * Note: Parent (ChatController) is responsible for providing stable value
 * by using useCallback for all function references.
 */
export const ChatPanelProvider: React.FC<ChatPanelProviderProps> = ({ children, value }) => {
    // No useMemo here - parent should provide stable references via useCallback
    // Adding useMemo with value.xxx dependencies is ineffective because
    // value object itself changes on every parent render
    return <ChatPanelContext.Provider value={value}>{children}</ChatPanelContext.Provider>;
};
