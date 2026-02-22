/**
 * AppWindow 组件
 * 应用窗口容器，提供窗口动画和标题栏，使用 Tailwind CSS
 */

import { Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AppId } from '../app-registry/index.js';
import { LoadingSpinner } from '../LoadingSpinner.js';

interface AppWindowProps {
    appId: AppId;
    appName: string;
    appIcon: string;
    isFullScreen?: boolean;
    onClose?: () => void;
    children: React.ReactNode;
}

export function AppWindow({ isFullScreen = false, onClose, children }: AppWindowProps) {
    const handleClose = useCallback(() => {
        onClose?.();
    }, [onClose]);

    return (
        <motion.div
            className={`flex flex-col h-full w-full bg-neutral-50 dark:bg-neutral-900 overflow-hidden ${isFullScreen ? 'h-full' : ''}`}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
            {/* Window Content */}
            <div className={`flex-1 overflow-auto min-h-0 ${isFullScreen ? 'h-full' : ''}`}>
                <Suspense
                    fallback={
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-500 text-sm">
                            <LoadingSpinner />
                            <span>加载中...</span>
                        </div>
                    }
                >
                    {children}
                </Suspense>
            </div>
        </motion.div>
    );
}

interface AppWindowTransitionProps {
    activeApp: AppId | null;
    children: React.ReactNode;
}

export function AppWindowTransition({ activeApp, children }: AppWindowTransitionProps) {
    return (
        <AnimatePresence mode="wait">
            {activeApp && (
                <motion.div
                    key={activeApp}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="h-full w-full"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
