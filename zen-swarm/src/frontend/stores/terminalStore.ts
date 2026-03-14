/**
 * 终端状态管理 Store
 * 使用 Zustand 管理多终端会话状态 + 工作区网格布局
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
        layout: { panes: [pane] },
        activePaneId: pane.id,
    };
}

/** 统计工作区内 pane 总数（递归） */
function countPanes(pane: TerminalPane): number {
    if (pane.split) {
        return countPanes(pane.split.children[0]) + countPanes(pane.split.children[1]);
    }
    return 1;
}

/** 收集所有叶子 pane（递归） */
function collectLeafPanes(pane: TerminalPane): TerminalPane[] {
    if (pane.split) {
        return [...collectLeafPanes(pane.split.children[0]), ...collectLeafPanes(pane.split.children[1])];
    }
    return [pane];
}

/** 在 pane 树中找到目标 pane 并分割，返回新树 */
function splitPaneInTree(root: TerminalPane, targetId: string, direction: 'horizontal' | 'vertical'): TerminalPane {
    if (root.id === targetId) {
        const newPane = createDefaultPane();
        return {
            ...root,
            split: {
                direction,
                children: [{ id: root.id, sessionId: root.sessionId }, newPane],
            },
            id: root.id,
        };
    }
    if (root.split) {
        return {
            ...root,
            split: {
                ...root.split,
                children: [
                    splitPaneInTree(root.split.children[0], targetId, direction),
                    splitPaneInTree(root.split.children[1], targetId, direction),
                ],
            },
        };
    }
    return root;
}

/** 在 pane 树中关闭目标 pane（用兄弟节点替换父节点），返回新树或 null 表示整棵树被删除 */
function closePaneInTree(root: TerminalPane, targetId: string): TerminalPane | null {
    if (!root.split) {
        return root.id === targetId ? null : root;
    }
    const [left, right] = root.split.children;
    if (left.id === targetId) return right;
    if (right.id === targetId) return left;
    const newLeft = closePaneInTree(left, targetId);
    const newRight = closePaneInTree(right, targetId);
    if (!newLeft) return newRight;
    if (!newRight) return newLeft;
    return { ...root, split: { ...root.split, children: [newLeft, newRight] } };
}

/** 更新 pane 树中指定 pane 的 sessionId */
function updateSessionInTree(root: TerminalPane, paneId: string, sessionId: string | null): TerminalPane {
    if (root.id === paneId) return { ...root, sessionId };
    if (root.split) {
        return {
            ...root,
            split: {
                ...root.split,
                children: [
                    updateSessionInTree(root.split.children[0], paneId, sessionId),
                    updateSessionInTree(root.split.children[1], paneId, sessionId),
                ],
            },
        };
    }
    return root;
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
    setActiveWorkspace: (id: string) => void;

    // Pane 操作
    splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => void;
    closePane: (paneId: string) => void;
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

            setActiveWorkspace: (id: string) => {
                set({ activeWorkspaceId: id });
            },

            // ---- Pane 操作 ----

            splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => {
                set((state) => {
                    const ws = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
                    if (!ws) return state;

                    const rootPane = ws.layout.panes[0];
                    if (!rootPane) return state;

                    const total = countPanes(rootPane);
                    if (total >= 4) return state; // 最多 4 个 pane

                    const newRoot = splitPaneInTree(rootPane, paneId, direction);
                    // 新分割后，激活新创建的 pane（最后一个叶子节点）
                    const leaves = collectLeafPanes(newRoot);
                    const newPane = leaves[leaves.length - 1];

                    return {
                        workspaces: state.workspaces.map((w) =>
                            w.id === state.activeWorkspaceId
                                ? {
                                      ...w,
                                      layout: { panes: [newRoot] },
                                      activePaneId: newPane.id,
                                  }
                                : w,
                        ),
                    };
                });
            },

            closePane: (paneId: string) => {
                set((state) => {
                    const ws = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
                    if (!ws) return state;

                    const rootPane = ws.layout.panes[0];
                    if (!rootPane) return state;

                    const total = countPanes(rootPane);
                    if (total <= 1) return state; // 至少保留 1 个

                    const newRoot = closePaneInTree(rootPane, paneId);
                    if (!newRoot) return state;

                    // 激活第一个叶子 pane
                    const leaves = collectLeafPanes(newRoot);
                    const newActivePaneId = ws.activePaneId === paneId ? leaves[0].id : ws.activePaneId;

                    return {
                        workspaces: state.workspaces.map((w) =>
                            w.id === state.activeWorkspaceId
                                ? {
                                      ...w,
                                      layout: { panes: [newRoot] },
                                      activePaneId: newActivePaneId,
                                  }
                                : w,
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
                set((state) => {
                    const ws = state.workspaces.find((w) => w.id === workspaceId);
                    if (!ws) return state;
                    const rootPane = ws.layout.panes[0];
                    if (!rootPane) return state;
                    const newRoot = updateSessionInTree(rootPane, paneId, sessionId);
                    return {
                        workspaces: state.workspaces.map((w) =>
                            w.id === workspaceId ? { ...w, layout: { panes: [newRoot] } } : w,
                        ),
                    };
                });
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
                const leaves = ws.layout.panes[0] ? collectLeafPanes(ws.layout.panes[0]) : [];
                return leaves.find((p) => p.id === ws.activePaneId);
            },

            getPaneCount: () => {
                const state = get();
                const ws = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
                if (!ws || !ws.layout.panes[0]) return 0;
                return countPanes(ws.layout.panes[0]);
            },
        }),
        {
            name: 'terminal-store',
            // 只持久化 workspaces 布局和 activeWorkspaceId，不持久化 transient 状态
            partialize: (state) => ({
                workspaces: state.workspaces,
                activeWorkspaceId: state.activeWorkspaceId,
            }),
        },
    ),
);

// 导出辅助函数供组件使用
export { collectLeafPanes, countPanes };
