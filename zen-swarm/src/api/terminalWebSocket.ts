/**
 * 终端 WebSocket 处理器
 * 处理客户端与终端会话之间的通信
 */

import type { ServerWebSocket } from 'bun';
import {
    getTerminalManager,
    type TerminalClientMessage,
    type TerminalServerMessage,
} from '../services/terminal/index.js';

// WebSocket 数据附加类型
interface TerminalWebSocketData {
    sessionId?: string;
}

// 创建响应消息的辅助函数
function createMessage(msg: TerminalServerMessage): string {
    return JSON.stringify(msg);
}

/**
 * 处理 WebSocket 消息
 */
export function handleTerminalMessage(ws: ServerWebSocket<TerminalWebSocketData>, message: string | Buffer): void {
    try {
        const msg: TerminalClientMessage = JSON.parse(message.toString());
        const manager = getTerminalManager();

        switch (msg.type) {
            case 'create': {
                if (!manager.canCreateMore()) {
                    ws.send(
                        createMessage({
                            type: 'error',
                            message: 'Maximum number of terminal sessions reached',
                        }),
                    );
                    return;
                }

                const session = manager.create(msg.cols, msg.rows, msg.cwd);
                ws.data.sessionId = session.sessionId;

                // 发送创建成功消息
                ws.send(
                    createMessage({
                        type: 'created',
                        session,
                    }),
                );

                // 监听输出
                manager.onOutput(session.sessionId, (data: string) => {
                    ws.send(
                        createMessage({
                            type: 'output',
                            sessionId: session.sessionId,
                            data,
                        }),
                    );
                });

                // 监听退出
                manager.onExit(session.sessionId, (code: number) => {
                    ws.send(
                        createMessage({
                            type: 'exit',
                            sessionId: session.sessionId,
                            code,
                        }),
                    );
                });
                break;
            }

            case 'input': {
                if (!manager.write(msg.sessionId, msg.data)) {
                    ws.send(
                        createMessage({
                            type: 'error',
                            sessionId: msg.sessionId,
                            message: 'Terminal session not found or exited',
                        }),
                    );
                }
                break;
            }

            case 'resize': {
                if (!manager.resize(msg.sessionId, msg.cols, msg.rows)) {
                    ws.send(
                        createMessage({
                            type: 'error',
                            sessionId: msg.sessionId,
                            message: 'Terminal session not found or exited',
                        }),
                    );
                }
                break;
            }

            case 'destroy': {
                if (manager.destroy(msg.sessionId)) {
                    ws.send(
                        createMessage({
                            type: 'destroyed',
                            sessionId: msg.sessionId,
                        }),
                    );
                }
                break;
            }

            case 'list': {
                ws.send(
                    createMessage({
                        type: 'list',
                        sessions: manager.listSessions(),
                    }),
                );
                break;
            }

            default: {
                ws.send(
                    createMessage({
                        type: 'error',
                        message: `Unknown message type`,
                    }),
                );
            }
        }
    } catch (error) {
        ws.send(
            createMessage({
                type: 'error',
                message: `Failed to parse message: ${error}`,
            }),
        );
    }
}

/**
 * 处理 WebSocket 连接关闭
 */
export function handleTerminalClose(ws: ServerWebSocket<TerminalWebSocketData>): void {
    const manager = getTerminalManager();
    // 关闭与此连接关联的所有会话
    // 这里简单处理：关闭最后一个会话
    // 实际应用中可能需要更精细的会话管理
    if (ws.data.sessionId) {
        manager.destroy(ws.data.sessionId);
    }
}

/**
 * 处理 WebSocket 连接打开
 */
export function handleTerminalOpen(ws: ServerWebSocket<TerminalWebSocketData>): void {
    // 发送连接成功消息
    ws.send(
        createMessage({
            type: 'list',
            sessions: getTerminalManager().listSessions(),
        }),
    );
}
