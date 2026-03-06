/**
 * FinderIconView - 图标视图（macOS 重设计）
 */

import React, { useMemo, useRef } from 'react';
import type { FinderFileItem, ViewOptions, SelectionState } from '../../../types/finder.js';
import { formatFileSize } from '../../../stores/finder.js';
import { Check, MoreHorizontal } from '../../ui/Icons.js';
import { Folder, File, FileText, Code, Image, Database, Settings, Package, FolderOpen } from 'lucide-react';

// ========================================
// File Icon Component Resolver
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
// Icon Size Config
// ========================================

const ICON_SIZE_PX: Record<string, number> = {
    sm: 40,
    md: 56,
    lg: 72,
    xl: 96,
};

const LABEL_SIZE: Record<string, string> = {
    sm: '11px',
    md: '12px',
    lg: '13px',
    xl: '13px',
};

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
    const iconPx = ICON_SIZE_PX[size];
    const isDir = item.type === 'directory';
    const IconComp = getFileIconComponent(isDir, item.extension);
    const svgSize = Math.round(iconPx * 0.52);
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
            className={`group relative flex flex-col items-center cursor-pointer rounded-[8px] transition-[background] duration-100 ease-out ${
                size === 'sm' ? 'p-1' : 'p-2'
            } ${
                isSelected
                    ? 'bg-[rgba(0,98,255,0.15)] outline outline-2 outline-[rgba(0,98,255,0.6)] outline-offset-1'
                    : 'bg-transparent'
            }`}
            onClick={(e) => onSelect(item, e)}
            onDoubleClick={() => onDoubleClick(item)}
        >
            {/* Icon Box */}
            <div
                className={`flex items-center justify-center shrink-0 rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_0.5px_0_rgba(255,255,255,0.6)] ${
                    isDir
                        ? 'bg-[linear-gradient(145deg,#4da3ff_0%,#006eff_100%)]'
                        : 'bg-[linear-gradient(145deg,#f5f5f7_0%,#e8e8ed_100%)]'
                }`}
                style={{ width: iconPx, height: iconPx }}
            >
                <IconComp
                    className={`[stroke-width:1.5] ${isDir ? 'text-white/95' : 'text-[rgba(100,100,110,0.8)]'}`}
                    style={{ width: svgSize, height: svgSize }}
                />
            </div>

            {/* Name */}
            <div className="text-center mt-1.5 w-full">
                <p
                    className={`truncate px-[2px] tracking-[-0.01em] ${
                        isSelected ? 'text-[rgba(0,98,255,0.9)] font-medium' : 'text-black/85 font-normal'
                    }`}
                    style={{ fontSize: LABEL_SIZE[size] }}
                    title={item.name}
                >
                    {item.name}
                </p>
                {size === 'xl' && item.type === 'file' && (
                    <p className="text-[10px] text-[rgba(60,60,67,0.5)] mt-[2px]">{formatFileSize(item.size)}</p>
                )}
            </div>

            {/* Selection check OR hover menu button */}
            {isSelected ? (
                <div className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-[rgba(0,98,255,0.85)]">
                    <Check className="text-white [stroke-width:2.5]" style={{ width: 10, height: 10 }} />
                </div>
            ) : (
                <button
                    ref={menuBtnRef}
                    onClick={handleMenuClick}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex items-center justify-center w-[18px] h-[18px] rounded-full bg-white/90 shadow-[0_1px_4px_rgba(0,0,0,0.2)] border-none cursor-pointer p-0 min-h-[unset] text-[rgba(60,60,67,0.75)] transition-opacity"
                    title="More options"
                >
                    <MoreHorizontal style={{ width: 11, height: 11 }} />
                </button>
            )}
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
    const iconPx = ICON_SIZE_PX[size];

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

    // Loading skeleton
    if (loading) {
        return (
            <div className={`grid ${gridCols} gap-1 p-4 auto-rows-max`}>
                {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 p-2">
                        <div
                            className="animate-pulse rounded-[10px] bg-black/[0.06]"
                            style={{ width: iconPx, height: iconPx }}
                        />
                        <div className="animate-pulse rounded w-[60%] h-[10px] bg-black/[0.06]" />
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
