/**
 * FinderIconView - 图标视图
 * macOS 风格的图标网格显示
 */

import React, { useMemo, useRef } from 'react';
import type { FinderFileItem, ViewOptions, SelectionState } from '../../../types/finder.js';
import { formatFileSize } from '../../../stores/finder.js';
import { Loader2, Check, MoreHorizontal } from '../../ui/Icons.js';

// ========================================
// Types
// ========================================

interface FinderIconViewProps {
    items: FinderFileItem[];
    loading: boolean;
    selection: SelectionState;
    viewOptions: ViewOptions;
    iconSize?: 'sm' | 'md' | 'lg' | 'xl';
    onSelect: (item: FinderFileItem, event: React.MouseEvent) => void;
    onDoubleClick: (item: FinderFileItem) => void;
    onContextMenu: (event: React.MouseEvent, item?: FinderFileItem) => void;
}

// ========================================
// Icon Size Config
// ========================================

const ICON_SIZE_CONFIG = {
    sm: { icon: 'text-2xl', name: 'text-xs', padding: 'p-1' },
    md: { icon: 'text-4xl', name: 'text-sm', padding: 'p-2' },
    lg: { icon: 'text-5xl', name: 'text-sm', padding: 'p-3' },
    xl: { icon: 'text-6xl', name: 'text-base', padding: 'p-4' },
};

// ========================================
// Icon Item Component
// ========================================

interface IconItemProps {
    item: FinderFileItem;
    isSelected: boolean;
    size: 'sm' | 'md' | 'lg' | 'xl';
    onSelect: (item: FinderFileItem, event: React.MouseEvent) => void;
    onDoubleClick: (item: FinderFileItem) => void;
    onContextMenu: (event: React.MouseEvent, item: FinderFileItem) => void;
}

const IconItem: React.FC<IconItemProps> = ({ item, isSelected, size, onSelect, onDoubleClick, onContextMenu }) => {
    const config = ICON_SIZE_CONFIG[size];

    return (
        <div
            className={`
                relative flex flex-col items-center justify-center cursor-pointer rounded-lg transition-all duration-150
                ${config.padding}
                ${
                    isSelected
                        ? 'bg-[var(--color-primary)] bg-opacity-20 ring-2 ring-[var(--color-primary)]'
                        : 'hover:bg-[var(--color-bg-secondary)]'
                }
            `}
            onClick={(e) => onSelect(item, e)}
            onDoubleClick={() => onDoubleClick(item)}
            onContextMenu={(e) => onContextMenu(e, item)}
        >
            {/* Icon */}
            <div className={`${config.icon} flex items-center justify-center`}>
                {item.type === 'directory' ? item.icon || '📁' : item.icon || '📄'}
            </div>

            {/* Name */}
            <div className="text-center mt-2 w-full">
                <p
                    className={`${config.name} truncate px-1 ${
                        isSelected ? 'text-[var(--color-primary)] font-medium' : 'text-[var(--color-text-primary)]'
                    }`}
                    title={item.name}
                >
                    {item.name}
                </p>
                {/* Show size for files in larger views */}
                {size === 'xl' && item.type === 'file' && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{formatFileSize(item.size)}</p>
                )}
            </div>

            {/* Selection indicator */}
            {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                </div>
            )}

            {/* Hover actions */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isSelected && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Show quick actions menu
                        }}
                        className="p-1 bg-white rounded-full shadow-md hover:bg-gray-50"
                    >
                        <MoreHorizontal className="w-3 h-3 text-gray-600" />
                    </button>
                )}
            </div>
        </div>
    );
};

// ========================================
// Main Component
// ========================================

export const FinderIconView: React.FC<FinderIconViewProps> = ({
    items,
    loading,
    selection,
    viewOptions,
    iconSize,
    onSelect,
    onDoubleClick,
    onContextMenu,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const size = iconSize || viewOptions.iconSize;

    // Calculate grid columns based on size
    const gridCols = useMemo(() => {
        switch (size) {
            case 'sm':
                return 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12';
            case 'md':
                return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10';
            case 'lg':
                return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8';
            case 'xl':
                return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
            default:
                return 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10';
        }
    }, [size]);

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4 text-[var(--color-text-muted)]">
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
        <div ref={containerRef} className={`grid ${gridCols} gap-1 p-4 auto-rows-max`}>
            {items.map((item) => (
                <IconItem
                    key={item.path}
                    item={item}
                    isSelected={selection.selectedPaths.has(item.path)}
                    size={size}
                    onSelect={onSelect}
                    onDoubleClick={onDoubleClick}
                    onContextMenu={onContextMenu}
                />
            ))}
        </div>
    );
};

export default FinderIconView;
