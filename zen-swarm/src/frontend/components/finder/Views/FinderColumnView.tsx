/**
 * FinderColumnView - 分栏视图
 * macOS Finder 风格的多栏浏览模式
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { FinderFileItem, ViewOptions, SelectionState, ColumnData } from '../../../types/finder.js';
import { useFinderStore, sortItems } from '../../../stores/finder.js';
import { apiClient } from '../../../api.js';

// ========================================
// Types
// ========================================

interface FinderColumnViewProps {
    items: FinderFileItem[];
    loading: boolean;
    selection: SelectionState;
    viewOptions: ViewOptions;
    rootPath: string;
    currentPath: string;
    onSelect: (item: FinderFileItem, event: React.MouseEvent) => void;
    onDoubleClick: (item: FinderFileItem) => void;
    onContextMenu: (event: React.MouseEvent, item?: FinderFileItem) => void;
    onNavigate: (path: string) => void;
}

// ========================================
// Helper Functions
// ========================================

function getFileIcon(isDirectory: boolean, extension?: string): string {
    if (isDirectory) return '📁';
    const iconMap: Record<string, string> = {
        '.md': '📝',
        '.ts': '🔷',
        '.tsx': '⚛️',
        '.js': '🟨',
        '.json': '📋',
        '.yaml': '⚙️',
        '.yml': '⚙️',
        '.png': '🖼️',
        '.jpg': '🖼️',
        '.svg': '🎨',
    };
    return iconMap[extension?.toLowerCase() || ''] || '📄';
}

function transformFileItem(item: any): FinderFileItem {
    return {
        id: item.path,
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size || 0,
        modifiedAt: new Date(item.modifiedAt),
        createdAt: new Date(item.createdAt),
        isHidden: item.isHidden || false,
        extension: item.extension,
        icon: item.icon || getFileIcon(item.type === 'directory', item.extension),
    };
}

// ========================================
// Column Component
// ========================================

interface ColumnProps {
    data: ColumnData;
    index: number;
    isActive: boolean;
    viewOptions: ViewOptions;
    onSelect: (item: FinderFileItem, event: React.MouseEvent) => void;
    onNavigate: (item: FinderFileItem, index: number) => void;
    onContextMenu: (event: React.MouseEvent, item?: FinderFileItem) => void;
}

const Column: React.FC<ColumnProps> = ({ data, index, isActive, viewOptions, onSelect, onNavigate, onContextMenu }) => {
    const columnRef = useRef<HTMLDivElement>(null);

    // Auto-scroll selected item into view
    useEffect(() => {
        if (data.selectedPath && columnRef.current) {
            const selectedEl = columnRef.current.querySelector(`[data-path="${data.selectedPath}"]`);
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [data.selectedPath]);

    if (data.loading) {
        return (
            <div className="w-56 border-r border-[var(--color-border-subtle)] flex items-center justify-center bg-[var(--color-bg-primary)]">
                <svg className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            </div>
        );
    }

    if (data.error) {
        return (
            <div className="w-56 border-r border-[var(--color-border-subtle)] flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
                <p className="text-sm text-red-500 text-center">{data.error}</p>
            </div>
        );
    }

    if (data.items.length === 0) {
        return (
            <div className="w-56 border-r border-[var(--color-border-subtle)] flex items-center justify-center bg-[var(--color-bg-primary)]">
                <p className="text-sm text-[var(--color-text-muted)]">Empty</p>
            </div>
        );
    }

    return (
        <div
            ref={columnRef}
            className={`w-56 border-r border-[var(--color-border-subtle)] overflow-y-auto bg-[var(--color-bg-primary)] ${
                isActive ? 'bg-opacity-100' : 'bg-opacity-50'
            }`}
        >
            {data.items.map((item) => {
                const isSelected = data.selectedPath === item.path;
                const hasChildren = item.type === 'directory';

                return (
                    <div
                        key={item.path}
                        data-path={item.path}
                        className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors ${
                            isSelected
                                ? 'bg-[var(--color-primary)] text-white'
                                : 'hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]'
                        }`}
                        onClick={(e) => {
                            onSelect(item, e);
                            if (hasChildren) {
                                onNavigate(item, index);
                            }
                        }}
                        onContextMenu={(e) => onContextMenu(e, item)}
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-sm">{item.icon}</span>
                            <span className="text-sm truncate">{item.name}</span>
                        </div>

                        {/* Arrow for folders */}
                        {hasChildren && (
                            <svg
                                className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ========================================
// Main Component
// ========================================

export const FinderColumnView: React.FC<FinderColumnViewProps> = ({
    items,
    loading,
    selection,
    viewOptions,
    rootPath,
    currentPath,
    onSelect,
    onDoubleClick,
    onContextMenu,
    onNavigate: handleNavigatePath,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [columns, setColumns] = useState<ColumnData[]>([]);

    // Initialize first column with current directory
    useEffect(() => {
        const loadInitialColumns = async () => {
            // Load first column
            const firstColumn: ColumnData = {
                path: currentPath,
                items: items,
                selectedPath: null,
                loading: loading,
            };
            setColumns([firstColumn]);
        };

        loadInitialColumns();
    }, [currentPath, items, loading]);

    // Load column content when navigating
    const loadColumnContent = useCallback(
        async (path: string, columnIndex: number) => {
            try {
                const result = await apiClient.files.list.query({
                    path,
                    showHidden: viewOptions.showHiddenFiles,
                    sortBy: 'name',
                    sortOrder: 'asc',
                });

                const transformedItems = result.items.map(transformFileItem);
                const sortedItems = sortItems(transformedItems, 'name', 'asc');

                const newColumn: ColumnData = {
                    path,
                    items: sortedItems,
                    selectedPath: null,
                    loading: false,
                };

                setColumns((prev) => {
                    const newColumns = [...prev];
                    newColumns[columnIndex + 1] = newColumn;
                    // Remove any columns after the new one
                    newColumns.splice(columnIndex + 2);
                    return newColumns;
                });
            } catch (err: any) {
                console.error('Failed to load column:', err);
                setColumns((prev) => {
                    const newColumns = [...prev];
                    newColumns[columnIndex + 1] = {
                        path,
                        items: [],
                        selectedPath: null,
                        loading: false,
                        error: err.message || 'Failed to load',
                    };
                    return newColumns;
                });
            }
        },
        [viewOptions.showHiddenFiles],
    );

    // Handle navigation within columns
    const handleColumnNavigate = useCallback(
        (item: FinderFileItem, columnIndex: number) => {
            if (item.type !== 'directory') return;

            // Update current column's selection
            setColumns((prev) => {
                const newColumns = [...prev];
                newColumns[columnIndex] = {
                    ...newColumns[columnIndex],
                    selectedPath: item.path,
                };
                return newColumns;
            });

            // Load next column
            loadColumnContent(item.path, columnIndex);
        },
        [loadColumnContent],
    );

    // Scroll to show last column
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollLeft = containerRef.current.scrollWidth;
        }
    }, [columns.length]);

    return (
        <div
            ref={containerRef}
            className="flex h-full overflow-x-auto overflow-y-hidden"
            onContextMenu={(e) => onContextMenu(e)}
        >
            {columns.map((column, index) => (
                <Column
                    key={`${column.path}-${index}`}
                    data={column}
                    index={index}
                    isActive={index === columns.length - 1}
                    viewOptions={viewOptions}
                    onSelect={onSelect}
                    onNavigate={handleColumnNavigate}
                    onContextMenu={onContextMenu}
                />
            ))}

            {/* Empty state */}
            {columns.length === 0 && !loading && (
                <div className="flex items-center justify-center h-full flex-1">
                    <div className="text-center text-[var(--color-text-muted)]">
                        <span className="text-4xl block mb-4">📂</span>
                        <p>No content</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinderColumnView;
