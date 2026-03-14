/**
 * TerminalGrid
 * 网格布局容器，递归渲染 TerminalPane 树
 * 支持 horizontal / vertical 分割，最多 2×2 (4个面板)
 */

import { useCallback } from 'react';
import { TerminalPane } from './TerminalPane.js';
import { useTerminalStore } from '../../stores/terminalStore.js';
import type { TerminalPane as TerminalPaneType } from './types.js';

interface PaneNodeProps {
    pane: TerminalPaneType;
    workspaceId: string;
    activePaneId: string;
    onActivate: (paneId: string) => void;
    onCreateSession: (paneId: string) => void;
}

/** 递归渲染 pane 节点 */
function PaneNode({ pane, workspaceId, activePaneId, onActivate, onCreateSession }: PaneNodeProps) {
    if (pane.split) {
        const { direction, children } = pane.split;
        const isHorizontal = direction === 'horizontal';
        return (
            <div className={`flex ${isHorizontal ? 'flex-col' : 'flex-row'} h-full w-full`}>
                {/* 第一个子节点 */}
                <div className={isHorizontal ? 'flex-1 min-h-0' : 'flex-1 min-w-0'}>
                    <PaneNode
                        pane={children[0]}
                        workspaceId={workspaceId}
                        activePaneId={activePaneId}
                        onActivate={onActivate}
                        onCreateSession={onCreateSession}
                    />
                </div>

                {/* 分割线 */}
                <div
                    className={`
                        ${isHorizontal ? 'h-px w-full' : 'w-px h-full'}
                        bg-white/10 flex-shrink-0
                    `}
                />

                {/* 第二个子节点 */}
                <div className={isHorizontal ? 'flex-1 min-h-0' : 'flex-1 min-w-0'}>
                    <PaneNode
                        pane={children[1]}
                        workspaceId={workspaceId}
                        activePaneId={activePaneId}
                        onActivate={onActivate}
                        onCreateSession={onCreateSession}
                    />
                </div>
            </div>
        );
    }

    // 叶子节点 → 真正的 terminal pane
    return (
        <TerminalPane
            pane={pane}
            workspaceId={workspaceId}
            isActive={pane.id === activePaneId}
            onActivate={onActivate}
            onCreateSession={onCreateSession}
        />
    );
}

interface TerminalGridProps {
    onCreateSession: (paneId: string) => void;
}

export function TerminalGrid({ onCreateSession }: TerminalGridProps) {
    const { workspaces, activeWorkspaceId, setActivePaneInWorkspace } = useTerminalStore();

    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    const rootPane = ws?.layout.panes[0];
    const activePaneId = ws?.activePaneId ?? '';

    const handleActivate = useCallback(
        (paneId: string) => {
            setActivePaneInWorkspace(activeWorkspaceId, paneId);
        },
        [activeWorkspaceId, setActivePaneInWorkspace],
    );

    if (!rootPane) {
        return <div className="flex items-center justify-center h-full text-white/30 text-sm">无终端面板</div>;
    }

    return (
        <div className="h-full w-full overflow-hidden">
            <PaneNode
                pane={rootPane}
                workspaceId={activeWorkspaceId}
                activePaneId={activePaneId}
                onActivate={handleActivate}
                onCreateSession={onCreateSession}
            />
        </div>
    );
}
