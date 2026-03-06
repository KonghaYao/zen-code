/**
 * MenuBar 组件
 * macOS 风格顶部状态栏，使用 Tailwind CSS
 * 显示实时系统信息：网络、内存等
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useSystemStatus } from '../../hooks/useSystemStatus.js';
import { Wifi, HardDrive, Search, Settings, WifiOff } from '../ui/Icons.js';

/**
 * Zen Swarm 品牌标志 — Z 字形
 */
function ZenSwarmLogo() {
    return (
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" style={{ opacity: 0.92 }}>
            {/* Z 字：顶横、斜撇、底横，圆头笔触 */}
            <polyline
                points="3,3.5 13,3.5 3,12.5 13,12.5"
                fill="none"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

interface MenuBarProps {
    WifiOff?: boolean;
    appName?: string;
    appIcon?: React.ReactNode;
    showSetup?: boolean;
    onSetup?: () => void;
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

export function MenuBar({ appName = 'Zen Swarm', appIcon = '🐝', showSetup = false, onSetup }: MenuBarProps) {
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

    // 网络状态显示
    const renderNetwork = () => {
        const { online, type, effectiveType } = systemStatus.network;
        const networkType = type || (online ? 'wifi' : 'offline');

        return (
            <button
                className="h-full px-1.5 flex items-center rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                aria-label={`${online ? '已连接网络' : '网络断开'} ${networkType}`}
                title={`网络: ${online ? '已连接' : '已断开'}${type ? ` (${type})` : ''}${effectiveType ? ` (${effectiveType})` : ''}`}
            >
                {online ? (
                    <Wifi width={18} height={18} className="text-white opacity-80" aria-hidden="true" />
                ) : (
                    <WifiOff width={18} height={18} className="text-white opacity-50" aria-hidden="true" />
                )}
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
                className="h-full px-1.5 flex items-center gap-1 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                aria-label={`内存使用 ${usagePercent}%`}
                title={`内存使用: ${formatBytes(memory.usedJSHeapSize || 0)} / ${formatBytes(memory.jsHeapSizeLimit || 0)} (${usagePercent}%)`}
            >
                <HardDrive width={16} height={16} className="text-white opacity-80" aria-hidden="true" />
            </button>
        );
    };

    return (
        <motion.header
            className="
                fixed top-0 left-0 right-0 z-1000
                h-7 flex items-center justify-between
                px-3
                text-white
                bg-black/30
                dark:bg-neutral-900/75
                backdrop-blur-2xl
                select-none
            "
            style={{ borderBottom: '0.5px solid rgba(255,255,255,0.12)' }}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
            {/* 左侧菜单 */}
            <div className="flex items-center h-full gap-0.5">
                {/* Zen Swarm 系统标志 */}
                <button
                    className="h-full px-3 flex items-center rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                    aria-label="Zen Swarm Menu"
                >
                    <ZenSwarmLogo />
                </button>

                {/* 应用名称 */}
                <span className="h-full px-2.5 flex items-center gap-1.5 text-[13px] font-medium">
                    {appIcon && (
                        <span
                            className="flex-shrink-0 rounded-[4px] overflow-hidden opacity-90"
                            style={{ width: 16, height: 16 }}
                        >
                            {appIcon}
                        </span>
                    )}
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
                {/* 网络状态 */}
                {renderNetwork()}

                {/* 内存状态 */}
                {renderMemory()}

                {/* 搜索 */}
                <button
                    className="h-full px-1.5 flex items-center rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                    aria-label="搜索"
                >
                    <Search width={16} height={16} className="opacity-80" aria-hidden="true" />
                </button>

                {/* 控制中心 */}
                <button
                    className="h-full px-1.5 flex items-center rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                    aria-label="控制中心"
                >
                    <Settings width={16} height={16} className="opacity-80" aria-hidden="true" />
                </button>

                {/* 分隔线 */}
                <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />

                {/* 初始化按钮（未配置 Provider 时显示） */}
                {showSetup && (
                    <>
                        <button
                            onClick={onSetup}
                            className="h-full px-2.5 flex items-center gap-1 text-[12px] font-medium text-yellow-300 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                            aria-label="初始化配置"
                        >
                            <span aria-hidden="true">⚙️</span>
                            初始化
                        </button>
                        <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />
                    </>
                )}

                {/* 时间 */}
                <span className="px-2 text-[13px] font-medium">{currentTime}</span>
            </div>
        </motion.header>
    );
}
