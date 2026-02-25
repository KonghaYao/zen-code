import React, { ReactNode, useState, useCallback, useRef, useEffect } from 'react';
import { PanelSplitter } from './PanelSplitter.js';

// ========================================
// Types
// ========================================

export type PanelPosition = 'left' | 'right' | 'center';

interface ResizablePanelProps {
    children: ReactNode;
    id: string;
    position?: PanelPosition;
    defaultWidth?: number;
    minPanelWidth?: number;
    maxWidthPercent?: number;
    className?: string;
    containerRef?: React.RefObject<HTMLDivElement>;
    onResizeEnd?: (id: string, width: number) => void;
}

interface PanelResizeState {
    isResizing: boolean;
    panel: string | null;
    startX: number;
    startWidth: number;
}

// ========================================
// Constants
// ========================================

const DEFAULT_MIN_PANEL_WIDTH = 200;
const DEFAULT_MAX_PANEL_WIDTH_PERCENT = 35;

// ========================================
// ResizablePanel - 独立的面板组件
// ========================================

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
    children,
    id,
    position = 'center',
    defaultWidth = 300,
    minPanelWidth = DEFAULT_MIN_PANEL_WIDTH,
    maxWidthPercent = DEFAULT_MAX_PANEL_WIDTH_PERCENT,
    className = '',
    containerRef,
    onResizeEnd,
}) => {
    // ========================================
    // State
    // ========================================
    const [width, setWidth] = useState(defaultWidth);
    const [visible, setVisible] = useState(true);

    // 全局调整状态（通过 context 管理会更好，这里先简化处理）
    const [resizeState, setResizeState] = useState<PanelResizeState>({
        isResizing: false,
        panel: null,
        startX: 0,
        startWidth: 0,
    });

    // ========================================
    // Handlers
    // ========================================
    const handleResizeStart = useCallback(
        (e: React.MouseEvent) => {
            const container = containerRef?.current;
            if (!container) return;

            setResizeState({
                isResizing: true,
                panel: id,
                startX: e.clientX,
                startWidth: width,
            });
        },
        [id, width, containerRef],
    );

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            const container = containerRef?.current;
            if (!resizeState.isResizing || resizeState.panel !== id || !container) return;

            const containerWidth = container.offsetWidth;
            const maxWidth = containerWidth * (maxWidthPercent / 100);
            const delta = e.clientX - resizeState.startX;

            // 左侧和右侧面板需要不同的计算方式
            let newWidth: number;
            if (position === 'left') {
                newWidth = Math.max(minPanelWidth, Math.min(maxWidth, resizeState.startWidth + delta));
            } else if (position === 'right') {
                newWidth = Math.max(minPanelWidth, Math.min(maxWidth, resizeState.startWidth - delta));
            } else {
                // Center panels don't resize via splitter
                return;
            }

            setWidth(newWidth);
        },
        [resizeState, id, maxWidthPercent, minPanelWidth, position],
    );

    const handleResizeEnd = useCallback(() => {
        if (resizeState.isResizing && resizeState.panel === id) {
            setResizeState({
                isResizing: false,
                panel: null,
                startX: 0,
                startWidth: 0,
            });
            onResizeEnd?.(id, width);
        }
    }, [resizeState, id, width, onResizeEnd]);

    // ========================================
    // Effects - 鼠标事件监听
    // ========================================
    useEffect(() => {
        if (resizeState.isResizing && resizeState.panel === id) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleResizeEnd);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleResizeEnd);
            };
        }
        return undefined;
    }, [resizeState, id, handleMouseMove, handleResizeEnd]);

    // ========================================
    // Toggle Visibility
    // ========================================
    const toggle = useCallback(() => {
        setVisible((prev) => !prev);
    }, []);

    // ========================================
    // Render
    // ========================================
    if (!visible) {
        return null;
    }

    // 左侧面板：调整手柄在右侧
    if (position === 'left') {
        return (
            <>
                <div style={{ width: `${width}px` }} className={className}>
                    {children}
                </div>
                <PanelSplitter onResizeStart={handleResizeStart} isResizing={resizeState.isResizing} />
            </>
        );
    }

    // 右侧面板：调整手柄在左侧
    if (position === 'right') {
        return (
            <>
                <PanelSplitter onResizeStart={handleResizeStart} isResizing={resizeState.isResizing} />
                <div style={{ width: `${width}px` }} className={className}>
                    {children}
                </div>
            </>
        );
    }

    // Center panel: flex-1（不需要调整手柄）
    return (
        <>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
        </>
    );
};
