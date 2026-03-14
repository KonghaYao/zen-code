/**
 * TerminalTabs 组件
 * 多终端标签页管理
 *
 * 关键特性：
 * - 关闭标签会真正销毁终端会话（杀死进程）
 * - 断联/关闭浏览器不会销毁会话，只有用户点击关闭才会
 */

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Terminal as TerminalIcon } from '../ui/Icons.js';
import { useTerminalStore } from '../../stores/terminalStore.js';
import type { TerminalSessionState } from './types.js';
import { IconButton } from '../ui/IconButton.js';

interface TerminalTabsProps {
    onNewTerminal: () => void;
    onCloseTerminal: (sessionId: string) => void;
}

export function TerminalTabs({ onNewTerminal, onCloseTerminal }: TerminalTabsProps) {
    const { sessions, activeSessionId, setActiveSession, renameSession } = useTerminalStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    // 切换标签
    const handleTabClick = useCallback(
        (sessionId: string) => {
            setActiveSession(sessionId);
        },
        [setActiveSession],
    );

    // 双击重命名
    const handleDoubleClick = useCallback((session: TerminalSessionState) => {
        setEditingId(session.sessionId);
        setEditValue(session.name);
    }, []);

    // 完成重命名
    const handleRenameComplete = useCallback(() => {
        if (editingId && editValue.trim()) {
            renameSession(editingId, editValue.trim());
        }
        setEditingId(null);
        setEditValue('');
    }, [editingId, editValue, renameSession]);

    // 关闭标签（销毁会话）
    const handleClose = useCallback(
        (e: React.MouseEvent, sessionId: string) => {
            e.stopPropagation();
            // 用户主动点击关闭 → 销毁会话
            // 注意：这只是前端发起的关闭请求，会杀死后端进程
            onCloseTerminal(sessionId);
        },
        [onCloseTerminal],
    );

    if (sessions.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-1 px-2 py-1 bg-black/40 border-b border-white/10">
            <AnimatePresence mode="popLayout">
                {sessions.map((session) => (
                    <motion.div
                        key={session.sessionId}
                        initial={{ opacity: 0, scale: 0.8, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: 20 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className={`
                            group flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer
                            transition-all duration-200 min-w-[120px] max-w-[200px]
                            ${
                                session.sessionId === activeSessionId
                                    ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500'
                                    : 'bg-black/30 text-white/60 hover:bg-black/50 hover:text-white/80'
                            }
                        `}
                        onClick={() => handleTabClick(session.sessionId)}
                        onDoubleClick={() => handleDoubleClick(session)}
                    >
                        {/* 终端图标 */}
                        <TerminalIcon size={14} className="flex-shrink-0" />

                        {/* 标签名称 */}
                        {editingId === session.sessionId ? (
                            <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleRenameComplete}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameComplete();
                                    if (e.key === 'Escape') {
                                        setEditingId(null);
                                        setEditValue('');
                                    }
                                }}
                                className="flex-1 bg-transparent border-none outline-none text-white text-sm"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className="flex-1 truncate text-sm">{session.name}</span>
                        )}

                        {/* 关闭按钮 - 点击会销毁终端会话 */}
                        <IconButton
                            onClick={(e) => handleClose(e, session.sessionId)}
                            title="关闭终端（会终止进程）"
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 hover:!bg-red-500/30 !text-white/60 hover:!text-white"
                        >
                            <X size={14} />
                        </IconButton>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* 新建按钮 */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onNewTerminal}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/30 hover:bg-black/50 text-white/60 hover:text-white transition-colors"
                title="新建终端"
            >
                <Plus size={16} />
            </motion.button>
        </div>
    );
}
