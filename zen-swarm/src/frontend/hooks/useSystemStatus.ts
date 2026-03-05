/**
 * useSystemStatus Hook
 * 获取系统状态信息（网络等）
 * 支持优雅降级，跨平台兼容
 */

import { useState, useEffect, useCallback } from 'react';

interface NetworkInfo {
    online: boolean;
    type?: string; // 'wifi' | 'ethernet' | 'cellular' | 'unknown'
    effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
}

interface SystemStatus {
    network: NetworkInfo;
    screenSize: {
        width: number;
        height: number;
        availableWidth: number;
        availableHeight: number;
        pixelRatio: number;
    };
    memory: {
        usedJSHeapSize?: number;
        totalJSHeapSize?: number;
        jsHeapSizeLimit?: number;
    } | null;
    language: string;
    platform: string;
}

export function useSystemStatus(updateInterval: number = 30000) {
    const [systemStatus, setSystemStatus] = useState<SystemStatus>(() => {
        // 服务端渲染时返回默认值
        if (typeof window === 'undefined') {
            return {
                network: {
                    online: true,
                },
                screenSize: {
                    width: 1920,
                    height: 1080,
                    availableWidth: 1920,
                    availableHeight: 1080,
                    pixelRatio: 1,
                },
                memory: null,
                language: 'zh-CN',
                platform: 'unknown',
            };
        }

        return {
            network: {
                online: navigator.onLine,
            },
            screenSize: {
                width: window.screen.width,
                height: window.screen.height,
                availableWidth: window.screen.availWidth,
                availableHeight: window.screen.availHeight,
                pixelRatio: window.devicePixelRatio,
            },
            memory: null,
            language: navigator.language,
            platform: navigator.platform,
        };
    });

    // 更新网络状态
    const updateNetworkStatus = useCallback(() => {
        const connection =
            (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

        setSystemStatus((prev) => ({
            ...prev,
            network: {
                online: navigator.onLine,
                type: connection?.type,
                effectiveType: connection?.effectiveType,
            },
        }));
    }, []);

    // 更新内存状态
    const updateMemoryStatus = useCallback(() => {
        const memory = (performance as any).memory;
        if (memory) {
            setSystemStatus((prev) => ({
                ...prev,
                memory: {
                    usedJSHeapSize: memory.usedJSHeapSize,
                    totalJSHeapSize: memory.totalJSHeapSize,
                    jsHeapSizeLimit: memory.jsHeapSizeLimit,
                },
            }));
        }
    }, []);

    // 监听网络状态
    useEffect(() => {
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        // 如果支持 Connection API，监听变化
        const connection =
            (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connection) {
            connection.addEventListener('change', updateNetworkStatus);
        }

        return () => {
            window.removeEventListener('online', updateNetworkStatus);
            window.removeEventListener('offline', updateNetworkStatus);
            if (connection) {
                connection.removeEventListener('change', updateNetworkStatus);
            }
        };
    }, [updateNetworkStatus]);

    // 监听屏幕尺寸变化
    useEffect(() => {
        const handleResize = () => {
            setSystemStatus((prev) => ({
                ...prev,
                screenSize: {
                    width: window.screen.width,
                    height: window.screen.height,
                    availableWidth: window.screen.availWidth,
                    availableHeight: window.screen.availHeight,
                    pixelRatio: window.devicePixelRatio,
                },
            }));
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 定期更新内存状态
    useEffect(() => {
        updateMemoryStatus();
        const interval = setInterval(updateMemoryStatus, updateInterval);
        return () => clearInterval(interval);
    }, [updateMemoryStatus, updateInterval]);

    return systemStatus;
}
