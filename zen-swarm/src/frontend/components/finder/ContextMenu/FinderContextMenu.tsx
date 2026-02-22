import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { ContextMenuItem } from '../../../types/finder.js';
import { useFinderStore } from '../../../stores/finder.js';

// ========================================
// Types
// ========================================

interface FinderContextMenuProps {
    position: { x: number; y: number };
    targetPath: string | null;
    targetPaths: string[];
    targetType: 'file' | 'directory' | 'multiple' | 'empty-space';
    onClose: () => void;
}

// ========================================
// Menu Item Component
// ========================================

interface MenuItemProps {
    item: ContextMenuItem;
    onClose: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ item, onClose }) => {
    const [showSubmenu, setShowSubmenu] = useState(false);

    if (item.separator) {
        return <div className="h-px bg-[var(--color-border-subtle)] my-1 mx-3" />;
    }

    const handleClick = () => {
        if (item.submenu) {
            setShowSubmenu(!showSubmenu);
        } else if (item.action) {
            item.action();
            onClose();
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleClick}
                onMouseEnter={() => item.submenu && setShowSubmenu(true)}
                onMouseLeave={() => item.submenu && setShowSubmenu(false)}
                disabled={item.disabled}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-sm ${
                    item.disabled
                        ? 'text-[var(--color-text-muted)] cursor-not-allowed'
                        : 'text-[var(--color-text-primary)] hover:bg-[var(--color-primary)] hover:text-white'
                }`}
            >
                <div className="flex items-center gap-2">
                    {item.icon && <span className="text-base">{item.icon}</span>}
                    <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                    {item.shortcut && <span className="text-xs text-[var(--color-text-muted)]">{item.shortcut}</span>}
                    {item.submenu && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    )}
                </div>
            </button>

            {/* Submenu */}
            {item.submenu && showSubmenu && (
                <div className="absolute left-full top-0 ml-1 min-w-48 bg-white rounded-lg shadow-lg border border-[var(--color-border-subtle)] py-1 z-50">
                    {item.submenu.map((subItem) => (
                        <MenuItem key={subItem.id} item={subItem} onClose={onClose} />
                    ))}
                </div>
            )}
        </div>
    );
};

// ========================================
// Main Component
// ========================================

export const FinderContextMenu: React.FC<FinderContextMenuProps> = ({
    position,
    targetPath,
    targetPaths,
    targetType,
    onClose,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    const openDialog = useFinderStore((s) => s.openDialog);
    const copyToClipboard = useFinderStore((s) => s.copyToClipboard);
    const cutToClipboard = useFinderStore((s) => s.cutToClipboard);
    const clipboardPaths = useFinderStore((s) => s.clipboardPaths);
    const clipboardOperation = useFinderStore((s) => s.clipboardOperation);
    const openPreview = useFinderStore((s) => s.openPreview);
    const openInspector = useFinderStore((s) => s.openInspector);
    const addFavorite = useFinderStore((s) => s.addFavorite);
    const currentPath = useFinderStore((s) => s.currentPath);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Adjust position to stay within viewport
    const adjustedPosition = useCallback(() => {
        const menuWidth = 220;
        const menuHeight = 400;

        let x = position.x;
        let y = position.y;

        if (typeof window !== 'undefined') {
            if (x + menuWidth > window.innerWidth) {
                x = window.innerWidth - menuWidth - 10;
            }
            if (y + menuHeight > window.innerHeight) {
                y = window.innerHeight - menuHeight - 10;
            }
        }

        return { x, y };
    }, [position]);

    const pos = adjustedPosition();

    // Build menu items based on context
    const menuItems: ContextMenuItem[] =
        targetType === 'empty-space'
            ? [
                  {
                      id: 'new-folder',
                      label: 'New Folder',
                      icon: '📁',
                      shortcut: '⌘N',
                      action: () => openDialog('new-folder', currentPath),
                  },
                  {
                      id: 'new-file',
                      label: 'New File',
                      icon: '📄',
                      shortcut: '⌘⇧N',
                      action: () => openDialog('new-file', currentPath),
                  },
                  { id: 'sep1', label: '', separator: true },
                  {
                      id: 'paste',
                      label: `Paste ${clipboardOperation === 'cut' ? 'Item' : 'Copy'}`,
                      icon: '📋',
                      shortcut: '⌘V',
                      disabled: clipboardPaths.length === 0,
                      action: () => {
                          // TODO: Implement paste
                          console.log('Paste:', clipboardPaths);
                      },
                  },
                  { id: 'sep2', label: '', separator: true },
                  {
                      id: 'sort-by',
                      label: 'Sort By',
                      icon: '📊',
                      submenu: [
                          { id: 'name', label: 'Name', action: () => console.log('Sort by name') },
                          { id: 'size', label: 'Size', action: () => console.log('Sort by size') },
                          { id: 'date', label: 'Date Modified', action: () => console.log('Sort by date') },
                          { id: 'kind', label: 'Kind', action: () => console.log('Sort by kind') },
                      ],
                  },
                  {
                      id: 'clean-up',
                      label: 'Clean Up',
                      icon: '✨',
                      action: () => console.log('Clean up'),
                  },
                  { id: 'sep3', label: '', separator: true },
                  {
                      id: 'show-view-options',
                      label: 'Show View Options',
                      shortcut: '⌘J',
                      action: () => console.log('Show view options'),
                  },
              ]
            : [
                  {
                      id: 'open',
                      label: 'Open',
                      icon: '📂',
                      shortcut: '⌘O',
                      action: () => {
                          if (targetPath) {
                              // Navigate or open
                          }
                      },
                  },
                  {
                      id: 'open-with',
                      label: 'Open With',
                      icon: '🔓',
                      submenu: [
                          { id: 'default', label: 'Default Application', action: () => {} },
                          { id: 'sep', label: '', separator: true },
                          { id: 'other', label: 'Other...', action: () => {} },
                      ],
                  },
                  { id: 'sep1', label: '', separator: true },
                  {
                      id: 'copy',
                      label: 'Copy',
                      icon: '📋',
                      shortcut: '⌘C',
                      action: () => copyToClipboard(targetPaths),
                  },
                  {
                      id: 'cut',
                      label: 'Cut',
                      icon: '✂️',
                      shortcut: '⌘X',
                      action: () => cutToClipboard(targetPaths),
                  },
              ];

    // Add more items for single selection
    if (targetType !== 'multiple' && targetType !== 'empty-space') {
        menuItems.push(
            { id: 'sep2', label: '', separator: true },
            {
                id: 'rename',
                label: 'Rename',
                icon: '✏️',
                shortcut: 'Enter',
                action: () => targetPath && openDialog('rename', targetPath),
            },
            {
                id: 'duplicate',
                label: 'Duplicate',
                icon: '📄',
                shortcut: '⌘D',
                action: () => console.log('Duplicate'),
            },
            { id: 'sep3', label: '', separator: true },
            {
                id: 'quick-look',
                label: 'Quick Look',
                icon: '👁️',
                shortcut: 'Space',
                action: () => targetPath && openPreview(targetPath),
            },
            {
                id: 'get-info',
                label: 'Get Info',
                icon: 'ℹ️',
                shortcut: '⌘I',
                action: () => targetPath && openInspector(targetPath),
            },
            { id: 'sep4', label: '', separator: true },
            {
                id: 'compress',
                label: 'Compress',
                icon: '📦',
                action: () => console.log('Compress'),
            },
            {
                id: 'share',
                label: 'Share...',
                icon: '🔗',
                action: () => console.log('Share'),
            },
            { id: 'sep5', label: '', separator: true },
            {
                id: 'add-to-favorites',
                label: 'Add to Favorites',
                icon: '⭐',
                action: () => {
                    if (targetPath) {
                        addFavorite({
                            id: Date.now().toString(),
                            name: targetPath.split('/').pop() || '',
                            path: targetPath,
                            icon: targetType === 'directory' ? '📁' : '📄',
                            order: 0,
                            addedAt: new Date(),
                        });
                    }
                },
            },
            { id: 'sep6', label: '', separator: true },
            {
                id: 'move-to-trash',
                label: 'Move to Trash',
                icon: '🗑️',
                shortcut: '⌘⌫',
                action: () => openDialog('delete', undefined, { paths: targetPaths }),
            },
        );
    }

    // Add items for multiple selection
    if (targetType === 'multiple') {
        menuItems.push(
            { id: 'sep-m1', label: '', separator: true },
            {
                id: 'new-folder-with-selection',
                label: 'New Folder with Selection',
                icon: '📁',
                action: () => console.log('New folder with selection'),
            },
            { id: 'sep-m2', label: '', separator: true },
            {
                id: 'move-to-trash',
                label: `Move ${targetPaths.length} Items to Trash`,
                icon: '🗑️',
                shortcut: '⌘⌫',
                action: () => openDialog('delete', undefined, { paths: targetPaths }),
            },
        );
    }

    return (
        <div
            ref={menuRef}
            className="fixed min-w-56 bg-white rounded-lg shadow-xl border border-[var(--color-border-subtle)] py-1 z-[9999]"
            style={{
                left: pos.x,
                top: pos.y,
            }}
        >
            {menuItems.map((item) => (
                <MenuItem key={item.id} item={item} onClose={onClose} />
            ))}
        </div>
    );
};

export default FinderContextMenu;
