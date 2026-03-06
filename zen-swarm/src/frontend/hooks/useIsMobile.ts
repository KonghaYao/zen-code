/**
 * useIsMobile Hook
 * 检测是否为移动端视口（< 768px）
 * 使用 ResizeObserver 实时响应窗口变化
 */

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < MOBILE_BREAKPOINT;
    });

    useEffect(() => {
        const handler = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };

        window.addEventListener('resize', handler, { passive: true });
        return () => window.removeEventListener('resize', handler);
    }, []);

    return isMobile;
}
