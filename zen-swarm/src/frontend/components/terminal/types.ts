/**
 * 终端组件类型定义
 */

import type { TerminalSessionInfo } from '../../../services/terminal/types.js';

/**
 * 终端会话状态（前端）
 */
export interface TerminalSessionState extends TerminalSessionInfo {
    name: string;
    isActive: boolean;
    exited?: boolean;
}

/**
 * 终端 WebSocket 消息类型（与后端对齐）
 */
export type TerminalClientMessage =
    | { type: 'input'; sessionId: string; data: string }
    | { type: 'resize'; sessionId: string; cols: number; rows: number }
    | { type: 'create'; cols: number; rows: number; cwd?: string }
    | { type: 'destroy'; sessionId: string }
    | { type: 'list' };

export type TerminalServerMessage =
    | { type: 'output'; sessionId: string; data: string }
    | { type: 'created'; session: TerminalSessionInfo }
    | { type: 'destroyed'; sessionId: string }
    | { type: 'error'; sessionId?: string; message: string }
    | { type: 'list'; sessions: TerminalSessionInfo[] }
    | { type: 'exit'; sessionId: string; code: number };

/**
 * WebSocket 连接状态
 */
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * 终端主题配置
 */
export interface TerminalTheme {
    background: string;
    foreground: string;
    cursor: string;
    cursorAccent?: string;
    selection?: string;
    black?: string;
    red?: string;
    green?: string;
    yellow?: string;
    blue?: string;
    magenta?: string;
    cyan?: string;
    white?: string;
    brightBlack?: string;
    brightRed?: string;
    brightGreen?: string;
    brightYellow?: string;
    brightBlue?: string;
    brightMagenta?: string;
    brightCyan?: string;
    brightWhite?: string;
}

/**
 * 终端配置选项
 */
export interface TerminalOptions {
    fontSize: number;
    fontFamily: string;
    theme: TerminalTheme;
    cursorBlink: boolean;
    cursorStyle: 'block' | 'underline' | 'bar';
    scrollback: number;
}
