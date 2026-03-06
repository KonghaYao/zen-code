/**
 * TerminalToolbar 组件
 * 终端工具栏，提供常用操作按钮
 */

import { motion } from 'motion/react';
import { Plus, Trash2, Wifi, WifiOff, RefreshCw } from '../ui/Icons.js';
import { useTerminalStore } from '../../stores/terminalStore.js';
import type { WebSocketStatus } from './types.js';

interface TerminalToolbarProps {
    onNewTerminal: () => void;
    onCloseTerminal: () => void;
    onClear: () => void;
    onReconnect?: () => void;
}

export function TerminalToolbar({ onNewTerminal, onCloseTerminal, onClear, onReconnect }: TerminalToolbarProps) {
    const { wsStatus, activeSessionId, sessions } = useTerminalStore();

    // WebSocket 状态指示器
    const getWsStatusColor = (status: WebSocketStatus) => {
        switch (status) {
            case 'connected':
                return 'text-green-500';
            case 'connecting':
                return 'text-yellow-500';
            case 'disconnected':
            case 'error':
                return 'text-red-500';
            default:
                return 'text-gray-500';
        }
    };

    const getWsStatusText = (status: WebSocketStatus) => {
        switch (status) {
            case 'connected':
                return '已连接';
            case 'connecting':
                return '连接中...';
            case 'disconnected':
                return '已断开';
            case 'error':
                return '连接错误';
            default:
                return '未知';
        }
    };

    const hasActiveSession = activeSessionId && sessions.length > 0;

    return (
        <div className="flex items-center justify-between px-2 py-2 bg-black/30 border-b border-white/10">
            {/* 左侧操作按钮 */}
            <div className="flex items-center gap-1.5">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onNewTerminal}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                    title="新建终端 (Cmd+T)"
                >
                    <Plus size={16} />
                    <span className="hidden sm:inline text-sm">新建</span>
                </motion.button>

                {hasActiveSession && (
                    <>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onCloseTerminal}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                            title="关闭终端"
                        >
                            <Trash2 size={16} />
                            <span className="hidden sm:inline text-sm">关闭</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClear}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                            title="清空终端"
                        >
                            <RefreshCw size={16} />
                            <span className="hidden sm:inline text-sm">清空</span>
                        </motion.button>
                    </>
                )}
            </div>

            {/* 右侧状态和信息 */}
            <div className="flex items-center gap-2">
                {/* WebSocket 连接状态 */}
                <div className="flex items-center gap-1.5 text-sm">
                    {wsStatus === 'connected' ? (
                        <Wifi size={16} className={getWsStatusColor(wsStatus)} />
                    ) : (
                        <WifiOff size={16} className={getWsStatusColor(wsStatus)} />
                    )}
                    <span className={`hidden sm:inline text-white/60 ${getWsStatusColor(wsStatus)}`}>
                        {getWsStatusText(wsStatus)}
                    </span>
                    {wsStatus !== 'connected' && onReconnect && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onReconnect}
                            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/80 text-xs"
                        >
                            重连
                        </motion.button>
                    )}
                </div>

                {/* 会话计数 - 小屏隐藏 */}
                <div className="hidden sm:block text-sm text-white/40">{sessions.length} 个终端</div>
            </div>
        </div>
    );
}
