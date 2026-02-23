import React, { useCallback } from 'react';

interface PanelSplitterProps {
    onResizeStart: (e: React.MouseEvent) => void;
    isResizing?: boolean;
    orientation?: 'horizontal' | 'vertical';
    className?: string;
}

/**
 * PanelSplitter - 面板调整手柄
 *
 * 功能：
 * - 视觉：可拖拽的分隔条
 * - 交互：onResizeStart 开始调整
 * - 反馈：悬停和拖拽状态的高亮效果
 */
export const PanelSplitter: React.FC<PanelSplitterProps> = ({
    onResizeStart,
    isResizing = false,
    orientation = 'horizontal',
    className = '',
}) => {
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            // 只响应左键
            if (e.button !== 0) return;
            e.preventDefault();
            onResizeStart(e);
        },
        [onResizeStart],
    );

    return (
        <div
            className={`
                cursor-col-resize
                hover:bg-[var(--color-primary)]
                transition-colors
                ${isResizing ? 'bg-[var(--color-primary)]' : ''}
                ${orientation === 'vertical' ? 'cursor-row-resize' : 'cursor-col-resize'}
                ${className}
            `}
            onMouseDown={handleMouseDown}
        />
    );
};
