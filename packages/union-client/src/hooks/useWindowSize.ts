/**
 * useWindowSize Hook
 * 监听终端窗口大小变化
 * 适用于 TUI 应用
 *
 * 优化点：使用 useCallback 稳定事件处理器引用，避免频繁的 event listener 重新绑定
 */

import { useState, useEffect, useCallback } from 'react';

export interface WindowSize {
    width: number;
    height: number;
}

export function useWindowSize(): WindowSize {
    const [windowSize, setWindowSize] = useState<WindowSize>({
        width: process.stdout.columns,
        height: process.stdout.rows,
    });

    // 使用 useCallback 稳定事件处理器引用
    const handleResize = useCallback(() => {
        setWindowSize({
            width: process.stdout.columns,
            height: process.stdout.rows,
        });
    }, []);

    useEffect(() => {
        // 绑定 resize 事件
        process.stdout.on('resize', handleResize);

        // 清理函数：移除事件监听
        return () => {
            process.stdout.off('resize', handleResize);
        };
    }, [handleResize]); // handleResize 引用稳定，只会在首次渲染时绑定

    return windowSize;
}
