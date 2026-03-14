/**
 * DockLayout 组件
 * macOS 风格桌面布局（桌面端） + 响应式移动端布局
 * - 桌面端 (≥768px)：MenuBar + AppWindow + macOS Dock
 * - 移动端 (<768px)：MobileHeader + 全屏内容 + MobileTabBar
 */

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { DockContainer } from '../components/dock/index.js';
import { MenuBar, DesktopWallpaper } from '../components/desktop/index.js';
import { MobileTabBar, MobileHeader } from '../components/mobile/index.js';
import { getAppById, getAllAppIds } from '../components/app-registry/index.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import type { AppId } from '../components/app-registry/types.js';
import { useProviders } from '../hooks/useProviders.js';
import { useIsMobile } from '../hooks/useIsMobile.js';

// 导入视图组件
import { ChatView } from '../views/ChatView.js';
import { ConfigView } from '../views/ConfigView.js';
import { CronView } from '../views/CronView.js';
import { AppWindow } from '../components/desktop/index.js';

export function DockLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const { data: providers, isLoading: isProvidersLoading } = useProviders();

    // providers 加载完成且为空时，在顶部栏显示初始化按钮，而非强制跳转
    const showSetupButton = !isProvidersLoading && providers && providers.length === 0;

    // 从 URL 派生 activeApp 状态（移除 #/ 前缀）
    const activeApp = useMemo(() => {
        const hash = location.hash;
        let path = '';

        // 处理 hash 格式：可能是 "#/workspaces" 或 "#workspaces"
        if (hash.startsWith('#/')) {
            path = hash.slice(2); // 移除 #/
        } else if (hash.startsWith('#')) {
            path = hash.slice(1); // 移除 #
        }

        // 移除查询参数（例如 ?tab=models）
        const queryIndex = path.indexOf('?');
        if (queryIndex !== -1) {
            path = path.slice(0, queryIndex);
        }

        // 只返回有效的应用 ID，否则默认为 chat
        if ((getAllAppIds() as string[]).includes(path)) {
            return path as AppId;
        }
        // 如果路径为空或无效，默认为 chat
        return 'chat';
    }, [location.hash]);

    const currentApp = activeApp ? getAppById(activeApp) : null;

    // 处理应用切换（由 DockContainer / MobileTabBar 调用）
    const handleAppChange = useCallback(
        (appId: AppId) => {
            navigate(`#/${appId}`);
        },
        [navigate],
    );

    // ───────────────────────────────────────────────────────────
    // 移动端布局
    // ───────────────────────────────────────────────────────────
    if (isMobile) {
        return (
            <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-50">
                {/* 移动端顶部 Header */}
                <MobileHeader
                    title={currentApp?.name ?? 'Zen Swarm'}
                    actions={
                        showSetupButton
                            ? [
                                  {
                                      id: 'setup',
                                      icon: <span className="text-base">⚙️</span>,
                                      label: '初始化配置',
                                      onClick: () => navigate('/setup'),
                                  },
                              ]
                            : []
                    }
                />

                {/* providers 加载中时显示全屏加载 */}
                {isProvidersLoading && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center gap-4 text-neutral-600 bg-neutral-50">
                        <LoadingSpinner />
                        <span className="text-sm">初始化中...</span>
                    </div>
                )}

                {/* 主内容区域 - 全屏，padding 让内容不被 header/tabbar 遮挡 */}
                <main
                    className="flex-1 flex flex-col min-h-0 overflow-hidden"
                    style={{ paddingTop: '52px', paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.hash || 'empty'}
                            className="flex-1 flex flex-col min-h-0 overflow-hidden"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        >
                            <Suspense
                                fallback={
                                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-neutral-500">
                                        <LoadingSpinner />
                                        <span className="text-sm">加载中...</span>
                                    </div>
                                }
                            >
                                {currentApp ? (
                                    <currentApp.viewComponent />
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-neutral-500">
                                        <span className="text-4xl">💬</span>
                                        <span className="text-sm">选择下方标签开始使用</span>
                                    </div>
                                )}
                            </Suspense>
                        </motion.div>
                    </AnimatePresence>
                </main>

                {/* 移动端底部 Tab Bar */}
                <MobileTabBar activeApp={activeApp} onAppChange={handleAppChange} />
            </div>
        );
    }

    // ───────────────────────────────────────────────────────────
    // 桌面端布局
    // ───────────────────────────────────────────────────────────
    const [isMaximized, setIsMaximized] = useState(true); // 默认铺满

    const handleToggleMaximize = useCallback(() => {
        setIsMaximized((prev) => !prev);
    }, []);

    // 渲染当前应用
    const renderActiveApp = () => {
        if (!currentApp) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/80 pointer-events-none">
                    <span className="text-6xl opacity-60 drop-shadow-lg">🖥️</span>
                    <span className="text-base opacity-80">点击 Dock 中的应用图标以开始</span>
                </div>
            );
        }

        const ViewComponent = currentApp.viewComponent;
        const handleClose = () => {
            navigate('#/');
        };

        return (
            <motion.div
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`flex-1 overflow-hidden ${isMaximized ? '' : 'p-6'}`}
            >
                <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className={`h-full ${isMaximized ? '' : 'max-w-[1400px] mx-auto'}`}
                >
                    <AppWindow
                        appId={activeApp!}
                        appName={currentApp.name}
                        appIcon={currentApp.fullIcon}
                        onClose={handleClose}
                        onMaximize={handleToggleMaximize}
                        isMaximized={isMaximized}
                        showTrafficLights={true}
                    >
                        <ViewComponent />
                    </AppWindow>
                </motion.div>
            </motion.div>
        );
    };

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden">
            {/* 桌面壁纸 */}
            <DesktopWallpaper />

            {/* providers 加载中时显示全屏加载，避免短暂闪烁主界面 */}
            {isProvidersLoading && (
                <div className="fixed inset-0 z-40 flex items-center justify-center gap-4 text-white/80">
                    <LoadingSpinner />
                    <span>初始化中...</span>
                </div>
            )}

            {/* 顶部状态栏 */}
            <MenuBar
                appName={currentApp?.name ?? 'Zen Swarm'}
                appIcon={currentApp?.fullIcon}
                showSetup={showSetupButton}
                onSetup={() => navigate('/setup')}
            />

            {/* 桌面主内容区域 */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden mt-7 mb-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.hash || 'empty'}
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
