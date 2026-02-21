/**
 * Tab 组件 - 单个标签页
 * 参考 Cursor/VSCode 的 Tab 设计
 */

import React from 'react';
import type { RightPanelType } from '../../../types/rightPanel.js';

interface TabProps {
    id: RightPanelType;
    icon: React.ReactNode;
    label: string;
    shortcut?: string;
    isActive: boolean;
    onClick: () => void;
}

export const Tab: React.FC<TabProps> = ({ icon, label, shortcut, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-3 py-2 text-sm font-medium
                border-b-2 transition-all duration-150
                ${
                    isActive
                        ? 'text-[var(--color-primary)] border-[var(--color-primary)] bg-[var(--color-primary-light)]/30'
                        : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                }
            `}
            title={shortcut ? `${label} (${shortcut})` : label}
        >
            <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">{icon}</span>
            <span className="truncate">{label}</span>
        </button>
    );
};

export default Tab;
