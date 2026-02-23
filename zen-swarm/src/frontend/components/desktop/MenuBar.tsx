/**
 * MenuBar 组件
 * macOS 风格顶部状态栏，使用 Tailwind CSS
 * 显示实时系统信息：电池、网络、内存等
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useSystemStatus } from '../../hooks/useSystemStatus.js';
import { Battery, Wifi, HardDrive, Search, Settings2 as Settings, Apple } from '../ui/Icons.js';

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

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function MenuBar({ appName = 'Zen Swarm', appIcon = '🐝' }: MenuBarProps) {
    const [currentTime, setCurrentTime] = useState(() => formatTime(new Date()));
    const systemStatus = useSystemStatus();

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(formatTime(new Date()));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const menuItems = useMemo(
        () => [
            { label: appName, isBold: true },
            // { label: '文件' },
            // { label: '编辑' },
            // { label: '视图' },
            // { label: '窗口' },
            // { label: '帮助' },
        ],
        [appName],
    );

    // 电池状态显示
    const renderBattery = () => {
        const battery = systemStatus.battery;
        if (!battery) return null;

        const percentage = Math.round(battery.level * 100);
        const isCharging = battery.charging;

        // 根据电量决定电池图标颜色
        const getBatteryColor = () => {
            if (isCharging) return 'text-green-500';
            if (percentage <= 20) return 'text-red-500';
            if (percentage <= 50) return 'text-yellow-500';
            return 'text-white opacity-80';
        };

        return (
            <button
                className="h-full px-1.5 flex items-center gap-1 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-default"
                aria-label={`电池 ${percentage}%${isCharging ? ' 正在充电' : ''}`}
                title={`电池: ${percentage}%${isCharging ? ' (充电中)' : ''}`}
            >
                <Battery width={20} height={20} className={getBatteryColor()} />
                {isCharging && <span className="text-xs">⚡</span>}
                {percentage < 100 && <span className="text-[11px] font-medium opacity-90">{percentage}%</span>}
            </button>
        );
    };

    // 网络状态显示
    const renderNetwork = () => {
        const { online, type, effectiveType } = systemStatus.network;
        const networkType = type || (online ? 'wifi' : 'offline');

        const getNetworkSignal = () => {
            if (!online) return 0;
            if (effectiveType === '4g') return 4;
            if (effectiveType === '3g') return 3;
            if (effectiveType === '2g' || effectiveType === 'slow-2g') return 1;
            return 3; // 默认
        };

        const signalBars = getNetworkSignal();

        return (
            <button
                className="h-full px-1.5 flex items-center rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-default"
                aria-label={`${online ? '已连接网络' : '网络断开'} ${networkType}`}
                title={`网络: ${online ? '已连接' : '已断开'}${type ? ` (${type})` : ''}${effectiveType ? ` (${effectiveType})` : ''}`}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-white opacity-80">
                    {/* WiFi 信号 */}
                    <path
                        d={`M${12 - signalBars * 1.5} 14c0.55-0.55 1.45-0.55 2 0h0.6c0.55-0.55 1.45-0.55 2 0`}
                        fill="currentColor"
                        opacity={0.4}
                    />
                    {signalBars >= 2 && (
                        <path
                            d={`M${12 - signalBars * 2.5} 11c0.55-0.55 1.45-0.55 2 0h1.5c0.55-0.55 1.45-0.55 2 0`}
                            fill="currentColor"
                            opacity={0.6}
                        />
                    )}
                    {signalBars >= 3 && (
                        <path
                            d={`M${12 - signalBars * 3.5} 8c0.55-0.55 1.45-0.55 2 0h2.5c0.55-0.55 1.45-0.55 2 0`}
                            fill="currentColor"
                            opacity={0.8}
                        />
                    )}
                    {signalBars >= 4 && (
                        <path
                            d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9z"
                            fill="currentColor"
                        />
                    )}
                </svg>
            </button>
        );
    };

    // 内存状态显示
    const renderMemory = () => {
        const memory = systemStatus.memory;
        if (!memory) return null;

        const usagePercent =
            memory.usedJSHeapSize && memory.jsHeapSizeLimit
                ? Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
                : 0;

        return (
            <button
                className="h-full px-1.5 flex items-center gap-1 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-default"
                aria-label={`内存使用 ${usagePercent}%`}
                title={`内存使用: ${formatBytes(memory.usedJSHeapSize || 0)} / ${formatBytes(memory.jsHeapSizeLimit || 0)} (${usagePercent}%)`}
            >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-white opacity-80">
                    <path d="M4 4h16v16H4V4zm2 2v12h12V6H6z" opacity="0.5" />
                    <rect
                        x="6"
                        y={18 - 12 * (usagePercent / 100)}
                        width="12"
                        height={12 * (usagePercent / 100)}
                        fill="currentColor"
                        opacity={usagePercent > 80 ? 1 : 0.7}
                    />
                </svg>
            </button>
        );
    };

    return (
        <motion.header
            className="
                fixed top-0 left-0 right-0 z-[1000]
                h-7 flex items-center justify-between
                px-3
                text-white
                dark:bg-neutral-900/85
                backdrop-blur-xl
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
                {/* 电池状态 */}
                {renderBattery()}

                {/* 网络状态 */}
                {renderNetwork()}

                {/* 内存状态 */}
                {renderMemory()}

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
