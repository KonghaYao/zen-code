/**
 * TerminalToolbar 组件
 * 纯 icon button 工具栏
 */

import { motion } from 'motion/react';
import { Plus, Trash2, Wifi, WifiOff, RefreshCw, PanelsLeftRight, PanelsTopBottom } from '../ui/Icons.js';
import { useTerminalStore } from '../../stores/terminalStore.js';
import type { WebSocketStatus } from './types.js';

interface TerminalToolbarProps {
    onNewTerminal: () => void;
    onCloseTerminal: () => void;
    onClear: () => void;
    onReconnect?: () => void;
    onSplitVertical?: () => void;
    onSplitHorizontal?: () => void;
}

function IconBtn({
    onClick,
    title,
    children,
    variant = 'default',
    disabled,
}: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    variant?: 'default' | 'blue' | 'red';
    disabled?: boolean;
}) {
    const colorMap = {
        default: 'text-white/50 hover:text-white/90 hover:bg-white/10',
        blue: 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20',
        red: 'text-red-400 hover:text-red-300 hover:bg-red-500/20',
    };
    return (
        <motion.button
            whileHover={disabled ? undefined : { scale: 1.1 }}
            whileTap={disabled ? undefined : { scale: 0.9 }}
            onClick={onClick}
            title={title}
            disabled={disabled}
            style={{ padding: 0 }}
            className={`
                flex items-center justify-center w-7 h-7 rounded-md transition-colors
                ${colorMap[variant]}
                ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            {children}
        </motion.button>
    );
}

const wsStatusColor: Record<WebSocketStatus, string> = {
    connected: 'text-green-400',
    connecting: 'text-yellow-400',
    disconnected: 'text-red-400',
    error: 'text-red-500',
};

const wsStatusLabel: Record<WebSocketStatus, string> = {
    connected: '已连接',
    connecting: '连接中...',
    disconnected: '已断开',
    error: '连接错误',
};

export function TerminalToolbar({
    onNewTerminal,
    onCloseTerminal,
    onClear,
    onReconnect,
    onSplitVertical,
    onSplitHorizontal,
}: TerminalToolbarProps) {
    const { wsStatus, activeSessionId, sessions } = useTerminalStore();
    const paneCount = useTerminalStore((s) => s.getPaneCount());

    const hasActiveSession = activeSessionId && sessions.length > 0;
    const canSplit = paneCount < 4;

    return (
        <div className="flex items-center justify-between px-2 py-1.5 bg-black/30 border-b border-white/10">
            {/* 左侧操作按钮组 */}
            <div className="flex items-center gap-0.5">
                {/* 新建终端 */}
                <IconBtn onClick={onNewTerminal} title="新建终端" variant="blue">
                    <Plus size={15} />
                </IconBtn>

                {/* 分割线 */}
                <div className="w-px h-4 bg-white/10 mx-1" />

                {/* 垂直分割（左右） */}
                <IconBtn
                    onClick={onSplitVertical ?? (() => {})}
                    title="垂直分割（左右）"
                    disabled={!canSplit || !onSplitVertical}
                >
                    <PanelsLeftRight size={15} />
                </IconBtn>

                {/* 水平分割（上下） */}
                <IconBtn
                    onClick={onSplitHorizontal ?? (() => {})}
                    title="水平分割（上下）"
                    disabled={!canSplit || !onSplitHorizontal}
                >
                    <PanelsTopBottom size={15} />
                </IconBtn>

                {hasActiveSession && (
                    <>
                        <div className="w-px h-4 bg-white/10 mx-1" />

                        {/* 清空 */}
                        <IconBtn onClick={onClear} title="清空终端">
                            <RefreshCw size={15} />
                        </IconBtn>

                        {/* 关闭当前 pane */}
                        <IconBtn onClick={onCloseTerminal} title="关闭当前面板" variant="red">
                            <Trash2 size={15} />
                        </IconBtn>
                    </>
                )}
            </div>

            {/* 右侧：连接状态 */}
            <div className="flex items-center gap-1.5">
                {wsStatus === 'connected' ? (
                    <Wifi size={14} className={wsStatusColor[wsStatus]} />
                ) : (
                    <WifiOff size={14} className={wsStatusColor[wsStatus]} />
                )}
                <span className={`hidden sm:inline text-xs ${wsStatusColor[wsStatus]}`}>{wsStatusLabel[wsStatus]}</span>
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
        </div>
    );
}
