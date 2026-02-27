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
            return true;
        }
        return false;
    }

    /**
     * 注册输出监听
     */
    onOutput(sessionId: string, callback: (data: string) => void): (() => void) | undefined {
        const session = this.sessions.get(sessionId);
        if (session) {
            return session.onOutput(callback);
        }
        return undefined;
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
    }
}

// 单例模式
let terminalManager: TerminalManager | null = null;

export function getTerminalManager(): TerminalManager {
    if (!terminalManager) {
        terminalManager = new TerminalManager();
    }
    return terminalManager;
}
