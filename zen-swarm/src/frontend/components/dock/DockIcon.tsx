/**
 * DockIcon - macOS 风格 SVG Squircle 图标
 * 使用 SVG squircle 背景 + 渐变 + Lucide 白色图标
 */

import type { ReactNode } from 'react';
import { useId } from 'react';

interface DockIconProps {
    icon: ReactNode;
    iconColor: [string, string];
}

export function DockIcon({ icon, iconColor }: DockIconProps) {
    const id = useId().replace(/:/g, '');
    const [from, to] = iconColor;
    const gradId = `dg-${id}`;
    const hlId = `dh-${id}`;
    const shadowId = `ds-${id}`;

    return (
        <div className="dock-squircle-wrap">
            {/* SVG squircle 背景 */}
            <svg
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
                className="dock-squircle-svg"
                aria-hidden="true"
            >
                <defs>
                    {/* 主渐变：左上 → 右下 */}
                    <linearGradient id={gradId} x1="20%" y1="0%" x2="80%" y2="100%">
                        <stop offset="0%" stopColor={from} />
                        <stop offset="100%" stopColor={to} />
                    </linearGradient>
                    {/* 高光渐变：顶部白色透明 */}
                    <linearGradient id={hlId} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                        <stop offset="55%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>
                    {/* 底部暗角渐变 */}
                    <linearGradient id={shadowId} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="50%" stopColor="rgba(0,0,0,0)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
                    </linearGradient>
                </defs>

                {/* 主体 squircle（rx=22 近似 iOS 连续曲率） */}
                <rect x="2" y="2" width="96" height="96" rx="21" ry="21" fill={`url(#${gradId})`} />
                {/* 顶部高光 */}
                <rect x="2" y="2" width="96" height="96" rx="21" ry="21" fill={`url(#${hlId})`} />
                {/* 底部暗角 */}
                <rect x="2" y="2" width="96" height="96" rx="21" ry="21" fill={`url(#${shadowId})`} />
                {/* 内描边（玻璃边缘感） */}
                <rect
                    x="2.5"
                    y="2.5"
                    width="95"
                    height="95"
                    rx="20.5"
                    ry="20.5"
                    fill="none"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="1"
                />
            </svg>

            {/* Lucide 白色图标 */}
            <div className="dock-squircle-icon">{icon}</div>
        </div>
    );
}
