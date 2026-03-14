/**
 * useTerminalKeyboard
 * 绑定终端快捷键（分割改为按钮，此处只保留导航 + 工作区管理）：
 *   Cmd+W         — 关闭当前 pane
 *   Cmd+[         — 切换到左侧 pane
 *   Cmd+]         — 切换到右侧 pane
 *   Cmd+↑         — 切换到上方 pane
 *   Cmd+↓         — 切换到下方 pane
 *   Cmd+T         — 新建工作区
 *   Cmd+Shift+W   — 关闭当前工作区
 */

import { useEffect } from 'react';
import { useTerminalStore, collectLeafPanes } from '../../stores/terminalStore.js';

interface UseTerminalKeyboardOptions {
    /** 创建一个新 terminal session 并绑定到当前 pane */
    onCreateSession: (paneId: string) => void;
}

export function useTerminalKeyboard({ onCreateSession }: UseTerminalKeyboardOptions) {
    const { workspaces, activeWorkspaceId, setActivePaneInWorkspace, closePane, createWorkspace, deleteWorkspace } =
        useTerminalStore();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const meta = e.metaKey || e.ctrlKey; // Mac: Cmd; Win/Linux: Ctrl
            if (!meta) return;

            const ws = workspaces.find((w) => w.id === activeWorkspaceId);
            if (!ws) return;

            const rootPane = ws.layout.panes[0];
            const leaves = rootPane ? collectLeafPanes(rootPane) : [];
            const activePaneId = ws.activePaneId;
            const activeIdx = leaves.findIndex((p) => p.id === activePaneId);

            // Cmd+T — 新建工作区
            if (e.key === 't' && !e.shiftKey) {
                e.preventDefault();
                createWorkspace();
                return;
            }

            // Cmd+Shift+W — 关闭当前工作区
            if (e.key === 'W' && e.shiftKey) {
                e.preventDefault();
                deleteWorkspace(activeWorkspaceId);
                return;
            }

            // Cmd+W — 关闭当前 pane（至少保留 1 个）
            if (e.key === 'w' && !e.shiftKey) {
                e.preventDefault();
                if (leaves.length > 1) {
                    closePane(activePaneId);
                }
                return;
            }

            // Cmd+[ — 切换到左侧 pane（索引 - 1）
            if (e.key === '[') {
                e.preventDefault();
                if (activeIdx > 0) {
                    setActivePaneInWorkspace(activeWorkspaceId, leaves[activeIdx - 1].id);
                }
                return;
            }

            // Cmd+] — 切换到右侧 pane（索引 + 1）
            if (e.key === ']') {
                e.preventDefault();
                if (activeIdx < leaves.length - 1) {
                    setActivePaneInWorkspace(activeWorkspaceId, leaves[activeIdx + 1].id);
                }
                return;
            }

            // Cmd+↑ — 切换到上方 pane（简单实现：索引 - 1，与 [ 等效）
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (activeIdx > 0) {
                    setActivePaneInWorkspace(activeWorkspaceId, leaves[activeIdx - 1].id);
                }
                return;
            }

            // Cmd+↓ — 切换到下方 pane（索引 + 1）
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (activeIdx < leaves.length - 1) {
                    setActivePaneInWorkspace(activeWorkspaceId, leaves[activeIdx + 1].id);
                }
                return;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [
        workspaces,
        activeWorkspaceId,
        setActivePaneInWorkspace,
        closePane,
        createWorkspace,
        deleteWorkspace,
        onCreateSession,
    ]);
}
