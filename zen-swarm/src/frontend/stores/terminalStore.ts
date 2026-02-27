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
