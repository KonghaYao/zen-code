import React, { useEffect, useRef, useCallback } from 'react';
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
    if (item.separator) {
        return <div className="h-px bg-[var(--color-border-subtle)] my-1 mx-3" />;
    }

    const handleClick = () => {
        if (item.action) {
            item.action();
            onClose();
        }
    };

    return (
        <button
            onClick={handleClick}
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
            {item.shortcut && <span className="text-xs text-[var(--color-text-muted)]">{item.shortcut}</span>}
        </button>
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
    const openInspector = useFinderStore((s) => s.openInspector);
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
            // Make sure menu doesn't go off the right side
            if (x + menuWidth > window.innerWidth) {
                x = window.innerWidth - menuWidth - 10;
            }
            // Make sure menu doesn't go off the bottom
            if (y + menuHeight > window.innerHeight) {
                y = window.innerHeight - menuHeight - 10;
            }
        }

        return { x, y };
    }, [position]);

    const pos = adjustedPosition();

    // Build menu items based on context - only include functional features
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
              ]
            : [
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
                  { id: 'sep1', label: '', separator: true },
                  {
                      id: 'move-to-trash',
                      label: 'Move to Trash',
                      icon: '🗑️',
                      shortcut: '⌘⌫',
                      action: () => openDialog('delete', undefined, { paths: targetPaths }),
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
                id: 'get-info',
                label: 'Get Info',
                icon: 'ℹ️',
                shortcut: '⌘I',
                action: () => targetPath && openInspector(targetPath),
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
