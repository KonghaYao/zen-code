import React, { ReactNode, useCallback, useState, useRef, useEffect, createContext, useContext } from 'react';
import type { PanelPosition } from './PanelItem.js';

// ========================================
// Types
// ========================================

interface PanelConfig {
    id: string;
    position: PanelPosition;
    defaultWidth?: number;
    visible?: boolean;
    minPanelWidth?: number;
    maxWidthPercent?: number;
}

interface PanelLayoutContextValue {
    containerWidth: number;
    handleResizeStart: (panelId: string, e: React.MouseEvent) => void;
    handleResizeEnd: (panelId: string) => void;
    getPanelWidth: (panelId: string) => number;
    setPanelWidth: (panelId: string, width: number) => void;
    togglePanel: (panelId: string) => void;
    isPanelVisible: (panelId: string) => boolean;
}

const PanelLayoutContext = createContext<PanelLayoutContextValue | null>(null);

// ========================================
// Hook
// ========================================

export const usePanelLayout = () => {
    const context = useContext(PanelLayoutContext);
    if (!context) {
        throw new Error('usePanelLayout must be used within PanelLayout');
    }
    return context;
};

// ========================================
// Internal State
// ========================================

interface PanelState {
    width: number;
    visible: boolean;
}

interface ResizeState {
    isResizing: boolean;
    panel: string | null;
    startX: number;
    startWidth: number;
}

// ========================================
// PanelLayout - 多面板布局容器
// ========================================

interface PanelLayoutProps {
    children: ReactNode;
    panels: PanelConfig[];
    minPanelWidth?: number;
    maxWidthPercent?: number;
    className?: string;
    onResizeEnd?: (panelId: string, width: number) => void;
}

export const PanelLayout: React.FC<PanelLayoutProps> = ({
    children,
    panels,
    minPanelWidth = 200,
    maxWidthPercent = 35,
    className = '',
    onResizeEnd,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    // 面板状态管理
    const [panelsState, setPanelsState] = useState<Record<string, PanelState>>(() => {
        const initial: Record<string, PanelState> = {};
        panels.forEach((panel) => {
            initial[panel.id] = {
                width: panel.defaultWidth || 300,
                visible: panel.visible !== false,
            };
        });
        return initial;
    });

    // 调整状态
    const [resizeState, setResizeState] = useState<ResizeState>({
        isResizing: false,
        panel: null,
        startX: 0,
        startWidth: 0,
    });

    // ========================================
    // Effects
    // ========================================
    useEffect(() => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.offsetWidth);
        }
    }, []);

    // ========================================
    // Handlers
    // ========================================
    const handleResizeStart = useCallback(
        (panelId: string, e: React.MouseEvent) => {
            const panelState = panelsState[panelId];
            if (!panelState) return;

            setResizeState({
                isResizing: true,
                panel: panelId,
                startX: e.clientX,
                startWidth: panelState.width,
            });
        },
        [panelsState],
    );

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!resizeState.isResizing || !resizeState.panel || !containerRef.current) return;

            const panel = panels.find((p) => p.id === resizeState.panel);
            if (!panel) return;

            const maxWidth = (containerWidth * (panel.maxWidthPercent ?? maxWidthPercent)) / 100;
            const minW = panel.minPanelWidth ?? minPanelWidth;
            const delta = e.clientX - resizeState.startX;

            let newWidth: number;
            if (panel.position === 'left') {
                newWidth = Math.max(minW, Math.min(maxWidth, resizeState.startWidth + delta));
            } else if (panel.position === 'right') {
                newWidth = Math.max(minW, Math.min(maxWidth, resizeState.startWidth - delta));
            } else {
                return;
            }

            setPanelsState((prev) => ({
                ...prev,
                [resizeState.panel!]: {
                    ...prev[resizeState.panel!],
                    width: newWidth,
                },
            }));
        },
        [resizeState, panels, containerWidth, maxWidthPercent, minPanelWidth],
    );

    const handleResizeEnd = useCallback(() => {
        if (resizeState.isResizing && resizeState.panel) {
            const width = panelsState[resizeState.panel].width;
            setResizeState({
                isResizing: false,
                panel: null,
                startX: 0,
                startWidth: 0,
            });
            onResizeEnd?.(resizeState.panel, width);
        }
    }, [resizeState, panelsState, onResizeEnd]);

    const getPanelWidth = useCallback(
        (panelId: string) => {
            return panelsState[panelId]?.width || 300;
        },
        [panelsState],
    );

    const setPanelWidth = useCallback((panelId: string, width: number) => {
        setPanelsState((prev) => ({
            ...prev,
            [panelId]: {
                ...prev[panelId],
                width,
            },
        }));
    }, []);

    const togglePanel = useCallback((panelId: string) => {
        setPanelsState((prev) => ({
            ...prev,
            [panelId]: {
                ...prev[panelId],
                visible: !prev[panelId].visible,
            },
        }));
    }, []);

    const isPanelVisible = useCallback(
        (panelId: string) => {
            return panelsState[panelId]?.visible ?? true;
        },
        [panelsState],
    );

    // 全局鼠标事件监听
    useEffect(() => {
        if (resizeState.isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleResizeEnd);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleResizeEnd);
            };
        }
        return undefined;
    }, [resizeState, handleMouseMove, handleResizeEnd]);

    // ========================================
    // Context Value
    // ========================================
    const contextValue: PanelLayoutContextValue = {
        containerWidth,
        handleResizeStart,
        handleResizeEnd,
        getPanelWidth,
        setPanelWidth,
        togglePanel,
        isPanelVisible,
    };

    // ========================================
    // Render
    // ========================================
    return (
        <PanelLayoutContext.Provider value={contextValue}>
            <div className={`flex flex-col h-full overflow-hidden ${className}`} ref={containerRef}>
                <div className="flex-1 flex min-h-0 overflow-hidden">{children}</div>
            </div>
        </PanelLayoutContext.Provider>
    );
};
