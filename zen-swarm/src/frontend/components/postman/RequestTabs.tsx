/**
 * RequestTabs — 多标签页 tab 栏
 */

import type { TabState } from '../../hooks/usePostmanTabs.js';
import type { ActiveRequest } from '../../types/postman.js';

interface RequestTabsProps {
    tabs: TabState[];
    activeTabId: string;
    onSelect: (id: string) => void;
    onClose: (id: string) => void;
    onNew: () => void;
}

function getTabLabel(req: ActiveRequest): string {
    if (!req.url) return 'New Request';
    try {
        const path = new URL(req.url).pathname;
        return `${req.method} ${path}`;
    } catch {
        const path = req.url.replace(/^https?:\/\/[^/]+/, '') || req.url;
        return `${req.method} ${path.slice(0, 20)}`;
    }
}

export function RequestTabs({ tabs, activeTabId, onSelect, onClose, onNew }: RequestTabsProps) {
    return (
        <div className="flex-shrink-0 flex items-center border-b border-border-subtle bg-bg-secondary overflow-x-auto">
            {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                    <div
                        key={tab.id}
                        onClick={() => onSelect(tab.id)}
                        className={`group flex-shrink-0 flex items-center gap-1 px-3 py-1.5 cursor-pointer transition-colors border-r border-border-subtle text-xs max-w-48 ${
                            isActive
                                ? 'bg-white text-text-primary border-b-2 border-b-primary'
                                : 'text-text-muted hover:bg-bg-hover hover:text-text-primary'
                        }`}
                    >
                        <span className="truncate flex-1 min-w-0" title={getTabLabel(tab.request)}>
                            {getTabLabel(tab.request)}
                        </span>
                        {tab.request.isDirty && (
                            <span className="text-amber-500 flex-shrink-0 text-xs" title="未保存">
                                ●
                            </span>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose(tab.id);
                            }}
                            className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-bg-hover transition-opacity text-text-muted hover:text-text-primary"
                            title="关闭"
                        >
                            ×
                        </button>
                    </div>
                );
            })}

            {/* 新建 tab 按钮 */}
            <button
                onClick={onNew}
                className="flex-shrink-0 px-3 py-1.5 text-xs text-text-muted hover:text-primary hover:bg-bg-hover transition-colors"
                title="新建标签页 (Cmd+T)"
            >
                +
            </button>
        </div>
    );
}
