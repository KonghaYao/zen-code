/**
 * TerminalView 主视图组件（重构版）
 *
 * 布局：
 *   ┌──────────┬───────────────────────────────────┐
 *   │ 左侧 Tab  │ Header (cwd / status)              │
 *   │  工作区   ├───────────────────────────────────┤
 *   │  列表     │ TerminalGrid (最多 2×2 分割)       │
 *   └──────────┴───────────────────────────────────┘
 *
 * 关键特性：
 * - 每个工作区 Tab 包含独立的网格布局
 * - 快捷键 Cmd+D / Cmd+Shift+D 分割 pane
 * - 会话持久化：关闭浏览器/断联不会销毁会话
 */

import { useCallback, useRef } from 'react';
import { TerminalWorkspaceTabs } from './TerminalWorkspaceTabs.js';
import { TerminalHeader } from './TerminalHeader.js';
import { TerminalGrid } from './TerminalGrid.js';
import { useTerminalKeyboard } from './useTerminalKeyboard.js';
import { useTerminal } from '../../hooks/useTerminal.js';
import { useTerminalStore, collectLeafPanes } from '../../stores/terminalStore.js';
import { TerminalToolbar } from './TerminalToolbar.js';

// 终端默认尺寸（fallback）
const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const FONT_SIZE = 14;
const FONT_FAMILY = 'Menlo, Monaco, "Courier New", monospace';
const TERMINAL_PADDING = 8;
const LINE_HEIGHT_RATIO = 1.0;

function measureTerminalDimensions(container: HTMLElement): { cols: number; rows: number } {
    try {
        const rect = container.getBoundingClientRect();
        const containerW = rect.width - TERMINAL_PADDING * 2;
        const containerH = rect.height - TERMINAL_PADDING * 2;
        if (containerW <= 0 || containerH <= 0) return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };
        ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        const charW = ctx.measureText('W').width;
        const charH = FONT_SIZE * LINE_HEIGHT_RATIO;
        return {
            cols: Math.max(1, Math.floor(containerW / charW)),
            rows: Math.max(1, Math.floor(containerH / charH)),
        };
    } catch {
        return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };
    }
}

export function TerminalView() {
    const terminalAreaRef = useRef<HTMLDivElement>(null);

    const { wsStatus, createSession, destroySession, connect } = useTerminal();
    const { activeWorkspaceId, setPaneSession, splitPane, closePane, getActiveWorkspace, getPaneCount } =
        useTerminalStore();

    // 为指定 pane 新建 terminal session
    const handleCreateSession = useCallback(
        (paneId: string) => {
            if (wsStatus !== 'connected') return;
            const { cols, rows } = terminalAreaRef.current
                ? measureTerminalDimensions(terminalAreaRef.current)
                : { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };
            createSession(cols, rows, undefined, (sessionId: string) => {
                setPaneSession(activeWorkspaceId, paneId, sessionId);
            });
        },
        [wsStatus, createSession, setPaneSession, activeWorkspaceId],
    );

    // 工具栏：新建终端 → 在当前激活 pane 创建（若已有 session 则先分割再建）
    const handleNewTerminal = useCallback(() => {
        const ws = getActiveWorkspace();
        if (!ws) return;
        const rootPane = ws.layout.panes[0];
        const leaves = rootPane ? collectLeafPanes(rootPane) : [];
        const activePane = leaves.find((p) => p.id === ws.activePaneId);
        if (!activePane) return;

        if (activePane.sessionId == null) {
            handleCreateSession(activePane.id);
        } else if (getPaneCount() < 4) {
            splitPane(activePane.id, 'vertical');
            // 等 store 更新完成后再在新 pane 上创建 session
            setTimeout(() => {
                const freshWs = useTerminalStore.getState().workspaces.find((w) => w.id === activeWorkspaceId);
                if (!freshWs) return;
                const freshRoot = freshWs.layout.panes[0];
                const freshLeaves = freshRoot ? collectLeafPanes(freshRoot) : [];
                const newActivePane = freshLeaves.find((p) => p.id === freshWs.activePaneId);
                if (newActivePane && newActivePane.sessionId == null) {
                    handleCreateSession(newActivePane.id);
                }
            }, 0);
        }
    }, [getActiveWorkspace, handleCreateSession, getPaneCount, splitPane, activeWorkspaceId]);

    // 工具栏：关闭当前激活 pane 的 session（并移除 pane）
    const handleCloseTerminal = useCallback(() => {
        const ws = getActiveWorkspace();
        if (!ws) return;
        const rootPane = ws.layout.panes[0];
        const leaves = rootPane ? collectLeafPanes(rootPane) : [];
        const activePane = leaves.find((p) => p.id === ws.activePaneId);
        if (!activePane) return;
        if (activePane.sessionId) {
            destroySession(activePane.sessionId);
            setPaneSession(activeWorkspaceId, activePane.id, null);
        }
        if (leaves.length > 1) {
            closePane(activePane.id);
        }
    }, [getActiveWorkspace, destroySession, setPaneSession, activeWorkspaceId, closePane]);

    // 清空：暂时 noop（clear 需要通过 TerminalGrid → TerminalPane → Terminal ref 传递，可后续扩展）
    const handleClear = useCallback(() => {
        // TODO: forward clear to active pane's Terminal ref
    }, []);

    // 垂直分割（左右）当前激活 pane
    const handleSplitVertical = useCallback(() => {
        const ws = getActiveWorkspace();
        if (!ws || getPaneCount() >= 4) return;
        splitPane(ws.activePaneId, 'vertical');
    }, [getActiveWorkspace, getPaneCount, splitPane]);

    // 水平分割（上下）当前激活 pane
    const handleSplitHorizontal = useCallback(() => {
        const ws = getActiveWorkspace();
        if (!ws || getPaneCount() >= 4) return;
        splitPane(ws.activePaneId, 'horizontal');
    }, [getActiveWorkspace, getPaneCount, splitPane]);

    // 全局快捷键（仅保留 pane 导航 + 工作区管理，分割改为按钮）
    useTerminalKeyboard({ onCreateSession: handleCreateSession });

    return (
        <div className="flex h-full w-full bg-[#1e1e1e] rounded-lg overflow-hidden">
            {/* 左侧工作区 Tab 栏（固定 160px） */}
            <TerminalWorkspaceTabs />

            {/* 右侧内容区 */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* 工具栏 */}
                <TerminalToolbar
                    onNewTerminal={handleNewTerminal}
                    onCloseTerminal={handleCloseTerminal}
                    onClear={handleClear}
                    onReconnect={connect}
                    onSplitVertical={handleSplitVertical}
                    onSplitHorizontal={handleSplitHorizontal}
                />

                {/* Header：cwd / 连接状态 */}
                <TerminalHeader />

                {/* 网格终端区域 */}
                <div ref={terminalAreaRef} className="flex-1 min-h-0 overflow-hidden relative">
                    {wsStatus !== 'connected' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/60">
                            <div className="text-5xl opacity-40">⚠️</div>
                            <div className="text-lg">终端服务未连接</div>
                            <div className="text-sm text-white/40">会话将在重连后恢复</div>
                            <button
                                onClick={connect}
                                className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                            >
                                重新连接
                            </button>
                        </div>
                    ) : (
                        <TerminalGrid onCreateSession={handleCreateSession} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default TerminalView;
