/**
 * TerminalWorkspaceTabs
 * 左侧纵向工作区 Tab 栏
 * - 每个 Tab 对应一个工作区/项目
 * - 支持双击重命名
 * - 支持新建/删除 Tab
 * - 快捷键 Cmd+T 新建、Cmd+Shift+W 关闭由父级 useTerminalKeyboard 触发
 */

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Terminal as TerminalIcon } from '../ui/Icons.js';
import { useTerminalStore } from '../../stores/terminalStore.js';
import type { TerminalWorkspace } from './types.js';
import { IconButton } from '../ui/IconButton.js';

export function TerminalWorkspaceTabs() {
    const { workspaces, activeWorkspaceId, setActiveWorkspace, createWorkspace, deleteWorkspace, renameWorkspace } =
        useTerminalStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const handleTabClick = useCallback(
        (id: string) => {
            setActiveWorkspace(id);
        },
        [setActiveWorkspace],
    );

    const handleDoubleClick = useCallback((ws: TerminalWorkspace) => {
        setEditingId(ws.id);
        setEditValue(ws.name);
    }, []);

    const handleRenameComplete = useCallback(() => {
        if (editingId && editValue.trim()) {
            renameWorkspace(editingId, editValue.trim());
        }
        setEditingId(null);
        setEditValue('');
    }, [editingId, editValue, renameWorkspace]);

    const handleClose = useCallback(
        (e: React.MouseEvent, id: string) => {
            e.stopPropagation();
            deleteWorkspace(id);
        },
        [deleteWorkspace],
    );

    return (
        <div
            className="flex flex-col items-stretch gap-1 py-2 px-1.5 bg-black/40 border-r border-white/10 overflow-y-auto"
            style={{ width: 160, minWidth: 160 }}
        >
            <AnimatePresence mode="popLayout">
                {workspaces.map((ws) => (
                    <motion.div
                        key={ws.id}
                        initial={{ opacity: 0, x: -20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className={`
                            group relative flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer
                            transition-all duration-150 select-none
                            ${
                                ws.id === activeWorkspaceId
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'text-white/60 hover:bg-white/10 hover:text-white/80 border border-transparent'
                            }
                        `}
                        onClick={() => handleTabClick(ws.id)}
                        onDoubleClick={() => handleDoubleClick(ws)}
                        title={ws.name}
                    >
                        {/* 激活指示条 */}
                        {ws.id === activeWorkspaceId && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r" />
                        )}

                        <TerminalIcon size={14} className="flex-shrink-0" />

                        {/* 名称 / 编辑框 */}
                        {editingId === ws.id ? (
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
                                className="flex-1 min-w-0 bg-transparent border-none outline-none text-white text-xs"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className="flex-1 min-w-0 truncate text-xs">{ws.name}</span>
                        )}

                        {/* 关闭按钮（多于 1 个时显示） */}
                        {workspaces.length > 1 && (
                            <IconButton
                                onClick={(e) => handleClose(e, ws.id)}
                                title="删除工作区"
                                className="opacity-0 group-hover:opacity-100 w-5 h-5 flex-shrink-0 hover:!bg-red-500/30 !text-white/50 hover:!text-white"
                            >
                                <X size={12} />
                            </IconButton>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* 新建工作区按钮 */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => createWorkspace()}
                className="flex items-center justify-center gap-1.5 mt-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/40 hover:text-white/70 transition-colors text-xs"
                title="新建工作区 (Cmd+T)"
            >
                <Plus size={14} />
                <span>新建</span>
            </motion.button>
        </div>
    );
}
