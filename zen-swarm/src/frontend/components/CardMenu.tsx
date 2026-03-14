/**
 * CardMenu 组件
 *
 * 卡片右上角的三点菜单，用于展示操作选项
 */

import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from './ui/Icons.js';
import { IconButton } from './ui/IconButton.js';

export interface MenuItem {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger';
}

interface CardMenuProps {
    items: MenuItem[];
}

export function CardMenu({ items }: CardMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={menuRef}>
            <IconButton onClick={() => setIsOpen(!isOpen)} aria-label="More options" className="w-8 h-8">
                <MoreVertical className="w-5 h-5" />
            </IconButton>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-border-subtle py-1 z-50">
                    {items.map((item, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                item.onClick();
                                setIsOpen(false);
                            }}
                            className={`
                                w-full px-4 py-2 text-left text-sm
                                ${item.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-text-primary hover:bg-bg-tertiary'}
                            `}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
