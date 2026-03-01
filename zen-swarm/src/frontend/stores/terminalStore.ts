/**
 * 终端状态管理 Store
 * 使用 Zustand 管理多终端会话状态
 */

import { create } from 'zustand';
import type { TerminalSessionState, WebSocketStatus } from '../components/terminal/types.js';
import type { TerminalSessionInfo } from '../../services/terminal/types.js';

interface TerminalStore {
    // 会话管理
    sessions: TerminalSessionState[];
    activeSessionId: string | null;

    // WebSocket 状态
    wsStatus: WebSocketStatus;
    wsError: string | null;

    // 会话操作
    addSession: (session: TerminalSessionInfo) => void;
    removeSession: (sessionId: string) => void;
    setActiveSession: (sessionId: string | null) => void;
    updateSession: (sessionId: string, updates: Partial<TerminalSessionState>) => void;
    renameSession: (sessionId: string, name: string) => void;
    syncSessions: (sessions: TerminalSessionInfo[]) => void; // 同步服务端会话列表（重连时使用）

    // WebSocket 状态更新
    setWsStatus: (status: WebSocketStatus) => void;
    setWsError: (error: string | null) => void;

    // 辅助方法
    getActiveSession: () => TerminalSessionState | undefined;
    getSessionCount: () => number;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
    // 初始状态
    sessions: [],
    activeSessionId: null,
    wsStatus: 'disconnected',
    wsError: null,

    // 添加会话
    addSession: (session: TerminalSessionInfo) => {
        set((state) => {
            // 避免重复添加同一会话（可能同时收到 created 和 list 消息）
            if (state.sessions.some((s) => s.sessionId === session.sessionId)) {
                return state;
            }

            const newSession: TerminalSessionState = {
                ...session,
                name: `终端 ${state.sessions.length + 1}`,
                isActive: state.sessions.length === 0, // 第一个会话默认激活
            };

            return {
                sessions: [...state.sessions, newSession],
                // 如果是第一个会话，自动设为激活
                activeSessionId: state.sessions.length === 0 ? session.sessionId : state.activeSessionId,
            };
        });
    },

    // 移除会话
    removeSession: (sessionId: string) => {
        set((state) => {
            const newSessions = state.sessions.filter((s) => s.sessionId !== sessionId);
            let newActiveId = state.activeSessionId;

            // 如果移除的是当前激活的会话，切换到第一个会话
            if (state.activeSessionId === sessionId) {
                newActiveId = newSessions.length > 0 ? newSessions[0].sessionId : null;
            }

            return {
                sessions: newSessions,
                activeSessionId: newActiveId,
            };
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

    // 同步服务端会话列表（重连时使用）
    syncSessions: (serverSessions: TerminalSessionInfo[]) => {
        set((state) => {
            // 仅保留本地存在的会话，添加服务端有但本地没有的会话
            const existingIds = new Set(state.sessions.map((s) => s.sessionId));
            const newSessions: TerminalSessionState[] = [...state.sessions];

            for (const serverSession of serverSessions) {
                if (!existingIds.has(serverSession.sessionId)) {
                    // 服务端有但本地没有的会话，添加到本地
                    newSessions.push({
                        ...serverSession,
                        name: `终端 ${newSessions.length + 1}`,
                        isActive: false,
                    });
                }
            }

            // 如果当前没有激活会话但有服务端会话，自动激活第一个
            const activeId = state.activeSessionId ?? (newSessions.length > 0 ? newSessions[0].sessionId : null);

            return {
                sessions: newSessions,
                activeSessionId: activeId,
            };
        });
    },

    // WebSocket 状态
    setWsStatus: (status: WebSocketStatus) => {
        set({ wsStatus: status });
    },

    setWsError: (error: string | null) => {
        set({ wsError: error });
    },

    // 获取激活会话
    getActiveSession: () => {
        const state = get();
        return state.sessions.find((s) => s.sessionId === state.activeSessionId);
    },

    // 获取会话数量
    getSessionCount: () => {
        return get().sessions.length;
    },
}));
