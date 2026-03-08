/**
 * DockContainer 组件
 * macOS 风格 Dock，使用 CSS 实现磨砂玻璃效果 + JS 实现放大动画
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DockAppItem } from './DockAppItem.js';
import { DockContextMenu } from './DockContextMenu.js';
import type { AppId, ContextAction, NotificationState, NotificationData } from '../app-registry/index.js';
import { appRegistry, getDefaultAppId } from '../app-registry/index.js';

interface DockContainerProps {
    activeApp: AppId | null;
    onAppChange: (appId: AppId) => void;
    notifications?: NotificationData;
}

/**
 * DockContainer 组件
 */
export function DockContainer({ activeApp, onAppChange, notifications = {} }: DockContainerProps) {
    const dockRef = useRef<HTMLElement>(null);
    const mouseXRef = useRef<number>(-1000);

    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        appId: AppId | null;
        position: { x: number; y: number };
    }>({
        isOpen: false,
        appId: null,
        position: { x: 0, y: 0 },
    });

    // 处理鼠标移动 - 更新图标大小
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        mouseXRef.current = e.clientX;
        updateDockItems();
    }, []);

    // 处理鼠标离开
    const handleMouseLeave = useCallback(() => {
        mouseXRef.current = -1000;
        updateDockItems();
    }, []);

    // 更新所有 dock item 的大小
    const updateDockItems = useCallback(() => {
        const dock = dockRef.current;
        if (!dock) return;

        const items = dock.querySelectorAll('.dock-item') as NodeListOf<HTMLElement>;
        const mouseX = mouseXRef.current;

        items.forEach((item) => {
            const rect = item.getBoundingClientRect();
            const itemCenterX = rect.left + rect.width / 2;
            const distance = Math.abs(mouseX - itemCenterX);

            // 放大参数 - 高斯分布实现苹果风格平滑波形
            const minSize = 52; // 最小尺寸
            const maxSize = 88; // 最大尺寸
            const sigma = 90; // 标准差，控制影响范围的宽窄

            // 高斯分布：峰值平滑，边缘自然衰减
            const gaussianFactor = Math.exp(-(distance * distance) / (2 * sigma * sigma));
            const size = minSize + (maxSize - minSize) * gaussianFactor;

            item.style.setProperty('--dock-item-size', `${size}px`);
        });
    }, []);

    // 处理应用点击
    const handleAppClick = useCallback(
        (appId: AppId) => {
            console.log('🖱️ DockContainer - handleAppClick called with appId:', appId);
            onAppChange(appId);
        },
        [onAppChange],
    );

    // 处理右键菜单
    const handleContextMenu = useCallback((e: React.MouseEvent, appId: AppId) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            isOpen: true,
            appId,
            position: { x: e.clientX, y: e.clientY },
        });
    }, []);

    // 关闭右键菜单
    const closeContextMenu = useCallback(() => {
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
    }, []);

    // 处理右键菜单动作
    const handleContextAction = useCallback(
        (appId: AppId, action: ContextAction) => {
            switch (action) {
                case 'open':
                    onAppChange(appId);
                    break;
                case 'help':
                    console.log('Help for:', appId);
                    break;
                case 'notifications':
                    console.log('View notifications for:', appId);
                    break;
                default:
                    break;
            }
        },
        [onAppChange],
    );

    // 关闭右键菜单（点击外部）
    useEffect(() => {
        const handleClickOutside = () => {
            if (contextMenu.isOpen) {
                closeContextMenu();
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [contextMenu.isOpen, closeContextMenu]);

    // 键盘快捷键支持
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
                const index = parseInt(e.key) - 1;
                if (index < appRegistry.length) {
                    e.preventDefault();
                    onAppChange(appRegistry[index].id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onAppChange]);

    const currentAppNotification = contextMenu.appId ? notifications[contextMenu.appId] : undefined;

    return (
        <>
            {/* macOS 风格 Dock */}
            <nav
                ref={dockRef}
                className="dock-container"
                role="navigation"
                aria-label="应用导航"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {appRegistry.map((app) => (
                    <DockAppItem
                        key={app.id}
                        appId={app.id}
                        fullIcon={app.fullIcon}
                        label={app.name}
                        isActive={activeApp === app.id}
                        notification={notifications[app.id]}
                        onClick={() => handleAppClick(app.id)}
                        onContextMenu={handleContextMenu}
                    />
                ))}
            </nav>

            {/* 右键菜单 */}
            <AnimatePresence>
                {contextMenu.isOpen && (
                    <DockContextMenu
                        appId={contextMenu.appId}
                        position={contextMenu.position}
                        onClose={closeContextMenu}
                        onAction={handleContextAction}
                        isOpened={contextMenu.appId === activeApp}
                        hasNotification={currentAppNotification !== undefined && currentAppNotification.count > 0}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

/**
 * useDockState Hook
 */
export function useDockState(defaultApp?: AppId) {
    const initialApp = defaultApp ?? getDefaultAppId() ?? ('dashboard' as AppId);
    const [activeApp, setActiveApp] = useState<AppId | null>(initialApp);
    const [notifications, setNotifications] = useState<NotificationData>({});

    const handleAppChange = useCallback((appId: AppId) => {
        setActiveApp(appId);
        setNotifications((prev) => ({
            ...prev,
            [appId]: { count: 0, hasUpdate: false, lastUpdateTime: Date.now() },
        }));
    }, []);

    const updateNotification = useCallback((appId: AppId, state: Partial<NotificationState>) => {
        setNotifications((prev) => ({
            ...prev,
            [appId]: {
                count: 0,
                hasUpdate: false,
                lastUpdateTime: Date.now(),
                ...prev[appId],
                ...state,
            },
        }));
    }, []);

    const clearNotification = useCallback((appId: AppId) => {
        setNotifications((prev) => ({
            ...prev,
            [appId]: { count: 0, hasUpdate: false, lastUpdateTime: Date.now() },
        }));
    }, []);

    return {
        activeApp,
        setActiveApp,
        handleAppChange,
        notifications,
        updateNotification,
        clearNotification,
    };
}
