import React, { ReactNode } from 'react';
import { usePanelLayout } from './PanelLayout.js';
import { PanelSplitter } from './PanelSplitter.js';

// ========================================
// Types
// ========================================

export type PanelPosition = 'left' | 'right' | 'center';

interface PanelItemProps {
    children: ReactNode;
    id: string;
    position?: PanelPosition;
    className?: string;
}

// ========================================
// PanelItem - 单个面板项（使用 PanelLayout Context）
// ========================================

export const PanelItem: React.FC<PanelItemProps> = ({ children, id, position = 'center', className = '' }) => {
    const { containerWidth, handleResizeStart, getPanelWidth, isPanelVisible } = usePanelLayout();

    if (!isPanelVisible(id)) {
        return null;
    }

    const width = getPanelWidth(id);

    // 左侧面板：调整手柄在右侧
    if (position === 'left') {
        return (
            <>
                <div style={{ width: `${width}px` }} className={className}>
                    {children}
                </div>
                <PanelSplitter onResizeStart={(e) => handleResizeStart(id, e)} />
            </>
        );
    }

    // 右侧面板：调整手柄在左侧
    if (position === 'right') {
        return (
            <>
                <PanelSplitter onResizeStart={(e) => handleResizeStart(id, e)} />
                <div style={{ width: `${width}px` }} className={className}>
                    {children}
                </div>
            </>
        );
    }

    // Center panel: flex-1（不需要调整手柄）
    return <div className="flex-1 overflow-y-auto overflow-x-hidden">{children}</div>;
};
