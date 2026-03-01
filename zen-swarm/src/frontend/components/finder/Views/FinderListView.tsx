/**
 * FinderListView - 列表视图
 * macOS 风格的列表显示，支持多列排序
 */

import React, { useRef, useCallback, useState } from 'react';
import type { FinderFileItem, ViewOptions, SelectionState, SortBy, ListColumn } from '../../../types/finder.js';
import { useFinderStore, formatFileSize, formatDate, getFileKind } from '../../../stores/finder.js';
import { Loader2, ChevronUp, Eye } from '../../ui/Icons.js';

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
                window.removeEventListener('blur', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('blur', handleMouseUp);
        },
        [column.id, onResize],
    );

    const isActive = sortBy === column.id;

    return (
        <div
            className={`relative flex items-center gap-1 px-3 py-2 select-none ${
                column.sortable ? 'cursor-pointer hover:bg-bg-tertiary' : ''
            } ${isActive ? 'text-primary' : 'text-text-muted'}`}
            style={{ width: column.width }}
            onClick={() => column.sortable && onSort(column.id)}
        >
            <span className="text-xs font-medium truncate">{column.label}</span>

            {/* Sort indicator */}
            {isActive && (
                <ChevronUp className={`w-3 h-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            )}

            {/* Resize handle */}
            <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary group"
                onMouseDown={handleMouseDown}
            >
                <div
                    className={`h-full w-px ${isResizing ? 'bg-primary' : 'bg-border-subtle group-hover:bg-primary'}`}
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
            className={`flex items-center border-b border-border-subtle cursor-pointer transition-colors group ${
                isSelected ? 'bg-primary bg-opacity-10' : 'hover:bg-bg-secondary'
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
                        className={`px-3 py-2 text-sm truncate ${isSelected ? 'text-primary' : 'text-text-primary'}`}
                        style={{ width: column.width }}
                    >
                        {column.id === 'name' && (
                            <div className="flex items-center gap-2">
                                <span className="text-base">{item.icon}</span>
                                <span className={`truncate ${isSelected ? 'font-medium' : ''}`}>{item.name}</span>
                                {item.isHidden && <span className="text-xs text-text-muted">(hidden)</span>}
                            </div>
                        )}
                        {column.id === 'size' && (
                            <span className={isSelected ? '' : 'text-text-secondary'}>
                                {item.type === 'file' ? formatFileSize(item.size) : '--'}
                            </span>
                        )}
                        {column.id === 'kind' && (
                            <span className={isSelected ? '' : 'text-text-secondary'}>
                                {item.type === 'directory' ? 'Folder' : getFileKind(item.extension)}
                            </span>
                        )}
                        {column.id === 'modifiedAt' && (
                            <span className={isSelected ? '' : 'text-text-secondary'}>
                                {formatDate(item.modifiedAt)}
                            </span>
                        )}
                        {column.id === 'createdAt' && (
                            <span className={isSelected ? '' : 'text-text-secondary'}>
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
                        className="p-1 rounded hover:bg-bg-tertiary"
                        title="Open"
                    >
                        <Eye className="w-4 h-4 text-text-muted" />
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
                <div className="flex flex-col items-center gap-4 text-text-muted">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    // Empty state
    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4 text-text-muted">
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
            <div className="sticky top-0 z-10 flex items-center bg-bg-tertiary border-b border-border-subtle">
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
            <div className="sticky bottom-0 px-4 py-2 bg-bg-secondary border-t border-border-subtle text-xs text-text-muted">
                {items.length} item{items.length !== 1 ? 's' : ''}
                {selection.selectedPaths.size > 0 && (
                    <span className="ml-4">{selection.selectedPaths.size} selected</span>
                )}
            </div>
        </div>
    );
};

export default FinderListView;
