/**
 * DragHandle — 可拖拽的分割线，用于调整请求/响应区域比例
 */

import { useState, useRef, useCallback } from 'react';

interface DragHandleProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    onRatioChange: (ratio: number) => void; // 0.1 ~ 0.9
}

export function DragHandle({ containerRef, onRatioChange }: DragHandleProps) {
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';

            const onMouseMove = (ev: MouseEvent) => {
                const container = containerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const ratio = (ev.clientY - rect.top) / rect.height;
                onRatioChange(Math.min(0.9, Math.max(0.1, ratio)));
            };

            const onMouseUp = () => {
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        },
        [containerRef, onRatioChange],
    );

    return (
        <div
            onMouseDown={handleMouseDown}
            className="flex-shrink-0 h-1.5 cursor-row-resize bg-border-subtle hover:bg-primary/40 transition-colors group relative"
            title="拖拽调整高度"
        >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-border-subtle group-hover:bg-primary/60 transition-colors" />
        </div>
    );
}

// 比例持久化 hook
export function useSplitRatio(key: string, defaultRatio: number): [number, (r: number) => void] {
    const [ratio, setRatio] = useState<number>(() => {
        const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (stored !== null) {
            const parsed = parseFloat(stored);
            if (!isNaN(parsed)) return parsed;
        }
        return defaultRatio;
    });

    const setAndPersist = useCallback(
        (r: number) => {
            setRatio(r);
            localStorage.setItem(key, String(r));
        },
        [key],
    );

    return [ratio, setAndPersist];
}
