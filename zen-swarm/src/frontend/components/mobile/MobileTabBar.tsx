/**
 * MobileTabBar 组件
 * 移动端底部 Tab 导航栏，类 Claude.ai 风格
 * 固定在屏幕底部，支持 iOS safe area
 */

import React from 'react';
import { motion } from 'motion/react';
import type { AppId } from '../app-registry/types.js';
import { MessageSquare, FolderOpen, Monitor, Clock, Settings, Terminal } from '../ui/Icons.js';

interface MobileTab {
    id: AppId;
    label: string;
    icon: React.ReactNode;
}

const MOBILE_TABS: MobileTab[] = [
    {
        id: 'chat',
        label: 'Chat',
        icon: <MessageSquare size={20} />,
    },
    {
        id: 'finder',
        label: 'Files',
        icon: <FolderOpen size={20} />,
    },
    {
        id: 'terminal',
        label: 'Term',
        icon: <Terminal size={20} />,
    },
    {
        id: 'monitor',
        label: 'Monitor',
        icon: <Monitor size={20} />,
    },
    {
        id: 'cron',
        label: 'Cron',
        icon: <Clock size={20} />,
    },
    {
        id: 'config',
        label: 'Config',
        icon: <Settings size={20} />,
    },
];

interface MobileTabBarProps {
    activeApp: AppId | null;
    onAppChange: (appId: AppId) => void;
}

export function MobileTabBar({ activeApp, onAppChange }: MobileTabBarProps) {
    return (
        <nav
            className="
                fixed bottom-0 left-0 right-0
                flex items-stretch
                bg-white/90 dark:bg-neutral-900/90
                backdrop-blur-xl
                border-t border-neutral-200 dark:border-neutral-700
                z-50
                mobile-tab-bar
            "
            role="navigation"
            aria-label="主导航"
        >
            {MOBILE_TABS.map((tab) => {
                const isActive = activeApp === tab.id;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onAppChange(tab.id)}
                        className={`
                            flex-1 flex flex-col items-center justify-center
                            gap-0 pt-1.5 pb-safe-bottom
                            min-h-[52px] px-0.5
                            transition-colors duration-150
                            relative
                            ${isActive ? 'text-primary' : 'text-neutral-500 dark:text-neutral-400'}
                        `}
                        aria-label={tab.label}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        {/* Active indicator pill */}
                        {isActive && (
                            <motion.span
                                layoutId="mobile-tab-indicator"
                                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}

                        {/* Icon */}
                        <span
                            className={`
                                transition-transform duration-150
                                ${isActive ? 'scale-110' : 'scale-100'}
                            `}
                        >
                            {tab.icon}
                        </span>

                        {/* Label - 小屏幕隐藏，只在较宽屏幕显示 */}
                        <span
                            className={`text-[9px] font-medium leading-none mt-0.5 whitespace-nowrap hidden min-[360px]:inline ${isActive ? 'font-semibold' : ''}`}
                        >
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
