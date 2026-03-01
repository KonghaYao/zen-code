/**
 * 终端 WebSocket 连接 Hook
 * 管理与服务端的 WebSocket 通信
 *
 * 使用全局单例模式，确保所有组件共享同一个 WebSocket 连接
 */

import { useCallback, useEffect } from 'react';
import { useTerminalStore } from '../stores/terminalStore.js';
import type {
    TerminalClientMessage,
    TerminalServerMessage,
    WebSocketStatus,
    TerminalSessionState,
} from '../components/terminal/types.js';
import type { TerminalSessionInfo } from '../../services/terminal/types.js';

const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/terminal`;

// 全局 WebSocket 单例
let globalWs: WebSocket | null = null;
let reconnectTimeout: number | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// 全局输出回调集合（按 sessionId 分组）
const outputCallbacksBySession = new Map<string, Set<(data: string) => void>>();

// 输出缓冲区（按 sessionId 分组）- 用于处理时序问题
const outputBufferBySession = new Map<string, string[]>();
const MAX_BUFFER_SIZE = 100;

// 全局状态引用（用于在非 React 上下文中更新状态）
let storeSetWsStatus: ((status: WebSocketStatus) => void) | null = null;
let storeSetWsError: ((error: string | null) => void) | null = null;
let storeAddSession: ((session: TerminalSessionInfo) => void) | null = null;
let storeRemoveSession: ((sessionId: string) => void) | null = null;
let storeUpdateSession: ((sessionId: string, updates: Partial<TerminalSessionState>) => void) | null = null;
let storeSyncSessions: ((sessions: TerminalSessionInfo[]) => void) | null = null;

// 历史输出回调（用于重连后恢复）
const historyCallbacks = new Map<string, (history: string[]) => void>();

// 处理输出消息
function handleOutput(sessionId: string, data: string) {
    const callbacks = outputCallbacksBySession.get(sessionId);

    if (callbacks && callbacks.size > 0) {
        // 有回调，直接分发
        callbacks.forEach((cb) => {
            try {
                cb(data);
            } catch (e) {
                console.error('[useTerminal] output callback error:', e);
            }
        });
    } else {
        // 没有回调，缓冲消息
        let buffer = outputBufferBySession.get(sessionId);
        if (!buffer) {
            buffer = [];
            outputBufferBySession.set(sessionId, buffer);
        }
        // 限制缓冲区大小
        if (buffer.length >= MAX_BUFFER_SIZE) {
            buffer.shift();
        }
        buffer.push(data);
    }
}

// 刷新缓冲区
function flushBuffer(sessionId: string, callback: (data: string) => void) {
    const buffer = outputBufferBySession.get(sessionId);
    if (buffer && buffer.length > 0) {
        console.log('[useTerminal] Flushing buffer for session:', sessionId, 'count:', buffer.length);
        // 复制缓冲区内容，避免引用问题
        const dataToFlush = [...buffer];
        buffer.length = 0; // 清空缓冲区
        // 同步写入
        dataToFlush.forEach((data) => {
            console.log(
                '[useTerminal] Flushing buffer entry, length:',
                data.length,
                'preview:',
                JSON.stringify(data.slice(0, 30)),
            );
            callback(data);
        });
    }
}

// 处理服务端消息
function handleMessage(event: MessageEvent) {
    try {
        const msg: TerminalServerMessage = JSON.parse(event.data);

        switch (msg.type) {
            case 'created':
                storeAddSession?.(msg.session);
                break;

            case 'attached':
                // 重连后附加成功，恢复会话和历史输出
                // 检查会话是否已存在，避免重复添加（如果 list 消息已经添加过了）
                const currentSessions = useTerminalStore.getState().sessions;
                const sessionExists = currentSessions.some((s) => s.sessionId === msg.session.sessionId);

                if (!sessionExists) {
                    storeAddSession?.(msg.session);
                }

                // 触发历史回调
                const historyCb = historyCallbacks.get(msg.session.sessionId);
                if (historyCb) {
                    historyCb(msg.history);
                    historyCallbacks.delete(msg.session.sessionId);
                }
                break;

            case 'history':
                // 历史输出响应
                const cb = historyCallbacks.get(msg.sessionId);
                if (cb) {
                    cb(msg.history);
                }
                break;

            case 'output':
                handleOutput(msg.sessionId, msg.data);
                break;

            case 'destroyed':
                storeRemoveSession?.(msg.sessionId);
                // 清理该 session 的回调和缓冲
                outputCallbacksBySession.delete(msg.sessionId);
                outputBufferBySession.delete(msg.sessionId);
                historyCallbacks.delete(msg.sessionId);
                break;

            case 'exit':
                storeUpdateSession?.(msg.sessionId, { exited: true });
                break;

            case 'error':
                storeSetWsError?.(msg.message);
                console.error('Terminal error:', msg.message);
                break;

            case 'list':
                // 同步会话列表（重连时服务端会发送所有现有会话）
                storeSyncSessions?.(msg.sessions);
                break;
        }
    } catch (error) {
        console.error('Failed to parse terminal message:', error);
    }
}

// 连接 WebSocket（全局单例）
function connectGlobal() {
    if (globalWs?.readyState === WebSocket.OPEN) {
        return;
    }

    storeSetWsStatus?.('connecting');
    storeSetWsError?.(null);

    try {
        const ws = new WebSocket(WS_URL);
        globalWs = ws;

        ws.onopen = () => {
            storeSetWsStatus?.('connected');
            storeSetWsError?.(null);
            reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
            handleMessage(event);
        };

        ws.onerror = (error) => {
            storeSetWsStatus?.('error');
            storeSetWsError?.('WebSocket connection error');
            console.error('[useTerminal] WebSocket error:', error);
        };

        ws.onclose = () => {
            storeSetWsStatus?.('disconnected');

            // 自动重连
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                const delay = Math.min(1000 * reconnectAttempts, 5000);
                reconnectTimeout = window.setTimeout(connectGlobal, delay);
            }
        };
    } catch (error) {
        storeSetWsStatus?.('error');
        storeSetWsError?.('Failed to create WebSocket');
        console.error('[useTerminal] Failed to create WebSocket:', error);
    }
}

// 断开连接（全局单例）
function disconnectGlobal() {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    if (globalWs) {
        globalWs.close();
        globalWs = null;
    }
    storeSetWsStatus?.('disconnected');
}

// 发送消息（全局单例）
function sendGlobal(msg: TerminalClientMessage): boolean {
    if (globalWs?.readyState === WebSocket.OPEN) {
        globalWs.send(JSON.stringify(msg));
        return true;
    }
    return false;
}

// 引用计数，用于管理连接生命周期
let connectionRefCount = 0;

export function useTerminal() {
    const { setWsStatus, setWsError, addSession, removeSession, updateSession, activeSessionId, syncSessions } =
        useTerminalStore();

    // 注册 store 方法到全局引用
    useEffect(() => {
        storeSetWsStatus = setWsStatus;
        storeSetWsError = setWsError;
        storeAddSession = addSession;
        storeRemoveSession = removeSession;
        storeUpdateSession = updateSession;
        storeSyncSessions = syncSessions;
    }, [setWsStatus, setWsError, addSession, removeSession, updateSession, syncSessions]);

    // 管理连接生命周期
    useEffect(() => {
        connectionRefCount++;

        if (connectionRefCount === 1) {
            // 第一个使用者，建立连接
            connectGlobal();
        }

        return () => {
            connectionRefCount--;

            if (connectionRefCount === 0) {
                // 最后一个使用者，断开连接
                disconnectGlobal();
            }
        };
    }, []);

    // 发送消息
    const send = useCallback((msg: TerminalClientMessage) => {
        return sendGlobal(msg);
    }, []);

    // 创建终端会话
    const createSession = useCallback(
        (cols: number, rows: number, cwd?: string) => {
            return send({ type: 'create', cols, rows, cwd });
        },
        [send],
    );

    // 发送输入
    const sendInput = useCallback(
        (sessionId: string, data: string) => {
            return send({ type: 'input', sessionId, data });
        },
        [send],
    );

    // 调整大小
    const resize = useCallback(
        (sessionId: string, cols: number, rows: number) => {
            return send({ type: 'resize', sessionId, cols, rows });
        },
        [send],
    );

    // 销毁会话
    const destroySession = useCallback(
        (sessionId: string) => {
            return send({ type: 'destroy', sessionId });
        },
        [send],
    );

    // 列出会话
    const listSessions = useCallback(() => {
        return send({ type: 'list' });
    }, [send]);

    // 附加到已存在的会话（用于重连恢复）
    const attachSession = useCallback(
        (sessionId: string, onHistory?: (history: string[]) => void) => {
            if (onHistory) {
                historyCallbacks.set(sessionId, onHistory);
            }
            return send({ type: 'attach', sessionId });
        },
        [send],
    );

    // 手动重连
    const connect = useCallback(() => {
        disconnectGlobal();
        reconnectAttempts = 0;
        connectGlobal();
    }, []);

    // 手动断开
    const disconnect = useCallback(() => {
        disconnectGlobal();
    }, []);

    // 注册输出回调（按 sessionId）
    const onOutput = useCallback((sessionId: string, callback: (data: string) => void) => {
        let callbacks = outputCallbacksBySession.get(sessionId);
        if (!callbacks) {
            callbacks = new Set();
            outputCallbacksBySession.set(sessionId, callbacks);
        }
        callbacks.add(callback);

        // 立即刷新缓冲区
        flushBuffer(sessionId, callback);

        return () => {
            callbacks?.delete(callback);
        };
    }, []);

    return {
        // 状态
        wsStatus: useTerminalStore((s) => s.wsStatus),
        wsError: useTerminalStore((s) => s.wsError),
        sessions: useTerminalStore((s) => s.sessions),
        activeSessionId,

        // 连接控制
        connect,
        disconnect,

        // 会话操作
        createSession,
        destroySession,
        listSessions,
        attachSession, // 重连恢复

        // 终端操作
        sendInput,
        resize,
        onOutput,
    };
}
