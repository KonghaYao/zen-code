/**
 * 终端服务类型定义
 */

export interface TerminalSessionInfo {
    sessionId: string;
    pid: number;
    createdAt: number;
    cols: number;
    rows: number;
    cwd: string;
}

// 客户端 -> 服务端消息
export type TerminalClientMessage =
    | { type: 'input'; sessionId: string; data: string }
    | { type: 'resize'; sessionId: string; cols: number; rows: number }
    | { type: 'create'; cols: number; rows: number; cwd?: string }
    | { type: 'destroy'; sessionId: string }
    | { type: 'list' };

// 服务端 -> 客户端消息
export type TerminalServerMessage =
    | { type: 'output'; sessionId: string; data: string }
    | { type: 'created'; session: TerminalSessionInfo }
    | { type: 'destroyed'; sessionId: string }
    | { type: 'error'; sessionId?: string; message: string }
    | { type: 'list'; sessions: TerminalSessionInfo[] }
    | { type: 'exit'; sessionId: string; code: number };

export interface TerminalSessionEvents {
    onOutput: (data: string) => void;
    onExit: (code: number) => void;
}
