/**
 * DockLayout 组件
 * macOS 风格桌面布局，使用 Tailwind CSS 和 React Router
 */

import { Suspense, useCallback, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { DockContainer } from '../components/dock/index.js';
import { MenuBar, DesktopWallpaper } from '../components/desktop/index.js';
import { getAppById } from '../components/app-registry/index.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import type { AppId } from '../components/app-registry/types.js';
import { useProviders } from '../hooks/useProviders.js';

// 导入视图组件
import { ChatView } from '../views/ChatView.js';
import { ConfigView } from '../views/ConfigView.js';
import { CronView } from '../views/CronView.js';
import { AppWindow } from '../components/desktop/index.js';

export function DockLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { data: providers, isLoading: isProvidersLoading } = useProviders();

    // 检测是否需要初始化：providers 加载完成且为空时跳转到 /setup
    useEffect(() => {
        if (!isProvidersLoading && providers && providers.length === 0) {
            navigate('/setup', { replace: true });
        }
    }, [isProvidersLoading, providers, navigate]);

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
        if (['chat', 'config', 'finder', 'sm', 'monitor', 'cron', 'terminal'].includes(path)) {
            return path as AppId;
        }
        // 如果路径为空或无效，默认为 chat
        return 'chat';
    }, [location.hash]);

    const currentApp = activeApp ? getAppById(activeApp) : null;
    const isFullScreen = false; // 所有应用都使用窗口模式

    // 处理应用切换（由 DockContainer 调用）
    const handleAppChange = useCallback(
        (appId: AppId) => {
            navigate(`#/${appId}`);
        },
        [navigate],
    );

    // 渲染当前应用
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
        const handleClose = () => {
            navigate('#/');
        };

        if (isFullScreen) {
            return (
                <AppWindow
                    appId={activeApp!}
                    appName={currentApp.name}
                    appIcon={currentApp.icon}
                    onClose={handleClose}
                    showTrafficLights={true}
                >
                    <ViewComponent />
                </AppWindow>
            );
        }

        return (
            <div className="flex-1 overflow-hidden p-6">
                <div className="max-w-[1400px] mx-auto h-full">
                    <AppWindow
                        appId={activeApp!}
                        appName={currentApp.name}
                        appIcon={currentApp.icon}
                        onClose={handleClose}
                        showTrafficLights={true}
                    >
                        <ViewComponent />
                    </AppWindow>
                </div>
            </div>
        );
    }, [currentApp, isFullScreen, activeApp, navigate]);

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
            <MenuBar appName={currentApp?.name ?? 'Zen Swarm'} appIcon={currentApp?.icon} />

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
