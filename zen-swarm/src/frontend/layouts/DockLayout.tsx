/**
 * DockLayout 组件
 * macOS 风格桌面布局，使用 Tailwind CSS
 */

import { Suspense, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DockContainer, useDockState } from '../components/dock/index.js';
import { MenuBar, DesktopWallpaper } from '../components/desktop/index.js';
import { getAppById } from '../components/app-registry/index.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';

export function DockLayout() {
    const { activeApp, handleAppChange } = useDockState('dashboard');
    const currentApp = activeApp ? getAppById(activeApp) : null;
    const isFullScreen = activeApp === 'files';

    const renderActiveApp = useCallback(() => {
        if (!currentApp) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/80 pointer-events-none">
                    <span className="text-6xl opacity-60 drop-shadow-lg">🖥️</span>
                    <span className="text-base opacity-80">点击 Dock 中的应用图标以开始</span>
                </div>
            );
        }

        const ViewComponent = currentApp.viewComponent;

        if (isFullScreen) {
            return <ViewComponent />;
        }

        return (
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-[1400px] mx-auto bg-white/85 dark:bg-neutral-800/85 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/30 dark:border-neutral-700/30">
                    <ViewComponent />
                </div>
            </div>
        );
    }, [currentApp, isFullScreen]);

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden">
            {/* 桌面壁纸 */}
            <DesktopWallpaper />

            {/* 顶部状态栏 */}
            <MenuBar appName={currentApp?.name ?? 'Zen Swarm'} appIcon={currentApp?.icon ?? '🐝'} />

            {/* 桌面主内容区域 */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden mt-7 mb-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeApp || 'empty'}
                        className="flex-1 flex flex-col min-h-0 overflow-hidden"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                        <Suspense
                            fallback={
                                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/80">
                                    <LoadingSpinner />
                                    <span>加载中...</span>
                                </div>
                            }
                        >
                            {renderActiveApp()}
                        </Suspense>
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* 底部 Dock */}
            <DockContainer activeApp={activeApp} onAppChange={handleAppChange} />
        </div>
    );
}

export default DockLayout;
