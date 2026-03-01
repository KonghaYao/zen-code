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

// 终端默认尺寸
const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;

export function TerminalView() {
    const terminalRef = useRef<TerminalRef>(null);

    const { wsStatus, createSession, destroySession, connect, sessions, activeSessionId } = useTerminal();

    // 新建终端
    const handleNewTerminal = useCallback(() => {
        if (wsStatus !== 'connected') {
            console.warn('WebSocket not connected, cannot create terminal');
            return;
        }
        createSession(DEFAULT_COLS, DEFAULT_ROWS);
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
            <div className="flex-1 relative overflow-hidden">
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

            {/* 底部状态栏 */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-black/30 border-t border-white/10 text-xs text-white/40">
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
