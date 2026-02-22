/**
 * Dock 右键上下文菜单
 * 使用 Tailwind CSS
 */

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { AppId, ContextAction } from '../app-registry/index.js';

interface DockContextMenuProps {
    appId: AppId | null;
    position: { x: number; y: number };
    onClose: () => void;
    onAction: (appId: AppId, action: ContextAction) => void;
    isOpened: boolean;
    hasNotification?: boolean;
}

const contextMenuItems: { action: ContextAction; icon: string; label: string }[] = [
    { action: 'open', icon: '📂', label: '打开' },
    { action: 'help', icon: '❓', label: '帮助' },
];

export function DockContextMenu({
    appId,
    position,
    onClose,
    onAction,
    isOpened,
    hasNotification = false,
}: DockContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // 调整菜单位置
    const adjustedPosition = {
        x: Math.min(position.x, window.innerWidth - 180),
        y: Math.min(position.y, window.innerHeight - 150),
    };

    const handleAction = (action: ContextAction) => {
        if (appId) {
            onAction(appId, action);
            onClose();
        }
    };

    // 根据当前状态调整菜单项
    const menuItems = contextMenuItems.filter((item) => {
        if (item.action === 'open' && isOpened) {
            return false;
        }
        return true;
    });

    return (
        <motion.div
            ref={menuRef}
            style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
            className="
                fixed z-[1000]
                min-w-[160px]
                bg-white dark:bg-neutral-800
                border border-neutral-200 dark:border-neutral-700
                rounded-lg shadow-lg
                p-1
            "
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.1 }}
        >
            {menuItems.map((item) => (
                <button
                    key={item.action}
                    onClick={() => handleAction(item.action)}
                    className="
                        w-full flex items-center gap-2
                        px-3 py-2
                        text-sm text-neutral-700 dark:text-neutral-200
                        bg-transparent
                        rounded-md
                        cursor-pointer
                        text-left
                        transition-colors duration-100
                        hover:bg-neutral-100 dark:hover:bg-neutral-700
                    "
                >
                    <span className="text-sm w-4 text-center">{item.icon}</span>
                    <span>{item.label}</span>
                </button>
            ))}

            {hasNotification && (
                <>
                    <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />
                    <button
                        onClick={() => handleAction('notifications')}
                        className="
                            w-full flex items-center gap-2
                            px-3 py-2
                            text-sm text-neutral-700 dark:text-neutral-200
                            bg-transparent
                            rounded-md
                            cursor-pointer
                            text-left
                            transition-colors duration-100
                            hover:bg-neutral-100 dark:hover:bg-neutral-700
                        "
                    >
                        <span className="text-sm w-4 text-center">🔔</span>
                        <span>查看通知</span>
                    </button>
                </>
            )}
        </motion.div>
    );
}
