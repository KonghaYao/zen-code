/**
 * RightPanelContainer - 右侧面板容器
 * 支持 Tab 切换的面板系统，可扩展新面板
 *
 * 架构：
 * - TabBar: 顶部标签栏
 * - PanelContent: 根据 activePanel 显示对应面板
 *
 * 面板：
 * - SearchPanel: 文件搜索
 * - ChatPanelMini: 简化版 AI 聊天
 */

import React, { useCallback, useMemo } from 'react';
import type { RightPanelType, RightPanelConfig } from '../../../types/rightPanel.js';
import { TabBar } from './TabBar.js';
import { SearchPanel } from '../Search/SearchPanel.js';
import { ChatPanelMini } from './ChatPanelMini.js';

// ========================================
// Types
// ========================================

interface SearchResult {
    filePath: string;
    lineNumber: number;
    lineContent: string;
    matchStart: number;
    matchEnd: number;
}

interface RightPanelContainerProps {
    width: number;
    rootPath: string;
    activePanel?: RightPanelType;
    onActivePanelChange?: (panelId: RightPanelType) => void;
    onSearchResultClick?: (result: SearchResult) => void;
    onResizeStart?: (startX: number, startWidth: number) => void;
    cwd?: string; // 当前工作目录路径
    workspaceId: string; // Workspace ID，用于区分不同 workspace 的 chat
}

// ========================================
// Icon Components (内联 SVG 图标)
// ========================================

const SearchIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
    </svg>
);

const ChatIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
    </svg>
);

// ========================================
// Constants
// ========================================

const RIGHT_PANELS: RightPanelConfig[] = [
    { id: 'search', label: 'Search', icon: <SearchIcon />, shortcut: 'Cmd+Shift+F' },
    { id: 'chat', label: 'AI Chat', icon: <ChatIcon />, shortcut: 'Cmd+Shift+I' },
];

// ========================================
// Main Component
// ========================================

export const RightPanelContainer: React.FC<RightPanelContainerProps> = ({
    width,
    rootPath,
    activePanel: activePanelProp = 'search',
    onActivePanelChange,
    onSearchResultClick,
    onResizeStart,
    cwd,
    workspaceId,
}) => {
    // ========================================
    // Handlers
    // ========================================

    const handlePanelChange = useCallback(
        (panelId: RightPanelType) => {
            onActivePanelChange?.(panelId);
        },
        [onActivePanelChange],
    );

    // ========================================
    // Render Panel Content (直接渲染，不使用 useMemo，避免重新创建组件)
    // ========================================

    const renderPanelContent = () => {
        switch (activePanelProp) {
            case 'search':
                return <SearchPanel rootPath={rootPath} onResultClick={onSearchResultClick} />;
            case 'chat':
                return <ChatPanelMini cwd={cwd} workspaceId={workspaceId} />;
            default:
                return null;
        }
    };

    // ========================================
    // Render
    // ========================================

    return (
        <div
            className="relative flex flex-col h-full bg-[var(--color-bg-secondary)] border-l border-[var(--color-border-subtle)]"
            style={{ width }}
        >
            {/* Tab Bar */}
            <TabBar panels={RIGHT_PANELS} activePanel={activePanelProp} onPanelChange={handlePanelChange} />

            {/* Panel Content - 独立滚动 */}
            <div className="flex-1 min-h-0 overflow-hidden">{renderPanelContent()}</div>

            {/* 拖拽调整手柄 */}
            <div
                className="absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--color-primary)] hover:opacity-50 transition-colors duration-150"
                style={{ left: 0 }}
                onMouseDown={(e) => onResizeStart?.(e.clientX, width)}
            />
        </div>
    );
};

export default RightPanelContainer;
