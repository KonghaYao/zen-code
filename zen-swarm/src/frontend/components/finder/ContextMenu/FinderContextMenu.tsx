import React, { useEffect, useRef, useCallback } from 'react';
import path from 'path';
import type { ContextMenuItem } from '../../../types/finder.js';
import { useFinderStore } from '../../../stores/finder.js';
import { useWorkspaceStore } from '../../../stores/workspace.js';

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
    const rootPath = useFinderStore((s) => s.rootPath);
    const { createWorkspace, setCurrentWorkspace } = useWorkspaceStore();

    // Convert relative path to absolute path for workspace creation
    // SidebarItem paths are relative (e.g., "packages", "/packages") but workspaces need absolute paths
    const resolveToAbsolutePath = useCallback(
        (inputPath: string): string => {
            console.log('[resolveToAbsolutePath] inputPath:', inputPath);
            console.log('[resolveToAbsolutePath] rootPath:', rootPath);

            // Check if it's a real filesystem absolute path (e.g., /Users/xxx/... or /home/xxx/...)
            // Paths like "/packages" or "/src" from Finder are NOT real absolute paths
            const isRealAbsolutePath =
                inputPath.startsWith('/') &&
                (inputPath.includes('/Users/') || inputPath.includes('/home/') || inputPath.length > 30);

            console.log('[resolveToAbsolutePath] isRealAbsolutePath:', isRealAbsolutePath);

            if (isRealAbsolutePath) {
                const resolved = path.resolve(inputPath);
                console.log('[resolveToAbsolutePath] resolved (absolute):', resolved);
                return resolved;
            }

            // It's a relative path from sidebar or Finder (e.g., "packages", "/packages")
            // Remove leading slash if present, then resolve against rootPath
            const relativePath = inputPath.startsWith('/') ? inputPath.slice(1) : inputPath;
            console.log('[resolveToAbsolutePath] relativePath:', relativePath);
            const resolved = path.resolve(rootPath, relativePath);
            console.log('[resolveToAbsolutePath] resolved (relative):', resolved);
            return resolved;
        },
        [rootPath],
    );

    // Copy absolute path to clipboard
    const copyAbsolutePath = useCallback(async (path: string) => {
        try {
            await navigator.clipboard.writeText(path);
            // Optionally show a toast notification
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    }, []);

    // Copy relative path to clipboard
    const copyRelativePath = useCallback(
        async (targetPath: string) => {
            try {
                const relative = path.relative(rootPath, targetPath);
                await navigator.clipboard.writeText(relative);
            } catch (err) {
                console.error('Failed to copy to clipboard:', err);
            }
        },
        [rootPath],
    );

    // Create workspace from path
    const createWorkspaceFromPath = useCallback(
        async (targetPath: string, isDirectory: boolean) => {
            try {
                // Only allow creating workspace from directories
                if (!isDirectory) {
                    alert('Can only create workspace from a directory, not a file.');
                    return;
                }

                // Convert to absolute path for workspace creation
                const absolutePath = resolveToAbsolutePath(targetPath);

                // Use path.basename to extract folder name
                const name = path.basename(absolutePath) || 'Untitled Workspace';

                // Log for debugging
                console.log('Creating workspace:', {
                    originalPath: targetPath,
                    absolutePath,
                    name,
                    rootPath,
                });

                const workspace = await createWorkspace({
                    name,
                    rootPath: absolutePath,
                });
                await setCurrentWorkspace(workspace.id);

                // Show success feedback
                if (typeof window !== 'undefined') {
                    console.log(`Created workspace: ${name}`);
                }
            } catch (err: any) {
                const message = err.message || 'Unknown error';
                alert(`Failed to create workspace: ${message}`);
                console.error('Failed to create workspace:', err);
            }
        },
        [createWorkspace, setCurrentWorkspace, resolveToAbsolutePath, rootPath],
    );

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
                id: 'copy-absolute-path',
                label: 'Copy Absolute Path',
                icon: '📎',
                action: () => targetPath && copyAbsolutePath(targetPath),
            },
            {
                id: 'copy-relative-path',
                label: 'Copy Relative Path',
                icon: '📝',
                action: () => targetPath && copyRelativePath(targetPath),
            },
            { id: 'sep3', label: '', separator: true },
            {
                id: 'as-workspace',
                label: 'Open as Workspace',
                icon: '⚙️',
                action: () => targetPath && createWorkspaceFromPath(targetPath, targetType === 'directory'),
            },
            { id: 'sep4', label: '', separator: true },
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
