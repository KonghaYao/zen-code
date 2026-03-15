/**
 * TerminalGrid
 * 平铺布局容器，按 panes 数组渲染终端面板
 *
 * 布局规则（按 panes.length）：
 *   1 个 pane: 全屏
 *   2 个 pane: 左右各半（grid-cols-2）
 *   3 个 pane: 左半(row-span-2) + 右上 + 右下（grid-cols-2, grid-rows-2）
 *   4 个 pane: 2×2（grid-cols-2, grid-rows-2）
 */

import { useCallback } from 'react';
import { TerminalPane } from './TerminalPane.js';
import { useTerminalStore } from '../../stores/terminalStore.js';

interface TerminalGridProps {
    onCreateSession: (paneId: string) => void;
}

export function TerminalGrid({ onCreateSession }: TerminalGridProps) {
    const { workspaces, activeWorkspaceId, setActivePaneInWorkspace } = useTerminalStore();

    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    const panes = ws?.panes ?? [];
    const activePaneId = ws?.activePaneId ?? '';

    const handleActivate = useCallback(
        (paneId: string) => {
            setActivePaneInWorkspace(activeWorkspaceId, paneId);
        },
        [activeWorkspaceId, setActivePaneInWorkspace],
    );

    if (panes.length === 0) {
        return <div className="flex items-center justify-center h-full text-white/30 text-sm">无终端面板</div>;
    }

    // 1 个 pane：全屏
    if (panes.length === 1) {
        return (
            <div className="h-full w-full overflow-hidden">
                <TerminalPane
                    pane={panes[0]}
                    workspaceId={activeWorkspaceId}
                    isActive={panes[0].id === activePaneId}
                    onActivate={handleActivate}
                    onCreateSession={onCreateSession}
                />
            </div>
        );
    }

    // 2 个 pane：左右各半
    if (panes.length === 2) {
        return (
            <div className="h-full w-full grid grid-cols-2 overflow-hidden">
                {panes.map((pane, i) => (
                    <div
                        key={pane.id}
                        className={`min-w-0 overflow-hidden${i === 0 ? ' border-r border-white/10' : ''}`}
                    >
                        <TerminalPane
                            pane={pane}
                            workspaceId={activeWorkspaceId}
                            isActive={pane.id === activePaneId}
                            onActivate={handleActivate}
                            onCreateSession={onCreateSession}
                        />
                    </div>
                ))}
            </div>
        );
    }

    // 3 个 pane：左半(row-span-2) + 右上 + 右下
    if (panes.length === 3) {
        return (
            <div className="h-full w-full grid grid-cols-2 grid-rows-2 overflow-hidden">
                {/* 左侧：占满两行 */}
                <div className="row-span-2 min-w-0 overflow-hidden border-r border-white/10">
                    <TerminalPane
                        pane={panes[0]}
                        workspaceId={activeWorkspaceId}
                        isActive={panes[0].id === activePaneId}
                        onActivate={handleActivate}
                        onCreateSession={onCreateSession}
                    />
                </div>
                {/* 右上 */}
                <div className="min-w-0 overflow-hidden border-b border-white/10">
                    <TerminalPane
                        pane={panes[1]}
                        workspaceId={activeWorkspaceId}
                        isActive={panes[1].id === activePaneId}
                        onActivate={handleActivate}
                        onCreateSession={onCreateSession}
                    />
                </div>
                {/* 右下 */}
                <div className="min-w-0 overflow-hidden">
                    <TerminalPane
                        pane={panes[2]}
                        workspaceId={activeWorkspaceId}
                        isActive={panes[2].id === activePaneId}
                        onActivate={handleActivate}
                        onCreateSession={onCreateSession}
                    />
                </div>
            </div>
        );
    }

    // 4 个 pane：2×2
    return (
        <div className="h-full w-full grid grid-cols-2 grid-rows-2 overflow-hidden">
            {panes.map((pane, i) => {
                const isLeft = i % 2 === 0;
                const isTop = i < 2;
                return (
                    <div
                        key={pane.id}
                        className={`min-w-0 overflow-hidden${isLeft ? ' border-r border-white/10' : ''}${isTop ? ' border-b border-white/10' : ''}`}
                    >
                        <TerminalPane
                            pane={pane}
                            workspaceId={activeWorkspaceId}
                            isActive={pane.id === activePaneId}
                            onActivate={handleActivate}
                            onCreateSession={onCreateSession}
                        />
                    </div>
                );
            })}
        </div>
    );
}
