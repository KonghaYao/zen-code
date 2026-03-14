/**
 * TerminalPane
 * 单个 terminal 面板，包裹 Terminal.tsx
 * 负责：点击激活、空 pane 提示（session 未创建时）
 */

import { useCallback } from 'react';
import { Terminal } from './Terminal.js';
import { useTerminalStore } from '../../stores/terminalStore.js';
import type { TerminalPane as TerminalPaneType } from './types.js';

interface TerminalPaneProps {
    pane: TerminalPaneType;
    workspaceId: string;
    isActive: boolean;
    onActivate: (paneId: string) => void;
    onCreateSession: (paneId: string) => void;
}

export function TerminalPane({ pane, workspaceId, isActive, onActivate, onCreateSession }: TerminalPaneProps) {
    const { wsStatus, setPaneSession } = useTerminalStore();

    const handleClick = useCallback(() => {
        if (!isActive) {
            onActivate(pane.id);
        }
    }, [isActive, onActivate, pane.id]);

    // 当 attach 失败（服务端找不到该 session）时，清除 pane 绑定，显示空终端
    const handleAttachError = useCallback(
        (_sessionId: string) => {
            setPaneSession(workspaceId, pane.id, null);
        },
        [setPaneSession, workspaceId, pane.id],
    );

    return (
        <div
            className={`
                relative h-full w-full overflow-hidden
                transition-all duration-150
                ${isActive ? 'ring-1 ring-inset ring-blue-500/50' : 'ring-1 ring-inset ring-white/5'}
            `}
            onClick={handleClick}
        >
            {pane.sessionId ? (
                <Terminal sessionId={pane.sessionId} onAttachError={handleAttachError} />
            ) : (
                /* 空 pane —— 等待 session 创建 */
                <div className="flex flex-col items-center justify-center h-full gap-3 text-white/40 bg-[#1e1e1e]">
                    <span className="text-4xl opacity-30">💻</span>
                    <span className="text-sm">空终端</span>
                    {wsStatus === 'connected' ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onCreateSession(pane.id);
                            }}
                            className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                        >
                            新建终端
                        </button>
                    ) : (
                        <span className="text-xs text-red-400/70">未连接</span>
                    )}
                </div>
            )}

            {/* 激活边框高亮覆盖层 */}
            {isActive && (
                <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-blue-500/40 rounded-[1px]" />
            )}
        </div>
    );
}
