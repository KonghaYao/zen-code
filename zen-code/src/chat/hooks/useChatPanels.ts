/**
 * useChatPanels Hook
 *
 * Manages active view state and panel switching callbacks.
 * Provides unified panel management with derived state.
 *
 * Follows Vercel best practices:
 * - Derived state during render (rerender-derived-state-no-effect)
 * - Stable callbacks with useCallback
 * - Primitive dependencies for effects (rerender-dependencies)
 */

import { useState, useCallback } from 'react';
import { useFocusManager } from 'ink';

export type ChatView = 'chat' | 'history' | 'knowledge' | 'settings' | 'model-provider' | 'agent' | 'task' | 'mcp';

interface UseChatPanelsResult {
    activeView: ChatView;
    isChatView: boolean;
    switchToHistory: () => void;
    switchToKnowledge: () => void;
    switchToSettings: () => void;
    switchToModelProvider: () => void;
    switchToAgent: () => void;
    switchToTask: () => void;
    switchToMcp: () => void;
    closePanel: () => void;
}

/**
 * Manage panel switching state
 *
 * @returns Panel management functions and state
 *
 * Example:
 * ```tsx
 * const { activeView, isChatView, switchToHistory, closePanel } = useChatPanels();
 * ```
 */
export function useChatPanels(): UseChatPanelsResult {
    const [activeView, setActiveView] = useState<ChatView>('chat');
    const focusManager = useFocusManager();

    const switchToHistory = useCallback(() => {
        setActiveView('history');
    }, []);

    const switchToKnowledge = useCallback(() => {
        setActiveView('knowledge');
    }, []);

    const switchToSettings = useCallback(() => {
        setActiveView('settings');
    }, []);

    const switchToModelProvider = useCallback(() => {
        setActiveView('model-provider');
    }, []);

    const switchToAgent = useCallback(() => {
        setActiveView('agent');
    }, []);

    const switchToTask = useCallback(() => {
        setActiveView('task');
    }, []);

    const switchToMcp = useCallback(() => {
        setActiveView('mcp');
    }, []);

    const closePanel = useCallback(() => {
        console.clear();
        setActiveView('chat');
        focusManager.focus('global-input');
    }, [focusManager]);

    // Derived state: check if currently in chat view
    const isChatView = activeView === 'chat';

    return {
        activeView,
        isChatView,
        switchToHistory,
        switchToKnowledge,
        switchToSettings,
        switchToModelProvider,
        switchToAgent,
        switchToTask,
        switchToMcp,
        closePanel,
    };
}
