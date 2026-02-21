/**
 * TabBar 组件 - 标签栏
 * 水平排列的 Tab 列表，参考 Cursor/VSCode 设计
 */

import React from 'react';
import type { RightPanelType, RightPanelConfig } from '../../../types/rightPanel.js';
import { Tab } from './Tab.js';

interface TabBarProps {
    panels: RightPanelConfig[];
    activePanel: RightPanelType;
    onPanelChange: (panelId: RightPanelType) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ panels, activePanel, onPanelChange }) => {
    return (
        <div className="flex items-center border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]">
            {panels.map((panel) => (
                <Tab
                    key={panel.id}
                    id={panel.id}
                    icon={panel.icon}
                    label={panel.label}
                    shortcut={panel.shortcut}
                    isActive={activePanel === panel.id}
                    onClick={() => onPanelChange(panel.id)}
                />
            ))}
        </div>
    );
};

export default TabBar;
