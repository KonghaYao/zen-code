/**
 * 进程工具栏组件
 */

import type { MonitorView } from './types.js';

interface ProcessToolbarProps {
    viewMode: MonitorView;
    onViewModeChange: (mode: MonitorView) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onRefresh: () => void;
    isLoading: boolean;
}

export function ProcessToolbar({
    viewMode,
    onViewModeChange,
    searchQuery,
    onSearchChange,
    onRefresh,
    isLoading,
}: ProcessToolbarProps) {
    return (
        <div className="flex items-center gap-4 p-4 bg-white border-b border-border-subtle">
            {/* 搜索框 */}
            <div className="relative flex-1">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="搜索进程..."
                    className="w-full px-3 py-2 pl-9 text-sm border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">🔍</span>
            </div>

            {/* 视图切换 */}
            <select
                value={viewMode}
                onChange={(e) => onViewModeChange(e.target.value as MonitorView)}
                className="px-3 py-2 text-sm border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
                <option value="zen-swarm">Zen-Swarm</option>
                <option value="system">System</option>
            </select>

            {/* 刷新按钮 */}
            <button
                onClick={onRefresh}
                disabled={isLoading}
                className="px-3 py-2 text-sm bg-bg-tertiary hover:bg-bg-secondary rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                <span className={isLoading ? 'animate-spin' : ''}>⚙️</span>
                刷新
            </button>
        </div>
    );
}
