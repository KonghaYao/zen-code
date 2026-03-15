/**
 * usePostmanTabs — 多标签页状态管理 hook
 */

import { useState, useCallback } from 'react';
import type { ActiveRequest, SendRequestResult } from '../types/postman.js';
import { DEFAULT_REQUEST } from '../types/postman.js';

type RequestTab = 'params' | 'headers' | 'auth' | 'body';

export interface TabState {
    id: string;
    request: ActiveRequest;
    response: SendRequestResult | null;
    isSending: boolean;
    requestTab: RequestTab;
}

function createEmptyTab(): TabState {
    return {
        id: crypto.randomUUID(),
        request: { ...DEFAULT_REQUEST },
        response: null,
        isSending: false,
        requestTab: 'params',
    };
}

export function usePostmanTabs() {
    const [tabs, setTabs] = useState<TabState[]>(() => [createEmptyTab()]);
    const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id ?? '');

    const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

    const openNewTab = useCallback(() => {
        const tab = createEmptyTab();
        setTabs((prev) => [...prev, tab]);
        setActiveTabId(tab.id);
    }, []);

    const closeTab = useCallback(
        (id: string) => {
            const tab = tabs.find((t) => t.id === id);
            if (tab?.request.isDirty) {
                if (!window.confirm('该标签页有未保存的修改，确认关闭？')) return;
            }

            setTabs((prev) => {
                if (prev.length === 1) {
                    const fresh = createEmptyTab();
                    setActiveTabId(fresh.id);
                    return [fresh];
                }
                const newTabs = prev.filter((t) => t.id !== id);
                if (id === activeTabId) {
                    const idx = prev.findIndex((t) => t.id === id);
                    const nextTab = newTabs[Math.min(idx, newTabs.length - 1)];
                    setActiveTabId(nextTab.id);
                }
                return newTabs;
            });
        },
        [tabs, activeTabId],
    );

    const openRequest = useCallback(
        (req: ActiveRequest) => {
            // 若同 id 已开，切换过去
            if (req.id) {
                const existing = tabs.find((t) => t.request.id === req.id);
                if (existing) {
                    setActiveTabId(existing.id);
                    return;
                }
            }

            // 若当前 tab 是空白（无 url、无 id、无 dirty），则替换
            const curTab = tabs.find((t) => t.id === activeTabId);
            if (curTab && !curTab.request.url && !curTab.request.id && !curTab.request.isDirty) {
                setTabs((prev) =>
                    prev.map((t) =>
                        t.id === activeTabId
                            ? { ...t, request: { ...req, isDirty: false }, response: null, requestTab: 'params' }
                            : t,
                    ),
                );
                return;
            }

            // 否则新开 tab
            const tab: TabState = {
                id: crypto.randomUUID(),
                request: { ...req, isDirty: false },
                response: null,
                isSending: false,
                requestTab: 'params',
            };
            setTabs((prev) => [...prev, tab]);
            setActiveTabId(tab.id);
        },
        [tabs, activeTabId],
    );

    const updateActiveRequest = useCallback(
        (patch: Partial<ActiveRequest>) => {
            setTabs((prev) =>
                prev.map((t) =>
                    t.id === activeTabId ? { ...t, request: { ...t.request, ...patch, isDirty: true } } : t,
                ),
            );
        },
        [activeTabId],
    );

    const setTabResponse = useCallback((id: string, response: SendRequestResult | null, isSending: boolean) => {
        setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, response, isSending } : t)));
    }, []);

    const setTabSending = useCallback((id: string, isSending: boolean) => {
        setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, isSending } : t)));
    }, []);

    const setActiveRequestTab = useCallback(
        (tab: RequestTab) => {
            setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, requestTab: tab } : t)));
        },
        [activeTabId],
    );

    const markSaved = useCallback(() => {
        setTabs((prev) =>
            prev.map((t) => (t.id === activeTabId ? { ...t, request: { ...t.request, isDirty: false } } : t)),
        );
    }, [activeTabId]);

    return {
        tabs,
        activeTabId,
        activeTab,
        openNewTab,
        closeTab,
        setActiveTabId,
        openRequest,
        updateActiveRequest,
        setTabResponse,
        setTabSending,
        setActiveRequestTab,
        markSaved,
    };
}
