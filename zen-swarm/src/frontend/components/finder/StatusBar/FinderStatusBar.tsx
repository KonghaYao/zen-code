/**
 * FinderStatusBar - 状态栏（紧凑化重设计）
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
// Main Component
// ========================================

export const FinderStatusBar: React.FC<FinderStatusBarProps> = ({ items, selection, loading }) => {
    const selectedCount = selection.selectedPaths.size;
    const totalCount = items.length;

    let statusText = '';
    if (loading) {
        statusText = 'Loading…';
    } else if (selectedCount > 0) {
        statusText = `${selectedCount} selected`;
    } else {
        statusText = `${totalCount} item${totalCount !== 1 ? 's' : ''}`;
    }

    return (
        <div
            className="flex items-center justify-center h-[22px] text-[11px] tracking-[-0.01em] select-none text-[rgba(60,60,67,0.6)] bg-[rgba(246,246,246,0.85)] border-t border-t-[rgba(0,0,0,0.1)]"
            style={{
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderTop: '0.5px solid rgba(0,0,0,0.1)',
            }}
        >
            <span>{statusText}</span>
        </div>
    );
};

export default FinderStatusBar;
