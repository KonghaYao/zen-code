/**
 * FinderListView - 列表视图
 * macOS 风格的列表显示，支持多列排序
 */

import React, { useMemo, useRef, useCallback, useState } from 'react';
import type { FinderFileItem, ViewOptions, SelectionState, SortBy, ListColumn } from '../../../types/finder.js';
import { useFinderStore, formatFileSize, formatDate, getFileKind } from '../../../stores/finder.js';

// ========================================
// Types
// ========================================

interface FinderListViewProps {
    items: FinderFileItem[];
    loading: boolean;
    selection: SelectionState;
    viewOptions: ViewOptions;
    onSelect: (item: FinderFileItem, event: React.MouseEvent) => void;
    onDoubleClick: (item: FinderFileItem) => void;
    onContextMenu: (event: React.MouseEvent, item?: FinderFileItem) => void;
}

// ========================================
// Default Columns
// ========================================

const DEFAULT_COLUMNS: ListColumn[] = [
    { id: 'name', label: 'Name', width: 300, visible: true, sortable: true },
    { id: 'size', label: 'Size', width: 80, visible: true, sortable: true },
    { id: 'kind', label: 'Kind', width: 120, visible: true, sortable: true },
    { id: 'modifiedAt', label: 'Date Modified', width: 150, visible: true, sortable: true },
    { id: 'createdAt', label: 'Date Created', width: 150, visible: false, sortable: true },
];

// ========================================
// Column Header Component
// ========================================

interface ColumnHeaderProps {
    column: ListColumn;
    sortBy: SortBy;
    sortOrder: 'asc' | 'desc';
    onSort: (columnId: string) => void;
    onResize: (columnId: string, delta: number) => void;
}

const ColumnHeader: React.FC<ColumnHeaderProps> = ({ column, sortBy, sortOrder, onSort, onResize }) => {
    const [isResizing, setIsResizing] = useState(false);
    const startXRef = useRef(0);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsResizing(true);
            startXRef.current = e.clientX;

            const handleMouseMove = (e: MouseEvent) => {
                const delta = e.clientX - startXRef.current;
                onResize(column.id, delta);
                startXRef.current = e.clientX;
            };

            const handleMouseUp = () => {
                setIsResizing(false);
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        [column.id, onResize],
    );

    const isActive = sortBy === column.id;

    return (
        <div
            className={`relative flex items-center gap-1 px-3 py-2 select-none ${
                column.sortable ? 'cursor-pointer hover:bg-[var(--color-bg-tertiary)]' : ''
            } ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}
            style={{ width: column.width }}
            onClick={() => column.sortable && onSort(column.id)}
        >
            <span className="text-xs font-medium truncate">{column.label}</span>

            {/* Sort indicator */}
            {isActive && (
                <svg
                    className={`w-3 h-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            )}

            {/* Resize handle */}
            <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--color-primary)] group"
                onMouseDown={handleMouseDown}
            >
                <div
                    className={`h-full w-px ${isResizing ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border-subtle)] group-hover:bg-[var(--color-primary)]'}`}
                />
            </div>
        </div>
    );
};

// ========================================
// Row Component
// ========================================

interface RowProps {
    item: FinderFileItem;
    columns: ListColumn[];
    isSelected: boolean;
    onSelect: (item: FinderFileItem, event: React.MouseEvent) => void;
    onDoubleClick: (item: FinderFileItem) => void;
    onContextMenu: (event: React.MouseEvent, item: FinderFileItem) => void;
}

