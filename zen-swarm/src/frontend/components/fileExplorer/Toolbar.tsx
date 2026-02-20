/**
 * Toolbar 组件 - 工具栏
 */

import React from 'react';
import type { ViewMode, SortBy, SortOrder } from '../../types/files.js';

interface ToolbarProps {
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    sortBy: SortBy;
    onSortByChange: (sortBy: SortBy) => void;
    sortOrder: SortOrder;
    onSortOrderChange: (order: SortOrder) => void;
    showHidden: boolean;
    onShowHiddenChange: (show: boolean) => void;
    onCreateFolder: () => void;
    onCreateFile: () => void;
    onRefresh: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    viewMode,
    onViewModeChange,
    sortBy,
    onSortByChange,
    sortOrder,
    onSortOrderChange,
    showHidden,
    onShowHiddenChange,
    onCreateFolder,
    onCreateFile,
    onRefresh,
}) => {
    return (
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white rounded-xl border border-[var(--color-border-subtle)]">
            {/* 左侧：操作按钮 */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onCreateFolder}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors"
                    title="New Folder"
                >
                    <span className="text-lg">📁</span>
                    <span className="hidden sm:inline">New Folder</span>
                </button>
                <button
                    onClick={onCreateFile}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors"
                    title="New File"
                >
                    <span className="text-lg">📄</span>
                    <span className="hidden sm:inline">New File</span>
                </button>
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors"
                    title="Refresh"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </button>
            </div>

            {/* 右侧：视图和排序 */}
            <div className="flex items-center gap-3">
                {/* 显示隐藏文件 */}
                <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showHidden}
                        onChange={(e) => onShowHiddenChange(e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--color-border-default)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    />
                    <span className="hidden md:inline">Hidden</span>
                </label>

                {/* 排序 */}
                <select
                    value={sortBy}
                    onChange={(e) => onSortByChange(e.target.value as SortBy)}
                    className="px-2 py-1.5 text-sm bg-white border border-[var(--color-border-subtle)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                    <option value="modifiedAt">Modified</option>
                    <option value="type">Type</option>
                </select>

                <button
                    onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors"
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                    <svg
                        className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                </button>

                {/* 视图切换 */}
                <div className="flex items-center bg-[var(--color-bg-tertiary)] rounded-lg p-1">
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={`p-2 rounded-md transition-colors ${
                            viewMode === 'list'
                                ? 'bg-white text-[var(--color-primary)] shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        }`}
                        title="List View"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 10h16M4 14h16M4 18h16"
                            />
                        </svg>
                    </button>
                    <button
                        onClick={() => onViewModeChange('grid')}
                        className={`p-2 rounded-md transition-colors ${
                            viewMode === 'grid'
                                ? 'bg-white text-[var(--color-primary)] shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        }`}
                        title="Grid View"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
