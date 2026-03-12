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

export interface ChatPanelContextValue {
    activeView: ChatView;
    isChatView: boolean;
    switchToHistory: () => void;
    switchToKnowledge: () => void;
    switchToSettings: () => void;
    switchToModelProvider: () => void;
    switchToAgent: () => void;
    switchToMcp: () => void;
    switchToProcess: () => void;
    switchToErrors: () => void;
    closePanel: () => void;
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
 * 稳定性保证由调用方（ChatController）负责：
 * - 所有回调函数在 ChatController 中通过 useChatPanels 的 useCallback 包裹
 * - value 对象本身在 ChatController 中通过 useMemo 包裹，仅在
 *   activeView / hasPendingInteractions 变化时重建
 * - Provider 本身无需再做额外 memoization
 */
export const ChatPanelProvider: React.FC<ChatPanelProviderProps> = ({ children, value }) => {
    return <ChatPanelContext.Provider value={value}>{children}</ChatPanelContext.Provider>;
};
