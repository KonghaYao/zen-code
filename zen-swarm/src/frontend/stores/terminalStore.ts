/**
 * 终端状态管理 Store
 * 使用 Zustand 管理多终端会话状态 + 工作区平铺布局
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    TerminalSessionState,
    WebSocketStatus,
    TerminalWorkspace,
    TerminalPane,
} from '../components/terminal/types.js';
import type { TerminalSessionInfo } from '../../services/terminal/types.js';

// ---- 辅助函数 ----

function generateId(): string {
    return Math.random().toString(36).slice(2, 10);
}

function createDefaultPane(): TerminalPane {
    return { id: generateId(), sessionId: null };
}

function createDefaultWorkspace(index: number): TerminalWorkspace {
    const pane = createDefaultPane();
    return {
        id: generateId(),
        name: `工作区 ${index}`,
        panes: [pane],
        activePaneId: pane.id,
    };
}

// ---- Store 类型 ----

interface TerminalStore {
    // 会话管理
    sessions: TerminalSessionState[];
    activeSessionId: string | null;

    // WebSocket 状态
    wsStatus: WebSocketStatus;
    wsError: string | null;

    // 工作区管理
    workspaces: TerminalWorkspace[];
    activeWorkspaceId: string;

    // 会话操作
    addSession: (session: TerminalSessionInfo) => void;
    removeSession: (sessionId: string) => void;
    setActiveSession: (sessionId: string | null) => void;
    updateSession: (sessionId: string, updates: Partial<TerminalSessionState>) => void;
    renameSession: (sessionId: string, name: string) => void;
    syncSessions: (sessions: TerminalSessionInfo[]) => void;

    // WebSocket 状态更新
    setWsStatus: (status: WebSocketStatus) => void;
    setWsError: (error: string | null) => void;

    // 辅助方法
    getActiveSession: () => TerminalSessionState | undefined;
    getSessionCount: () => number;

    // 工作区操作
    createWorkspace: (name?: string) => void;
    deleteWorkspace: (id: string) => void;
    renameWorkspace: (id: string, name: string) => void;
    setWorkspaceCwd: (id: string, cwd: string) => void;
    setActiveWorkspace: (id: string) => void;

    // Pane 操作
    addPane: (workspaceId: string) => void;
    removePane: (workspaceId: string, paneId: string) => void;
    setActivePaneInWorkspace: (workspaceId: string, paneId: string) => void;
    setPaneSession: (workspaceId: string, paneId: string, sessionId: string | null) => void;

    // 辅助
    getActiveWorkspace: () => TerminalWorkspace | undefined;
    getActivePane: () => TerminalPane | undefined;
    getPaneCount: () => number;
}

// ---- 初始工作区 ----

const initialWorkspace = createDefaultWorkspace(1);

export const useTerminalStore = create<TerminalStore>()(
    persist(
        (set, get) => ({
            // 初始状态
            sessions: [],
            activeSessionId: null,
            wsStatus: 'disconnected',
            wsError: null,

            workspaces: [initialWorkspace],
            activeWorkspaceId: initialWorkspace.id,

            // 添加会话
            addSession: (session: TerminalSessionInfo) => {
                set((state) => {
                    if (state.sessions.some((s) => s.sessionId === session.sessionId)) {
                        return state;
                    }
                    const newSession: TerminalSessionState = {
                        ...session,
                        name: `终端 ${state.sessions.length + 1}`,
                        isActive: state.sessions.length === 0,
                    };
                    return {
                        sessions: [...state.sessions, newSession],
                        activeSessionId: state.sessions.length === 0 ? session.sessionId : state.activeSessionId,
                    };
                });
            },

            // 移除会话
            removeSession: (sessionId: string) => {
                set((state) => {
                    const newSessions = state.sessions.filter((s) => s.sessionId !== sessionId);
                    let newActiveId = state.activeSessionId;
                    if (state.activeSessionId === sessionId) {
                        newActiveId = newSessions.length > 0 ? newSessions[0].sessionId : null;
                    }
                    return { sessions: newSessions, activeSessionId: newActiveId };
                });
            },

            // 设置激活会话
            setActiveSession: (sessionId: string | null) => {
                set((state) => ({
                    sessions: state.sessions.map((s) => ({
                        ...s,
                        isActive: s.sessionId === sessionId,
                    })),
                    activeSessionId: sessionId,
                }));
            },

            // 更新会话信息
            updateSession: (sessionId: string, updates: Partial<TerminalSessionState>) => {
                set((state) => ({
                    sessions: state.sessions.map((s) => (s.sessionId === sessionId ? { ...s, ...updates } : s)),
                }));
            },

            // 重命名会话
            renameSession: (sessionId: string, name: string) => {
                set((state) => ({
                    sessions: state.sessions.map((s) => (s.sessionId === sessionId ? { ...s, name } : s)),
                }));
            },

            // 同步服务端会话列表
            syncSessions: (serverSessions: TerminalSessionInfo[]) => {
                set((state) => {
                    const existingIds = new Set(state.sessions.map((s) => s.sessionId));
                    const newSessions: TerminalSessionState[] = [...state.sessions];
                    for (const serverSession of serverSessions) {
                        if (!existingIds.has(serverSession.sessionId)) {
                            newSessions.push({
                                ...serverSession,
                                name: `终端 ${newSessions.length + 1}`,
                                isActive: false,
                            });
                        }
                    }
                    const activeId =
                        state.activeSessionId ?? (newSessions.length > 0 ? newSessions[0].sessionId : null);
                    return { sessions: newSessions, activeSessionId: activeId };
                });
            },

            // WebSocket 状态
            setWsStatus: (status: WebSocketStatus) => set({ wsStatus: status }),
            setWsError: (error: string | null) => set({ wsError: error }),

            // 获取激活会话
            getActiveSession: () => {
                const state = get();
                return state.sessions.find((s) => s.sessionId === state.activeSessionId);
            },

            // 获取会话数量
            getSessionCount: () => get().sessions.length,

            // ---- 工作区操作 ----

            createWorkspace: (name?: string) => {
                set((state) => {
                    const ws = createDefaultWorkspace(state.workspaces.length + 1);
                    if (name) ws.name = name;
                    return {
                        workspaces: [...state.workspaces, ws],
                        activeWorkspaceId: ws.id,
                    };
                });
            },

            deleteWorkspace: (id: string) => {
                set((state) => {
                    if (state.workspaces.length <= 1) return state; // 至少保留 1 个
                    const newWorkspaces = state.workspaces.filter((w) => w.id !== id);
                    const newActiveId = state.activeWorkspaceId === id ? newWorkspaces[0].id : state.activeWorkspaceId;
                    return { workspaces: newWorkspaces, activeWorkspaceId: newActiveId };
                });
            },

            renameWorkspace: (id: string, name: string) => {
                set((state) => ({
                    workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, name } : w)),
                }));
            },

            setWorkspaceCwd: (id: string, cwd: string) => {
                set((state) => ({
                    workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, cwd } : w)),
                }));
            },

            setActiveWorkspace: (id: string) => {
                set({ activeWorkspaceId: id });
            },

            // ---- Pane 操作 ----

            // 向工作区追加一个空 pane（最多 4 个）
            addPane: (workspaceId: string) => {
                set((state) => {
                    const ws = state.workspaces.find((w) => w.id === workspaceId);
                    if (!ws || ws.panes.length >= 4) return state;
                    const newPane = createDefaultPane();
                    return {
                        workspaces: state.workspaces.map((w) =>
                            w.id === workspaceId ? { ...w, panes: [...w.panes, newPane], activePaneId: newPane.id } : w,
                        ),
                    };
                });
            },

            // 从工作区移除指定 pane（至少保留 1 个）
            removePane: (workspaceId: string, paneId: string) => {
                set((state) => {
                    const ws = state.workspaces.find((w) => w.id === workspaceId);
                    if (!ws || ws.panes.length <= 1) return state;
                    const removedIndex = ws.panes.findIndex((p) => p.id === paneId);
                    const newPanes = ws.panes.filter((p) => p.id !== paneId);
                    let newActivePaneId = ws.activePaneId;
                    if (ws.activePaneId === paneId) {
                        // 激活被删除 pane 的前一个，若无则取后一个
                        const neighborIndex = removedIndex > 0 ? removedIndex - 1 : 0;
                        newActivePaneId = newPanes[neighborIndex].id;
                    }
                    return {
                        workspaces: state.workspaces.map((w) =>
                            w.id === workspaceId ? { ...w, panes: newPanes, activePaneId: newActivePaneId } : w,
                        ),
                    };
                });
            },

            setActivePaneInWorkspace: (workspaceId: string, paneId: string) => {
                set((state) => ({
                    workspaces: state.workspaces.map((w) =>
                        w.id === workspaceId ? { ...w, activePaneId: paneId } : w,
                    ),
                }));
            },

            setPaneSession: (workspaceId: string, paneId: string, sessionId: string | null) => {
                set((state) => ({
                    workspaces: state.workspaces.map((w) =>
                        w.id === workspaceId
                            ? {
                                  ...w,
                                  panes: w.panes.map((p) => (p.id === paneId ? { ...p, sessionId } : p)),
                              }
                            : w,
                    ),
                }));
            },

            // 辅助
            getActiveWorkspace: () => {
                const state = get();
                return state.workspaces.find((w) => w.id === state.activeWorkspaceId);
            },

            getActivePane: () => {
                const state = get();
                const ws = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
                if (!ws) return undefined;
                return ws.panes.find((p) => p.id === ws.activePaneId);
            },

            getPaneCount: () => {
                const state = get();
                const ws = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
                return ws?.panes.length ?? 0;
            },
        }),
        {
            name: 'terminal-store',
            version: 2,
            // 只持久化 workspaces 布局和 activeWorkspaceId，不持久化 transient 状态
            partialize: (state) => ({
                workspaces: state.workspaces,
                activeWorkspaceId: state.activeWorkspaceId,
            }),
            // 迁移旧数据结构（layout.panes[0] 树形 → panes 平铺数组）
            migrate: (persistedState: unknown, version: number) => {
                if (version < 2) {
                    const old = persistedState as Record<string, unknown>;
                    const oldWorkspaces = (old?.workspaces ?? []) as Array<Record<string, unknown>>;
                    const newWorkspaces = oldWorkspaces.map((ws) => {
                        if (Array.isArray(ws.panes)) return ws; // 已是新结构
                        // 旧结构：ws.layout.panes[0] 是根 pane（可能有 split）
                        const pane = createDefaultPane();
                        return {
                            id: ws.id ?? generateId(),
                            name: ws.name ?? '工作区',
                            panes: [pane],
                            activePaneId: pane.id,
                        };
                    });
                    return {
                        workspaces: newWorkspaces.length > 0 ? newWorkspaces : [createDefaultWorkspace(1)],
                        activeWorkspaceId: old?.activeWorkspaceId ?? newWorkspaces[0]?.id,
                    };
                }
                return persistedState;
            },
        },
    ),
);
