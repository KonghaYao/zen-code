/**
 * AppWindow 组件
 * 应用窗口容器，提供窗口动画和标题栏，使用 Tailwind CSS
 * 支持 macOS 风格红绿灯按钮
 */

import { Suspense, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AppId } from '../app-registry/index.js';
import { LoadingSpinner } from '../LoadingSpinner.js';
import { TrafficLights } from '../ui/TrafficLights.js';

interface AppWindowProps {
    appId: AppId;
    appName: string;
    appIcon: ReactNode;
    isFullScreen?: boolean;
    onClose?: () => void;
    children: React.ReactNode;
    /** 是否显示红绿灯（默认 true） */
    showTrafficLights?: boolean;
    /** 是否显示标题栏（默认 true，showTrafficLights 为 true 时有效） */
    showTitleBar?: boolean;
}

export function AppWindow({
    appId,
    appName,
    isFullScreen = false,
    onClose,
    children,
    showTrafficLights = true,
    showTitleBar = true,
}: AppWindowProps) {
    const handleClose = useCallback(() => {
        onClose?.();
    }, [onClose]);

    return (
        <motion.div
            className={`flex flex-col h-full w-full bg-white dark:bg-neutral-900 overflow-hidden rounded-xl ${isFullScreen ? 'h-full' : ''}`}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
            {/* macOS Style Title Bar with Traffic Lights */}
            {showTrafficLights && showTitleBar && (
                <header className="flex-shrink-0 bg-[var(--color-bg-tertiary)] px-4 py-3 flex items-center border-b border-[var(--color-border-subtle)] rounded-t-xl">
                    <TrafficLights onClose={handleClose} />
                    <span className="ml-4 text-sm font-medium text-[var(--color-text-secondary)] select-none">
                        {appName}
                    </span>
                </header>
            )}

            {/* Window Content */}
            <div className={`flex-1 overflow-hidden min-h-0 ${isFullScreen ? 'h-full' : ''}`}>
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
