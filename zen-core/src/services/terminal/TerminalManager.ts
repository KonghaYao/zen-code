/**
 * 终端会话管理器
 * 管理多个终端会话的创建、销毁、通信
 */

import { randomUUID } from 'crypto';
import { TerminalSession } from './TerminalSession.js';
import type { TerminalSessionInfo } from './types.js';

export class TerminalManager {
    private sessions: Map<string, TerminalSession> = new Map();
    private maxSessionsPerConnection = 10;

    // WebSocket 输出监听器跟踪（sessionId -> WebSocket -> unsubscribe）
    private outputUnsubscribes: Map<string, Map<unknown, () => void>> = new Map();

    /**
     * 创建新的终端会话
     */
    create(cols: number, rows: number, cwd?: string): TerminalSessionInfo {
        const sessionId = randomUUID();
        const session = new TerminalSession(sessionId, cols, rows, cwd);
        this.sessions.set(sessionId, session);

        return session.info;
    }

    /**
     * 获取会话信息
     */
    getSession(sessionId: string): TerminalSessionInfo | undefined {
        return this.sessions.get(sessionId)?.info;
    }

    /**
     * 获取会话实例
     */
    getSessionInstance(sessionId: string): TerminalSession | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * 列出所有会话
     */
    listSessions(): TerminalSessionInfo[] {
        return Array.from(this.sessions.values()).map((s) => s.info);
    }

    /**
     * 向终端写入数据
     */
    write(sessionId: string, data: string): boolean {
        const session = this.sessions.get(sessionId);
        if (session && !session.exited) {
            session.write(data);
            return true;
        }
        return false;
    }

    /**
     * 调整终端大小
     */
    resize(sessionId: string, cols: number, rows: number): boolean {
        const session = this.sessions.get(sessionId);
        if (session && !session.exited) {
            session.resize(cols, rows);
            return true;
        }
        return false;
    }

    /**
     * 销毁终端会话
     */
    destroy(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.kill();
            this.sessions.delete(sessionId);
            // 清理监听器
            this.cleanupSessionListeners(sessionId);
            return true;
        }
        return false;
    }

    /**
     * 注册输出监听（WebSocket 独占模式）
     * 每个 sessionId 同一时间只允许一个 WebSocket 监听输出
     * 如果已有监听器，会先取消旧的监听器
     */
    onOutput(sessionId: string, ws: unknown, callback: (data: string) => void): (() => void) | undefined {
        const session = this.sessions.get(sessionId);
        if (!session) return undefined;

        // 获取或创建 sessionId 的监听器映射
        let wsUnsubscribes = this.outputUnsubscribes.get(sessionId);
        if (!wsUnsubscribes) {
            wsUnsubscribes = new Map();
            this.outputUnsubscribes.set(sessionId, wsUnsubscribes);
        }

        // 如果该 WebSocket 已经有监听器，先取消它
        const existingUnsubscribe = wsUnsubscribes.get(ws);
        if (existingUnsubscribe) {
            existingUnsubscribe();
        }

        // 注册新的监听器
        const unsubscribe = session.onOutput(callback);
        if (unsubscribe) {
            wsUnsubscribes.set(ws, unsubscribe);
        }

        // 返回取消函数
        return () => {
            unsubscribe?.();
            wsUnsubscribes.delete(ws);
            if (wsUnsubscribes.size === 0) {
                this.outputUnsubscribes.delete(sessionId);
            }
        };
    }

    /**
     * 注册退出监听
     */
    onExit(sessionId: string, callback: (code: number) => void): (() => void) | undefined {
        const session = this.sessions.get(sessionId);
        if (session) {
            return session.onExit(callback);
        }
        return undefined;
    }

    /**
     * 清理会话的所有监听器
     */
    private cleanupSessionListeners(sessionId: string): void {
        const wsUnsubscribes = this.outputUnsubscribes.get(sessionId);
        if (wsUnsubscribes) {
            wsUnsubscribes.forEach((unsubscribe) => unsubscribe());
            wsUnsubscribes.clear();
            this.outputUnsubscribes.delete(sessionId);
        }
    }

    /**
     * 获取会话历史输出（用于断线重连后恢复）
     */
    getHistory(sessionId: string): string[] | null {
        const session = this.sessions.get(sessionId);
        if (session) {
            return session.getHistory();
        }
        return null;
    }

    /**
     * 检查会话是否存在
     */
    hasSession(sessionId: string): boolean {
        return this.sessions.has(sessionId);
    }

    /**
     * 获取会话数量
     */
    get size(): number {
        return this.sessions.size;
    }

    /**
     * 检查会话数量限制
     */
    canCreateMore(): boolean {
        return this.sessions.size < this.maxSessionsPerConnection;
    }

    /**
     * 销毁所有会话
     */
    destroyAll(): void {
        this.sessions.forEach((session) => session.kill());
        this.sessions.clear();
        this.outputUnsubscribes.forEach((wsUnsubscribes) => {
            wsUnsubscribes.forEach((unsubscribe) => unsubscribe());
            wsUnsubscribes.clear();
        });
        this.outputUnsubscribes.clear();
    }
}

// 单例模式
let terminalManager: TerminalManager | null = null;

export function getTerminalManager(): TerminalManager {
    if (!terminalManager) {
        terminalManager = new TerminalManager();
        // 进程退出时清理所有终端会话
        const cleanup = () => {
            terminalManager?.destroyAll();
        };
        process.once('SIGTERM', cleanup);
        process.once('SIGINT', cleanup);
        process.once('exit', cleanup);
    }
    return terminalManager;
}
