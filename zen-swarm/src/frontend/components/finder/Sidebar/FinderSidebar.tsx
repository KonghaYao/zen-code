/**
 * FinderSidebar - macOS 风格侧边栏
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { SidebarSection, SidebarItem } from '../../../types/finder.js';
import { useFinderStore } from '../../../stores/finder.js';
import { apiClient } from '../../../api.js';
import { MoreVertical, ChevronDown, RefreshCw, ChevronLeft, Home, Loader2 } from '../../ui/Icons.js';

// ========================================
// Types
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
// Default Sidebar Sections (static)
// ========================================

const STATIC_SECTIONS: SidebarSection[] = [
    {
        id: 'locations',
        title: 'Project',
        collapsible: false,
        collapsed: false,
        items: [{ id: 'root', name: 'Project Root', path: '/', icon: '🏠', type: 'folder' }],
    },
    {
        id: 'config',
        title: 'Configuration',
        collapsible: true,
        collapsed: false,
        items: [
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
    const [showMenu, setShowMenu] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (menuButtonRef.current) {
            const rect = menuButtonRef.current.getBoundingClientRect();
            // 创建新的事件对象传递坐标
            const customEvent = {
                clientX: rect.left,
                clientY: rect.bottom + 2,
                preventDefault: () => {},
                stopPropagation: () => {},
                nativeEvent: e.nativeEvent,
            } as React.MouseEvent;

            onContextMenu(customEvent, item);
        }
    };

    return (
        <div
            className={`flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md cursor-pointer transition-colors group ${
                isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
            }`}
            onClick={() => onNavigate(item.path)}
        >
            <span className="text-base">{item.icon}</span>
            <span className="text-sm truncate flex-1">{item.name}</span>
            {item.badge && (
                <span
                    className={`px-1.5 py-0.5 text-xs rounded-full ${
                        isActive ? 'bg-white/20' : 'bg-[var(--color-bg-tertiary)]'
                    }`}
                >
                    {item.badge}
                </span>
            )}
            <button
                ref={menuButtonRef}
                onClick={handleMenuClick}
                className={`p-0.5 rounded hover:bg-black/10 transition-opacity opacity-0 group-hover:opacity-100 ${
                    isActive ? 'hover:bg-white/20' : 'hover:bg-black/10'
                }`}
                title="More options"
            >
                <MoreVertical className="w-4 h-4" />
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
    onToggle: () => void;
    onContextMenu: (e: React.MouseEvent, item: SidebarItem) => void;
}

const SidebarSectionView: React.FC<SidebarSectionViewProps> = ({
    section,
    currentPath,
    onNavigate,
    onToggle,
    onContextMenu,
}) => {
    return (
        <div className="py-2">
            {/* Section Header */}
            <div
                className={`flex items-center gap-1 px-4 py-1 text-xs font-semibold uppercase tracking-wider ${
                    section.collapsible ? 'cursor-pointer hover:text-[var(--color-text-primary)]' : ''
                } text-[var(--color-text-muted)]`}
                onClick={section.collapsible ? onToggle : undefined}
            >
                {section.collapsible && (
                    <ChevronDown className={`w-3 h-3 transition-transform ${section.collapsed ? '-rotate-90' : ''}`} />
                )}
                <span>{section.title}</span>
            </div>

            {/* Section Items */}
            {!section.collapsed && (
                <div className="mt-1">
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
            )}
        </div>
    );
};

// ========================================
// Main Component
// ========================================

export const FinderSidebar: React.FC<FinderSidebarProps> = ({
    width,
    currentPath,
    onNavigate,
    onToggle,
    onContextMenu,
}) => {
    const [sections, setSections] = useState<SidebarSection[]>(STATIC_SECTIONS);
    const [loadingFolders, setLoadingFolders] = useState(false);

    // Load top-level folders dynamically
    useEffect(() => {
        const loadFolders = async () => {
            setLoadingFolders(true);
            try {
                const result = await apiClient.files.list.query({
                    path: '/',
                    showHidden: false,
                    sortBy: 'name',
                    sortOrder: 'asc',
                });

                // Filter only directories and create sidebar items
                const folderItems: SidebarItem[] = result.items
                    .filter((item: any) => item.type === 'directory')
                    .map((item: any) => ({
                        id: item.name,
                        name: item.name,
                        path: item.path,
                        icon: item.icon || '📁',
                        type: 'folder' as const,
                    }));

                // Create dynamic folders section
                const foldersSection: SidebarSection = {
                    id: 'folders',
                    title: 'Folders',
                    collapsible: true,
                    collapsed: false,
                    items: folderItems,
                };

                // Insert after locations section, before config
                setSections((prev) => {
                    const withoutFolders = prev.filter((s) => s.id !== 'folders');
                    return [
                        withoutFolders[0], // locations
                        foldersSection,
                        ...withoutFolders.slice(1), // config
                    ];
                });
            } catch (error) {
                console.error('Failed to load folders:', error);
            } finally {
                setLoadingFolders(false);
            }
        };

        loadFolders();
    }, []);

    const handleToggleSection = useCallback((sectionId: string) => {
        setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s)));
    }, []);

    // Loading indicator component
    const LoadingSpinner = () => (
        <div className="px-4 py-2 flex items-center gap-2 text-[var(--color-text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading folders...</span>
        </div>
    );

    return (
        <div
            className="flex flex-col h-full bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-subtle)] overflow-hidden"
            style={{ width }}
        >
            {/* Header with close button */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--color-border-subtle)]">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] px-2">PROJECT</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => {
                            // Trigger reload of folders
                            setLoadingFolders(true);
                            const loadFolders = async () => {
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
                                    const foldersSection: SidebarSection = {
                                        id: 'folders',
                                        title: 'Folders',
                                        collapsible: true,
                                        collapsed: false,
                                        items: folderItems,
                                    };
                                    setSections((prev) => {
                                        const withoutFolders = prev.filter((s) => s.id !== 'folders');
                                        return [withoutFolders[0], foldersSection, ...withoutFolders.slice(1)];
                                    });
                                } catch (error) {
                                    console.error('Failed to reload folders:', error);
                                } finally {
                                    setLoadingFolders(false);
                                }
                            };
                            loadFolders();
                        }}
                        className="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                        title="Refresh Folders"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingFolders ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={onToggle}
                        className="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                        title="Hide Sidebar"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
                {/* Default Sections */}
                {sections.map((section) => (
                    <SidebarSectionView
                        key={section.id}
                        section={section}
                        currentPath={currentPath}
                        onNavigate={onNavigate}
                        onToggle={() => handleToggleSection(section.id)}
                        onContextMenu={onContextMenu || (() => {})}
                    />
                ))}
            </div>
        </div>
    );
};

export default FinderSidebar;
