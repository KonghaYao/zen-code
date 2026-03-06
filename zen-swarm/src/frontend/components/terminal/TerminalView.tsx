/**
 * TerminalView 主视图组件
 * 整合终端标签、工具栏和终端实例
 *
 * 关键特性：
 * - 终端会话持久化：关闭浏览器/断联不会销毁会话
 * - 重连恢复：重连后自动恢复历史输出
 * - 用户主动删除：只有点击关闭按钮才会销毁会话
 * - 不自动创建：刷新页面不会新建终端，需手动点击"新建"
 */

import { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, TerminalRef } from './Terminal.js';
import { TerminalTabs } from './TerminalTabs.js';
import { TerminalToolbar } from './TerminalToolbar.js';
import { useTerminal } from '../../hooks/useTerminal.js';

// 终端默认尺寸（fallback）
const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;

// 与 Terminal.tsx 保持一致的字体配置
const FONT_SIZE = 14;
const FONT_FAMILY = 'Menlo, Monaco, "Courier New", monospace';
// 终端内边距（Terminal.tsx 容器有 padding: 8px）
const TERMINAL_PADDING = 8;
// xterm.js 默认 lineHeight=1.0，行高等于 fontSize
// 经验上加约 1px 的行间距与实际渲染更接近
const LINE_HEIGHT_RATIO = 1.0;

/**
 * 用 canvas 测量单个字符的宽高，再结合容器像素尺寸计算 cols/rows。
 * 避免依赖 xterm.js 内部 API（_renderService.dimensions 在隐藏容器中为 undefined）。
 */
function measureTerminalDimensions(container: HTMLElement): { cols: number; rows: number } {
    try {
        const rect = container.getBoundingClientRect();
        const containerW = rect.width - TERMINAL_PADDING * 2;
        const containerH = rect.height - TERMINAL_PADDING * 2;

        if (containerW <= 0 || containerH <= 0) {
            return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };
        }

        // 用 canvas 测量等宽字体的单个字符宽高
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };

        ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        const charW = ctx.measureText('W').width;
        // canvas 无法直接测行高，使用与 xterm.js 配置一致的 lineHeight 倍数
        const charH = FONT_SIZE * LINE_HEIGHT_RATIO;

        const cols = Math.max(1, Math.floor(containerW / charW));
        const rows = Math.max(1, Math.floor(containerH / charH));
        return { cols, rows };
    } catch {
        return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };
    }
}

export function TerminalView() {
    const terminalRef = useRef<TerminalRef>(null);
    // 用于测量终端区域真实尺寸的容器 ref
    const terminalAreaRef = useRef<HTMLDivElement>(null);

    const { wsStatus, createSession, destroySession, connect, sessions, activeSessionId } = useTerminal();

    // 新建终端 —— 先测量容器真实 cols/rows，再创建 PTY，避免 80×24 硬编码问题
    const handleNewTerminal = useCallback(() => {
        if (wsStatus !== 'connected') {
            console.warn('WebSocket not connected, cannot create terminal');
            return;
        }
        const { cols, rows } = terminalAreaRef.current
            ? measureTerminalDimensions(terminalAreaRef.current)
            : { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };
        createSession(cols, rows);
    }, [wsStatus, createSession]);

    // 关闭终端（用户主动删除 → 销毁会话）
    const handleCloseTerminal = useCallback(
        (sessionId: string) => {
            destroySession(sessionId);
        },
        [destroySession],
    );

    // 清空当前终端
    const handleClear = useCallback(() => {
        terminalRef.current?.clear();
    }, []);

    // 获取当前激活的会话
    const activeSession = sessions.find((s) => s.sessionId === activeSessionId);

    return (
        <div className="flex flex-col h-full w-full bg-[#1e1e1e] rounded-lg overflow-hidden">
            {/* 工具栏 */}
            <TerminalToolbar
                onNewTerminal={handleNewTerminal}
                onCloseTerminal={() => activeSessionId && handleCloseTerminal(activeSessionId)}
                onClear={handleClear}
                onReconnect={connect}
            />

            {/* 标签栏 - 关闭按钮会销毁会话 */}
            <TerminalTabs onNewTerminal={handleNewTerminal} onCloseTerminal={handleCloseTerminal} />

            {/* 终端区域 */}
            <div ref={terminalAreaRef} className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait">
                    {activeSession ? (
                        <motion.div
                            key={activeSession.sessionId}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0"
                        >
                            {/* Terminal 组件会自动处理重连恢复 */}
                            <Terminal sessionId={activeSession.sessionId} ref={terminalRef} />
                        </motion.div>
                    ) : wsStatus !== 'connected' ? (
                        <motion.div
                            key="disconnected"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/60"
                        >
                            <div className="text-6xl opacity-40">⚠️</div>
                            <div className="text-lg">终端服务未连接</div>
                            <div className="text-sm text-white/40">会话将在重连后恢复</div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={connect}
                                className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                            >
                                重新连接
                            </motion.button>
                        </motion.div>
                    ) : sessions.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/60"
                        >
                            <div className="text-6xl opacity-40">💻</div>
                            <div className="text-lg">没有打开的终端</div>
                            <div className="text-sm text-white/40">点击下方按钮或工具栏 + 新建终端</div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleNewTerminal}
                                className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                            >
                                新建终端
                            </motion.button>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* 底部状态栏 - 小屏幕隐藏 */}
            <div className="hidden md:flex items-center justify-between px-4 py-1.5 bg-black/30 border-t border-white/10 text-xs text-white/40">
                <div className="flex items-center gap-4">
                    {activeSession && (
                        <>
                            <span>PID: {activeSession.pid}</span>
                            <span>
                                大小: {activeSession.cols}×{activeSession.rows}
                            </span>
                            <span>目录: {activeSession.cwd}</span>
                            {activeSession.exited && <span className="text-yellow-400">已退出</span>}
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span>会话持久化 | 关闭浏览器不会终止进程</span>
                </div>
            </div>
        </div>
    );
}

export default TerminalView;
