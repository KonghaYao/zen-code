/**
 * FinderColumnView - 分栏视图
 * macOS Finder 风格的多栏浏览模式
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { FinderFileItem, ViewOptions, SelectionState, ColumnData } from '../../../types/finder.js';
import { useFinderStore, sortItems } from '../../../stores/finder.js';
import { apiClient } from '../../../api.js';
import { Loader2, ChevronRight } from '../../ui/Icons.js';

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
    onDoubleClick: (item: FinderFileItem) => void;
    onNavigate: (item: FinderFileItem, index: number) => void;
    onContextMenu: (event: React.MouseEvent, item?: FinderFileItem) => void;
}

const Column: React.FC<ColumnProps> = ({
    data,
    index,
    isActive,
    viewOptions,
    onSelect,
    onDoubleClick,
    onNavigate,
    onContextMenu,
}) => {
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
            <div className="w-56 border-r border-border-subtle flex items-center justify-center bg-bg-primary">
                <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
            </div>
        );
    }

    if (data.error) {
        return (
            <div className="w-56 border-r border-border-subtle flex items-center justify-center bg-bg-primary p-4">
                <p className="text-sm text-red-500 text-center">{data.error}</p>
            </div>
        );
    }

    if (data.items.length === 0) {
        return (
            <div className="w-56 border-r border-border-subtle flex items-center justify-center bg-bg-primary">
                <p className="text-sm text-text-muted">Empty</p>
            </div>
        );
    }

    return (
        <div
            ref={columnRef}
            className={`w-56 border-r border-border-subtle overflow-y-auto bg-bg-primary ${
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
                            isSelected ? 'bg-primary text-white' : 'hover:bg-bg-secondary text-text-primary'
                        }`}
                        onClick={(e) => {
                            onSelect(item, e);
                            // 文件在 Column view 中不需要预览（因为预览面板在右侧，Column view 本身有分栏显示）
                            // 只有目录才导航
                        }}
                        onDoubleClick={() => {
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
                            <ChevronRight
                                className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white/70' : 'text-text-muted'}`}
                            />
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
                    onDoubleClick={onDoubleClick}
                    onNavigate={handleColumnNavigate}
                    onContextMenu={onContextMenu}
                />
            ))}

            {/* Empty state */}
            {columns.length === 0 && !loading && (
                <div className="flex items-center justify-center h-full flex-1">
                    <div className="text-center text-text-muted">
                        <span className="text-4xl block mb-4">📂</span>
                        <p>No content</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinderColumnView;
