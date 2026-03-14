/**
 * ContextMenu — Generic positioned context menu for postman tree
 */

import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
    label: string;
    onClick: () => void;
    danger?: boolean;
    separator?: boolean;
    disabled?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Adjust position so menu doesn't go off screen
    const menuWidth = 180;
    const menuHeight = items.length * 30;
    const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8);
    const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8);

    return (
        <div
            ref={ref}
            className="fixed z-50 bg-white border border-border-subtle rounded-lg shadow-lg py-1 min-w-44"
            style={{ left: adjustedX, top: adjustedY }}
        >
            {items.map((item, i) =>
                item.separator ? (
                    <div key={i} className="my-1 border-t border-border-subtle" />
                ) : (
                    <button
                        key={i}
                        onClick={() => {
                            if (!item.disabled) {
                                item.onClick();
                                onClose();
                            }
                        }}
                        disabled={item.disabled}
                        className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                            item.disabled
                                ? 'text-text-muted cursor-not-allowed'
                                : item.danger
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-text-primary hover:bg-bg-hover'
                        }`}
                    >
                        {item.label}
                    </button>
                ),
            )}
        </div>
    );
}
