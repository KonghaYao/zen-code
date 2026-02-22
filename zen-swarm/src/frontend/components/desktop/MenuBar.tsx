/**
 * MenuBar 组件
 * macOS 风格顶部状态栏，使用 Tailwind CSS
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';

interface MenuBarProps {
    appName?: string;
    appIcon?: string;
}

function formatTime(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    };
    return date.toLocaleString('zh-CN', options);
}

export function MenuBar({ appName = 'Zen Swarm', appIcon = '🐝' }: MenuBarProps) {
    const [currentTime, setCurrentTime] = useState(() => formatTime(new Date()));

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(formatTime(new Date()));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const menuItems = useMemo(
        () => [
            { label: appName, isBold: true },
            { label: '文件' },
            { label: '编辑' },
            { label: '视图' },
            { label: '窗口' },
            { label: '帮助' },
        ],
        [appName],
    );

    return (
        <motion.header
            className="
                fixed top-0 left-0 right-0 z-[1000]
                h-7 flex items-center justify-between
                px-3
                bg-white/85 dark:bg-neutral-900/85
                backdrop-blur-xl
                border-b border-neutral-200/50 dark:border-neutral-700/50
                select-none
            "
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
            {/* 左侧菜单 */}
            <div className="flex items-center h-full gap-0.5">
                {/* Apple Logo */}
                <button
                    className="h-full px-3 flex items-center rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-default"
                    aria-label="Apple Menu"
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="opacity-90">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                </button>

                {/* 应用名称 */}
                <span className="h-full px-2.5 flex items-center gap-1.5 text-[13px] font-medium">
                    <span className="text-sm">{appIcon}</span>
                    <span className={menuItems[0].isBold ? 'font-semibold' : ''}>{menuItems[0].label}</span>
                </span>

                {/* 菜单项 */}
                {menuItems.slice(1).map((item, index) => (
                    <button
                        key={index}
                        className="h-full px-2.5 flex items-center text-[13px] rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-default"
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* 右侧状态 */}
            <div className="flex items-center h-full gap-0.5">
                {/* 电池 */}
                <button
                    className="h-full px-1.5 flex items-center rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-default"
                    aria-label="电池状态"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="opacity-80">
                        <path d="M17 5H3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-1h1c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1h-1V7c0-1.1-.9-2-2-2zm0 12H3V7h14v10z" />
                        <path d="M5 8h10v8H5z" opacity="0.8" />
                    </svg>
                </button>

                {/* WiFi */}
                <button
                    className="h-full px-1.5 flex items-center rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-default"
                    aria-label="WiFi 状态"
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="opacity-80">
                        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
                    </svg>
                </button>

                {/* 搜索 */}
                <button
                    className="h-full px-1.5 flex items-center rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-default"
                    aria-label="搜索"
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="opacity-80">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                </button>

                {/* 控制中心 */}
                <button
                    className="h-full px-1.5 flex items-center rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-default"
                    aria-label="控制中心"
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="opacity-80">
                        <path d="M7 5h2v14H7zm4 0h2v14h-2zm4 0h2v14h-2z" />
                    </svg>
                </button>

                {/* 分隔线 */}
                <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />

                {/* 时间 */}
                <span className="px-2 text-[13px] font-medium">{currentTime}</span>
            </div>
        </motion.header>
    );
}
