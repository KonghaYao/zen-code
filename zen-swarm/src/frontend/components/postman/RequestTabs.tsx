/**
 * RequestTabs — 多标签页 tab 栏，右侧嵌入工具按钮
 */

import { useState, useRef, useEffect } from 'react';
import type { TabState } from '../../hooks/usePostmanTabs.js';
import type { ActiveRequest } from '../../types/postman.js';

interface RequestTabsProps {
    tabs: TabState[];
    activeTabId: string;
    onSelect: (id: string) => void;
    onClose: (id: string) => void;
    onNew: () => void;
    onRename: (id: string, name: string) => void;
    /** 右侧工具栏节点（env badge、save、import、new 等） */
    toolbar?: React.ReactNode;
}

function getTabLabel(req: ActiveRequest): string {
    if (!req.url) return req.name || 'New Request';
    try {
        const path = new URL(req.url).pathname;
        return `${req.method} ${path}`;
    } catch {
        const path = req.url.replace(/^https?:\/\/[^/]+/, '') || req.url;
        return `${req.method} ${path.slice(0, 20)}`;
    }
}

interface TabItemProps {
    tab: TabState;
    isActive: boolean;
    onSelect: () => void;
    onClose: (e: React.MouseEvent) => void;
    onRename: (name: string) => void;
}

function TabItem({ tab, isActive, onSelect, onClose, onRename }: TabItemProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const label = getTabLabel(tab.request);

    const startEdit = (e: React.MouseEvent) => {
        if (!isActive) return; // 只有活跃 tab 才能编辑
        e.stopPropagation();
        setDraft(tab.request.name || label);
        setEditing(true);
    };

    const commitEdit = () => {
        const trimmed = draft.trim();
        if (trimmed) onRename(trimmed);
        setEditing(false);
    };

    useEffect(() => {
        if (editing) {
            inputRef.current?.select();
        }
    }, [editing]);

    return (
        <div
            onClick={onSelect}
            onDoubleClick={startEdit}
            className={`group flex-shrink-0 flex items-center gap-1 px-3 py-1.5 cursor-pointer transition-colors border-r border-border-subtle text-xs max-w-52 ${
                isActive
                    ? 'bg-white text-text-primary border-b-2 border-b-primary'
                    : 'text-text-muted hover:bg-bg-hover hover:text-text-primary'
            }`}
            title={isActive ? '双击重命名' : label}
        >
            {editing ? (
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') setEditing(false);
                        e.stopPropagation(); // 防触发 Cmd+S 等快捷键
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-28 px-1 py-0 text-xs bg-white border border-primary rounded focus:outline-none"
                    spellCheck={false}
                />
            ) : (
                <span className="truncate flex-1 min-w-0">{label}</span>
            )}

            {tab.request.isDirty && !editing && (
                <span className="text-amber-500 flex-shrink-0 text-xs" title="未保存">
                    ●
                </span>
            )}
            <button
                onClick={onClose}
                className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-bg-hover transition-opacity text-text-muted hover:text-text-primary"
                title="关闭"
            >
                ×
            </button>
        </div>
    );
}

export function RequestTabs({ tabs, activeTabId, onSelect, onClose, onNew, onRename, toolbar }: RequestTabsProps) {
    return (
        <div className="flex-shrink-0 flex items-center border-b border-border-subtle bg-bg-secondary min-h-0 h-8">
            {/* 可横向滚动的 tab 列表 */}
            <div className="flex items-stretch overflow-x-auto flex-1 min-w-0 h-full">
                {tabs.map((tab) => (
                    <TabItem
                        key={tab.id}
                        tab={tab}
                        isActive={tab.id === activeTabId}
                        onSelect={() => onSelect(tab.id)}
                        onClose={(e) => {
                            e.stopPropagation();
                            onClose(tab.id);
                        }}
                        onRename={(name) => onRename(tab.id, name)}
                    />
                ))}

                {/* 新建 tab 按钮 */}
                <button
                    onClick={onNew}
                    className="flex-shrink-0 px-3 text-xs text-text-muted hover:text-primary hover:bg-bg-hover transition-colors"
                    title="新建标签页 (Cmd+T)"
                >
                    +
                </button>
            </div>

            {/* 右侧工具栏（固定，不随 tab 滚动） */}
            {toolbar && (
                <div className="flex-shrink-0 flex items-center gap-1.5 px-2 border-l border-border-subtle h-full">
                    {toolbar}
                </div>
            )}
        </div>
    );
}
