/**
 * FinderListView - 列表视图（macOS 重设计）
 */

import React, { useRef, useCallback, useState } from 'react';
import type { FinderFileItem, ViewOptions, SelectionState, SortBy, ListColumn } from '../../../types/finder.js';
import { useFinderStore, formatFileSize, formatDate, getFileKind } from '../../../stores/finder.js';
import { ChevronUp, FolderOpen, MoreHorizontal } from '../../ui/Icons.js';
import { Folder, File, FileText, Code, Image, Database, Settings, Package } from 'lucide-react';

// ========================================
// File Icon Resolver
// ========================================

function getFileIconComponent(isDirectory: boolean, extension?: string): React.ComponentType<any> {
    if (isDirectory) return Folder;
    const ext = extension?.toLowerCase();
    const map: Record<string, React.ComponentType<any>> = {
        '.md': FileText,
        '.txt': FileText,
        '.ts': Code,
        '.tsx': Code,
        '.js': Code,
        '.jsx': Code,
        '.py': Code,
        '.go': Code,
        '.rs': Code,
        '.json': Database,
        '.yaml': Settings,
        '.yml': Settings,
        '.toml': Settings,
        '.png': Image,
        '.jpg': Image,
        '.jpeg': Image,
        '.svg': Image,
        '.zip': Package,
        '.tar': Package,
        '.gz': Package,
    };
    return map[ext || ''] || File;
}

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
            className={`relative flex items-center gap-1 px-3 h-[28px] select-none ${
                column.sortable ? 'cursor-pointer' : 'cursor-default'
            }`}
            style={{ width: column.width }}
            onClick={() => column.sortable && onSort(column.id)}
        >
            <span
                className={`text-[12px] font-normal overflow-hidden text-ellipsis whitespace-nowrap ${
                    isActive ? 'text-[rgba(0,98,255,0.85)]' : 'text-[rgba(60,60,67,0.65)]'
                }`}
            >
                {column.label}
            </span>

            {isActive && (
                <ChevronUp
                    className={`shrink-0 text-[rgba(0,98,255,0.85)] transition-transform duration-150 ease-out ${
                        sortOrder === 'desc' ? 'rotate-180' : ''
                    }`}
                    style={{ width: 11, height: 11 }}
                />
            )}

            {/* Resize handle */}
            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize" onMouseDown={handleMouseDown}>
                <div className={`h-full w-px ${isResizing ? 'bg-[rgba(0,98,255,0.6)]' : 'bg-[rgba(60,60,67,0.12)]'}`} />
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
    const isDir = item.type === 'directory';
    const IconComp = getFileIconComponent(isDir, item.extension);
    const menuBtnRef = useRef<HTMLButtonElement>(null);

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (menuBtnRef.current) {
            const rect = menuBtnRef.current.getBoundingClientRect();
            onContextMenu(
                {
                    clientX: rect.left,
                    clientY: rect.bottom + 4,
                    preventDefault: () => {},
                    stopPropagation: () => {},
                } as unknown as React.MouseEvent,
                item,
            );
        }
    };

    return (
        <div
            className={`group flex items-center h-6 cursor-pointer transition-[background] duration-100 ease-out ${
                isSelected ? 'bg-[rgba(0,98,255,0.12)]' : 'bg-transparent'
            }`}
            onClick={(e) => onSelect(item, e)}
            onDoubleClick={() => onDoubleClick(item)}
        >
            {columns
                .filter((c) => c.visible)
                .map((column) => (
                    <div
                        key={column.id}
                        className="px-3 truncate flex items-center h-full text-[13px] tracking-[-0.01em]"
                        style={{ width: column.width }}
                    >
                        {column.id === 'name' && (
                            <div className="flex items-center gap-1.5 w-full overflow-hidden">
                                {/* Mini icon box */}
                                <div
                                    className={`flex items-center justify-center shrink-0 w-4 h-4 rounded-[3px] ${
                                        isDir
                                            ? 'bg-[linear-gradient(145deg,#4da3ff_0%,#006eff_100%)]'
                                            : 'bg-[linear-gradient(145deg,#f5f5f7_0%,#e8e8ed_100%)]'
                                    }`}
                                >
                                    <IconComp
                                        className={`[stroke-width:2] ${
                                            isDir ? 'text-white/95' : 'text-[rgba(100,100,110,0.8)]'
                                        }`}
                                        style={{ width: 9, height: 9 }}
                                    />
                                </div>
                                <span
                                    className={`overflow-hidden text-ellipsis whitespace-nowrap ${
                                        isSelected
                                            ? 'text-[rgba(0,98,255,0.9)] font-medium'
                                            : 'text-black/85 font-normal'
                                    }`}
                                >
                                    {item.name}
                                </span>
                                {item.isHidden && (
                                    <span className="text-[11px] text-[rgba(60,60,67,0.5)]">(hidden)</span>
                                )}
                            </div>
                        )}
                        {column.id === 'size' && (
                            <span className={isSelected ? 'text-[rgba(0,98,255,0.75)]' : 'text-[rgba(60,60,67,0.65)]'}>
                                {item.type === 'file' ? formatFileSize(item.size) : '--'}
                            </span>
                        )}
                        {column.id === 'kind' && (
                            <span className={isSelected ? 'text-[rgba(0,98,255,0.75)]' : 'text-[rgba(60,60,67,0.65)]'}>
                                {item.type === 'directory' ? 'Folder' : getFileKind(item.extension)}
                            </span>
                        )}
                        {column.id === 'modifiedAt' && (
                            <span className={isSelected ? 'text-[rgba(0,98,255,0.75)]' : 'text-[rgba(60,60,67,0.65)]'}>
                                {formatDate(item.modifiedAt)}
                            </span>
                        )}
                        {column.id === 'createdAt' && (
                            <span className={isSelected ? 'text-[rgba(0,98,255,0.75)]' : 'text-[rgba(60,60,67,0.65)]'}>
                                {formatDate(item.createdAt)}
                            </span>
                        )}
                    </div>
                ))}

            {/* More button */}
            <div className="ml-auto pr-2 flex items-center shrink-0">
                <button
                    ref={menuBtnRef}
                    onClick={handleMenuClick}
                    className={`opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 rounded-[4px] border-none cursor-pointer p-0 min-h-[unset] transition-opacity ${
                        isSelected
                            ? 'bg-[rgba(0,98,255,0.15)] text-[rgba(0,98,255,0.8)]'
                            : 'bg-black/[0.07] text-[rgba(60,60,67,0.7)]'
                    }`}
                    title="More options"
                >
                    <MoreHorizontal style={{ width: 12, height: 12 }} />
                </button>
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

    const columns = viewOptions.listColumns.length > 0 ? viewOptions.listColumns : DEFAULT_COLUMNS;

    const handleColumnResize = useCallback((columnId: string, delta: number) => {
        console.log('Resize column:', columnId, delta);
    }, []);

    // Loading skeleton
    if (loading) {
        return (
            <div className="flex flex-col">
                {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 h-6 animate-pulse">
                        <div className="w-4 h-4 rounded-[3px] bg-black/[0.06] shrink-0" />
                        <div
                            className="h-[9px] rounded-[3px] bg-black/[0.06]"
                            style={{ width: `${40 + (i % 5) * 15}%` }}
                        />
                    </div>
                ))}
            </div>
        );
    }

    // Empty state
    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                    <FolderOpen
                        className="text-[rgba(60,60,67,0.3)] [stroke-width:1]"
                        style={{ width: 40, height: 40 }}
                    />
                    <p className="text-[15px] text-black/60 tracking-[-0.01em]">This Folder Is Empty</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex flex-col h-full overflow-auto">
            {/* Header */}
            <div
                className="sticky top-0 z-10 flex items-center bg-[rgba(246,246,246,0.92)] border-b border-b-[rgba(0,0,0,0.1)]"
                style={{
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderBottom: '0.5px solid rgba(0,0,0,0.1)',
                }}
            >
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
        </div>
    );
};

export default FinderListView;
