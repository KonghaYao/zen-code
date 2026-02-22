/**
 * FinderStatusBar - 状态栏
 * macOS Finder 风格的底部状态栏
 */

import React from 'react';
import type { FinderFileItem, SelectionState } from '../../../types/finder.js';

// ========================================
// Types
// ========================================

interface FinderStatusBarProps {
    currentPath: string;
    items: FinderFileItem[];
    selection: SelectionState;
    loading: boolean;
}

// ========================================
// Helper Functions
// ========================================

function formatItemCount(count: number, singular: string, plural?: string): string {
    return `${count} ${count === 1 ? singular : plural || singular + 's'}`;
}

function formatTotalSize(items: FinderFileItem[]): string {
    const totalBytes = items.reduce((sum, item) => sum + (item.type === 'file' ? item.size : 0), 0);

    if (totalBytes === 0) return '0 bytes';

    const units = ['bytes', 'KB', 'MB', 'GB'];
    let size = totalBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

// ========================================
// Main Component
// ========================================

export const FinderStatusBar: React.FC<FinderStatusBarProps> = ({ currentPath, items, selection, loading }) => {
    const folderCount = items.filter((item) => item.type === 'directory').length;
    const fileCount = items.filter((item) => item.type === 'file').length;
    const selectedCount = selection.selectedPaths.size;

    // Calculate selected items info
    const selectedItems = items.filter((item) => selection.selectedPaths.has(item.path));
    const selectedFolders = selectedItems.filter((item) => item.type === 'directory').length;
    const selectedFiles = selectedItems.filter((item) => item.type === 'file').length;
    const selectedSize = formatTotalSize(selectedItems.filter((item) => item.type === 'file'));

    // Build status text
    let statusText = '';
    if (loading) {
        statusText = 'Loading...';
    } else if (selectedCount > 0) {
        if (selectedFolders > 0 && selectedFiles > 0) {
            statusText = `${selectedCount} selected (${selectedFolders} folders, ${selectedFiles} files, ${selectedSize})`;
        } else if (selectedFolders > 0) {
            statusText = `${selectedFolders} folder${selectedFolders > 1 ? 's' : ''} selected`;
        } else {
            statusText = `${selectedFiles} file${selectedFiles > 1 ? 's' : ''} selected (${selectedSize})`;
        }
    } else {
        const parts: string[] = [];
        if (folderCount > 0) parts.push(`${folderCount} folder${folderCount > 1 ? 's' : ''}`);
        if (fileCount > 0) parts.push(`${fileCount} file${fileCount > 1 ? 's' : ''}`);
        statusText = parts.join(', ') || 'Empty folder';
    }

    return (
        <div className="flex items-center justify-between px-4 py-1.5 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border-subtle)] text-xs">
            {/* Left side: Status text */}
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                {loading && (
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
                <span>{statusText}</span>
            </div>

            {/* Center: Path bar (optional) */}
            <div className="flex items-center gap-1 text-[var(--color-text-muted)]">
                <span className="opacity-50">{currentPath}</span>
            </div>

            {/* Right side: Available space (placeholder) */}
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                <span>Available: --</span>
            </div>
        </div>
    );
};

export default FinderStatusBar;
