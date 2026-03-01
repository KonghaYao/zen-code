/**
 * 终端 WebSocket 处理器
 * 处理客户端与终端会话之间的通信
 *
 * 关键特性：
 * - 会话持久化：关闭浏览器/断联不会销毁会话
 * - 重连恢复：重连后可恢复历史输出
 * - 用户主动删除：只有用户点击删除才会销毁会话
 */

import type { ServerWebSocket } from 'bun';
import {
    getTerminalManager,
    type TerminalClientMessage,
    type TerminalServerMessage,
} from '../services/terminal/index.js';

// WebSocket 数据附加类型
interface TerminalWebSocketData {
    sessionIds: Set<string>; // 支持同时监控多个会话
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
                ws.data.sessionIds.add(session.sessionId);

                // 发送创建成功消息
                ws.send(
                    createMessage({
                        type: 'created',
                        session,
                    }),
                );

                // 监听输出（传入 ws 作为标识符，确保独占监听）
                const unsubscribe = manager.onOutput(session.sessionId, ws, (data: string) => {
                    ws.send(
                        createMessage({
                            type: 'output',
                            sessionId: session.sessionId,
                            data,
                        }),
                    );
                });

                // 监听退出（但不销毁会话，只通知前端）
                manager.onExit(session.sessionId, (code: number) => {
                    ws.send(
                        createMessage({
                            type: 'exit',
                            sessionId: session.sessionId,
                            code,
                        }),
                    );
                    // 会话退出时取消订阅
                    unsubscribe?.();
                    ws.data.sessionIds.delete(session.sessionId);
                });
                break;
            }

            case 'attach': {
                // 重连时附加到已存在的会话
                const session = manager.getSession(msg.sessionId);
                if (!session) {
                    ws.send(
                        createMessage({
                            type: 'error',
                            sessionId: msg.sessionId,
                            message: 'Terminal session not found',
                        }),
                    );
                    return;
                }

                // 添加到监控列表
                ws.data.sessionIds.add(msg.sessionId);

                // 获取历史输出
                const history = manager.getHistory(msg.sessionId) ?? [];

                // 发送附加成功消息（包含历史输出）
                ws.send(
                    createMessage({
                        type: 'attached',
                        session,
                        history,
                    }),
                );

                // 监听后续输出（传入 ws 作为标识符，确保独占监听）
                manager.onOutput(msg.sessionId, ws, (data: string) => {
                    ws.send(
                        createMessage({
                            type: 'output',
                            sessionId: msg.sessionId,
                            data,
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
                // 只有用户主动调用 destroy 才真正销毁会话
                if (manager.destroy(msg.sessionId)) {
                    ws.send(
                        createMessage({
                            type: 'destroyed',
                            sessionId: msg.sessionId,
                        }),
                    );
                    ws.data.sessionIds.delete(msg.sessionId);
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
 * 注意：不再自动销毁会话，会话会持续运行直到用户主动删除
 */
export function handleTerminalClose(ws: ServerWebSocket<TerminalWebSocketData>): void {
    // 断联时不销毁会话，会话继续在后台运行
    // 用户重连后可以通过 attach 恢复
}

/**
 * 处理 WebSocket 连接打开
 */
export function handleTerminalOpen(ws: ServerWebSocket<TerminalWebSocketData>): void {
    // 初始化会话集合
    ws.data.sessionIds = new Set();

    // 发送连接成功消息和当前所有会话列表
    ws.send(
        createMessage({
            type: 'list',
            sessions: getTerminalManager().listSessions(),
        }),
    );
}