const Row: React.FC<RowProps> = ({ item, columns, isSelected, onSelect, onDoubleClick, onContextMenu }) => {
    return (
        <div
            className={`flex items-center border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors group ${
                isSelected ? 'bg-[var(--color-primary)] bg-opacity-10' : 'hover:bg-[var(--color-bg-secondary)]'
            }`}
            onClick={(e) => onSelect(item, e)}
            onDoubleClick={() => onDoubleClick(item)}
            onContextMenu={(e) => onContextMenu(e, item)}
        >
            {columns
                .filter((c) => c.visible)
                .map((column) => (
                    <div
                        key={column.id}
                        className={`px-3 py-2 text-sm truncate ${
                            isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'
                        }`}
                        style={{ width: column.width }}
                    >
                        {column.id === 'name' && (
                            <div className="flex items-center gap-2">
                                <span className="text-base">{item.icon}</span>
                                <span className={`truncate ${isSelected ? 'font-medium' : ''}`}>{item.name}</span>
                                {item.isHidden && (
                                    <span className="text-xs text-[var(--color-text-muted)]">(hidden)</span>
                                )}
                            </div>
                        )}
                        {column.id === 'size' && (
                            <span className={isSelected ? '' : 'text-[var(--color-text-secondary)]'}>
                                {item.type === 'file' ? formatFileSize(item.size) : '--'}
                            </span>
                        )}
                        {column.id === 'kind' && (
                            <span className={isSelected ? '' : 'text-[var(--color-text-secondary)]'}>
                                {item.type === 'directory' ? 'Folder' : getFileKind(item.extension)}
                            </span>
                        )}
                        {column.id === 'modifiedAt' && (
                            <span className={isSelected ? '' : 'text-[var(--color-text-secondary)]'}>
                                {formatDate(item.modifiedAt)}
                            </span>
                        )}
                        {column.id === 'createdAt' && (
                            <span className={isSelected ? '' : 'text-[var(--color-text-secondary)]'}>
                                {formatDate(item.createdAt)}
                            </span>
                        )}
                    </div>
                ))}

            {/* Quick action buttons */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 pr-2">
                {item.type === 'file' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Download or open
                        }}
                        className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
                        title="Open"
                    >
                        <svg
                            className="w-4 h-4 text-[var(--color-text-muted)]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

// ========================================
// Main Component
// ========================================

export const FinderListView: React.FC<FinderListViewProps> = ({
    items,
    loading,
    selection,
    viewOptions,
    onSelect,
    onDoubleClick,
    onContextMenu,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const toggleSort = useFinderStore((s) => s.toggleSort);

    // Use view options columns or defaults
    const columns = viewOptions.listColumns.length > 0 ? viewOptions.listColumns : DEFAULT_COLUMNS;

    // Handle column resize
    const handleColumnResize = useCallback((columnId: string, delta: number) => {
        // Update column width in store (not implemented yet)
        console.log('Resize column:', columnId, delta);
    }, []);

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4 text-[var(--color-text-muted)]">
                    <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    // Empty state
    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4 text-[var(--color-text-muted)]">
                    <span className="text-6xl">📂</span>
                    <div className="text-center">
                        <p className="text-lg font-medium">This folder is empty</p>
                        <p className="text-sm mt-1">Create a new folder or file to get started</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex flex-col h-full overflow-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border-subtle)]">
                {columns
                    .filter((c) => c.visible)
                    .map((column) => (
                        <ColumnHeader
                            key={column.id}
                            column={column}
                            sortBy={viewOptions.sortBy}
                            sortOrder={viewOptions.sortOrder}
                            onSort={() => toggleSort(column.id as SortBy)}
                            onResize={handleColumnResize}
                        />
                    ))}
            </div>

            {/* Rows */}
            <div className="flex-1">
                {items.map((item) => (
                    <Row
                        key={item.path}
                        item={item}
                        columns={columns}
                        isSelected={selection.selectedPaths.has(item.path)}
                        onSelect={onSelect}
                        onDoubleClick={onDoubleClick}
                        onContextMenu={onContextMenu}
                    />
                ))}
            </div>

            {/* Footer with count */}
            <div className="sticky bottom-0 px-4 py-2 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)]">
                {items.length} item{items.length !== 1 ? 's' : ''}
                {selection.selectedPaths.size > 0 && (
                    <span className="ml-4">{selection.selectedPaths.size} selected</span>
                )}
            </div>
        </div>
    );
};

export default FinderListView;
