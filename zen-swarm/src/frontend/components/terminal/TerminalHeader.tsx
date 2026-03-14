/**
 * TerminalHeader
 * 右侧顶部信息栏，显示当前活跃 pane 的 cwd、连接状态、运行命令
 */

import { useTerminalStore } from '../../stores/terminalStore.js';
import { collectLeafPanes } from '../../stores/terminalStore.js';
import type { WebSocketStatus } from './types.js';

function StatusDot({ status }: { status: WebSocketStatus }) {
    const colorMap: Record<WebSocketStatus, string> = {
        connected: 'bg-green-400',
        connecting: 'bg-yellow-400 animate-pulse',
        disconnected: 'bg-red-400',
        error: 'bg-red-500',
    };
    const labelMap: Record<WebSocketStatus, string> = {
        connected: 'active',
        connecting: 'connecting',
        disconnected: 'disconnected',
        error: 'error',
    };
    return (
        <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${colorMap[status]}`} />
            <span className={status === 'connected' ? 'text-green-400' : 'text-red-400'}>{labelMap[status]}</span>
        </div>
    );
}

export function TerminalHeader() {
    const { workspaces, activeWorkspaceId, sessions, wsStatus } = useTerminalStore();

    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    const activePaneId = ws?.activePaneId;

    // 找到当前激活 pane 绑定的 session
    const rootPane = ws?.layout.panes[0];
    const leaves = rootPane ? collectLeafPanes(rootPane) : [];
    const activePane = leaves.find((p) => p.id === activePaneId);
    const session = sessions.find((s) => s.sessionId === activePane?.sessionId);

    const cwd = session?.cwd ?? '—';
    const pid = session?.pid;

    return (
        <div className="flex items-center gap-4 px-4 py-2 bg-black/50 border-b border-white/10 text-xs text-white/60 flex-shrink-0">
            {/* CWD */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-white/30 flex-shrink-0">cwd</span>
                <span className="truncate text-white/80 font-mono" title={cwd}>
                    {cwd}
                </span>
            </div>

            {/* PID */}
            {pid != null && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-white/30">pid</span>
                    <span className="font-mono text-white/60">{pid}</span>
                </div>
            )}

            {/* 大小 */}
            {session && (
                <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-white/30">size</span>
                    <span className="font-mono text-white/60">
                        {session.cols}×{session.rows}
                    </span>
                </div>
            )}

            {/* 连接状态 */}
            <div className="flex-shrink-0">
                <StatusDot status={wsStatus} />
            </div>

            {/* 退出标记 */}
            {session?.exited && <span className="text-yellow-400 flex-shrink-0">已退出</span>}
        </div>
    );
}
