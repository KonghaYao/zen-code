/**
 * FinderSidebar - macOS 风格侧边栏（重设计）
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { SidebarSection, SidebarItem } from '../../../types/finder.js';
import { apiClient } from '../../../api.js';
import { Home, FileText, Bot, Folder, MoreHorizontal } from '../../ui/Icons.js';

// ========================================
// Icon Map
// ========================================

const SIDEBAR_ICON_MAP: Record<string, React.ComponentType<any>> = {
    root: Home,
    specs: FileText,
    config: Bot,
    folder: Folder,
};

// ========================================
// Default Sidebar Sections (static)
// ========================================

const STATIC_SECTIONS: SidebarSection[] = [
    {
        id: 'favorites',
        title: 'Favorites',
        collapsible: false,
        collapsed: false,
        items: [
            { id: 'root', name: 'Project Root', path: '/', icon: '🏠', type: 'folder' },
            { id: 'specs', name: 'Specs', path: '/specs', icon: '📋', type: 'folder' },
            { id: 'config', name: '.claude', path: '/.claude', icon: '🤖', type: 'folder' },
        ],
    },
];

// ========================================
// Sidebar Item Component
// ========================================

interface SidebarItemRowProps {
    item: SidebarItem;
    isActive: boolean;
    onNavigate: (path: string) => void;
    onContextMenu: (e: React.MouseEvent, item: SidebarItem) => void;
}

const SidebarItemRow: React.FC<SidebarItemRowProps> = ({ item, isActive, onNavigate, onContextMenu }) => {
    const IconComponent = SIDEBAR_ICON_MAP[item.id] || SIDEBAR_ICON_MAP['folder'];
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
            className={`group flex items-center gap-1.5 mx-1.5 h-[26px] pl-2 pr-1 rounded-[6px] cursor-pointer select-none ${
                isActive ? 'bg-[rgba(0,98,255,0.85)]' : 'bg-transparent'
            }`}
            onClick={() => onNavigate(item.path)}
        >
            <IconComponent
                className={`shrink-0 [stroke-width:1.75] ${isActive ? 'text-white/95' : 'text-[rgba(0,112,255,0.85)]'}`}
                style={{ width: 14, height: 14 }}
            />
            <span
                className={`truncate flex-1 text-[13px] tracking-[-0.01em] ${
                    isActive ? 'text-white font-medium' : 'text-black/85 font-normal'
                }`}
            >
                {item.name}
            </span>
            {item.badge && (
                <span
                    className={`shrink-0 px-1 rounded-full text-[10px] group-hover:hidden ${
                        isActive ? 'bg-white/25 text-white' : 'bg-black/[0.08] text-[rgba(60,60,67,0.65)]'
                    }`}
                >
                    {item.badge}
                </span>
            )}
            <button
                ref={menuBtnRef}
                onClick={handleMenuClick}
                className={`opacity-0 group-hover:opacity-100 flex items-center justify-center w-[18px] h-[18px] rounded p-0 border-none cursor-pointer transition-opacity shrink-0 min-h-[unset] ${
                    isActive ? 'bg-white/20 text-white/90' : 'bg-black/[0.07] text-[rgba(60,60,67,0.7)]'
                }`}
                title="More options"
            >
                <MoreHorizontal style={{ width: 11, height: 11 }} />
            </button>
        </div>
    );
};

// ========================================
// Sidebar Section Component
// ========================================

interface SidebarSectionViewProps {
    section: SidebarSection;
    currentPath: string;
    onNavigate: (path: string) => void;
    onContextMenu: (e: React.MouseEvent, item: SidebarItem) => void;
}

const SidebarSectionView: React.FC<SidebarSectionViewProps> = ({ section, currentPath, onNavigate, onContextMenu }) => {
    return (
        <div className="py-1">
            {/* Section Label */}
            <div className="px-3 pt-4 pb-1 uppercase select-none text-[10px] font-semibold tracking-[0.06em] text-[rgba(60,60,67,0.6)]">
                {section.title}
            </div>

            {/* Section Items */}
            <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                    <SidebarItemRow
                        key={item.id}
                        item={item}
                        isActive={item.path === currentPath}
                        onNavigate={onNavigate}
                        onContextMenu={onContextMenu}
                    />
                ))}
            </div>
        </div>
    );
};

// ========================================
// Props
// ========================================

interface FinderSidebarProps {
    width: number;
    currentPath: string;
    onNavigate: (path: string) => void;
    onToggle: () => void;
    onContextMenu?: (
        e: React.MouseEvent,
        item?: SidebarItem,
        explicitType?: 'file' | 'directory' | 'multiple' | 'empty-space',
    ) => void;
}

// ========================================
// Main Component
// ========================================

export const FinderSidebar: React.FC<FinderSidebarProps> = ({ width, currentPath, onNavigate, onContextMenu }) => {
    const [sections, setSections] = useState<SidebarSection[]>(STATIC_SECTIONS);
    const [loadingFolders, setLoadingFolders] = useState(false);

    const loadFolders = useCallback(async () => {
        setLoadingFolders(true);
        try {
            const result = await apiClient.files.list.query({
                path: '/',
                showHidden: false,
                sortBy: 'name',
                sortOrder: 'asc',
            });

            const folderItems: SidebarItem[] = result.items
                .filter((item: any) => item.type === 'directory')
                .map((item: any) => ({
                    id: item.name,
                    name: item.name,
                    path: item.path,
                    icon: item.icon || '📁',
                    type: 'folder' as const,
                }));

            const locationsSection: SidebarSection = {
                id: 'locations',
                title: 'Locations',
                collapsible: false,
                collapsed: false,
                items: folderItems,
            };

            setSections([STATIC_SECTIONS[0], locationsSection]);
        } catch (error) {
            console.error('Failed to load folders:', error);
        } finally {
            setLoadingFolders(false);
        }
    }, []);

    useEffect(() => {
        loadFolders();
    }, []);

    return (
        <div
            className="finder-sidebar flex flex-col h-full overflow-hidden bg-[rgba(246,246,246,0.85)] backdrop-blur-xl saturate-180 border-r border-r-[rgba(0,0,0,0.12)]"
            style={{
                width,
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                borderRight: '0.5px solid rgba(0, 0, 0, 0.12)',
            }}
        >
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pb-2">
                {sections.map((section) => (
                    <SidebarSectionView
                        key={section.id}
                        section={section}
                        currentPath={currentPath}
                        onNavigate={onNavigate}
                        onContextMenu={onContextMenu || (() => {})}
                    />
                ))}
            </div>
        </div>
    );
};

export default FinderSidebar;
