/**
 * DesktopArea 组件
 * 桌面主内容区域，使用 Tailwind CSS
 */

import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

interface DesktopAreaProps {
    children: ReactNode;
    showBackground?: boolean;
}

export function DesktopArea({ children, showBackground = false }: DesktopAreaProps) {
    return (
        <div className="relative flex flex-col flex-1 min-h-0 bg-neutral-50 dark:bg-neutral-900 overflow-hidden">
            <AnimatePresence mode="wait">{children}</AnimatePresence>

            {/* 空闲状态背景 */}
            {showBackground && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 pointer-events-none">
                    <div className="text-6xl opacity-30">🖥️</div>
                    <div className="text-base opacity-60">点击 Dock 中的应用图标以开始</div>
                </div>
            )}
        </div>
    );
}

interface DesktopContentProps {
    appKey: string;
    children: ReactNode;
    isFullScreen?: boolean;
}

export function DesktopContent({ appKey, children, isFullScreen = false }: DesktopContentProps) {
    return (
        <motion.div
            key={appKey}
            className={`flex flex-col h-full w-full ${isFullScreen ? 'full-screen' : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
            {children}
        </motion.div>
    );
}
