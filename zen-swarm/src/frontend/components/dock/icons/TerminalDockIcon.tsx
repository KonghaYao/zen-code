/**
 * TerminalDockIcon — macOS Terminal 风格图标
 *
 * 设计层次（从下到上）：
 * 1. Squircle 背景 — 深炭灰三段对角渐变（中灰 → 深石板 → 近黑）
 * 2. 左上辐射光晕 — radial gradient，cx=28% cy=20%，暗背景下降低不透明度
 * 3. 顶部垂直高光 — linear gradient 白色淡出，轻微曲面感
 * 4. 底部压暗 — 底边加深，增加视觉重量
 * 5. ">_" 提示符图形 — ">" 折线箭头 + "_" 游标线 + 次级命令行
 * 6. 终端绿光投影 — feDropShadow 绿色调，模拟 CRT 余晖
 * 7. Squircle 内边缘高光线 — 0.8px 白色描边，暗背景下降低高光强度
 */

import { useId } from 'react';

interface TerminalDockIconProps {
    className?: string;
    style?: React.CSSProperties;
}

export function TerminalDockIcon({ className, style }: TerminalDockIconProps) {
    const uid = useId().replace(/:/g, '');

    const ids = {
        bg: `${uid}-bg`,
        glow: `${uid}-gl`,
        specV: `${uid}-sv`,
        dark: `${uid}-dk`,
        termShadow: `${uid}-ts`,
    };

    return (
        <svg
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={style}
            aria-hidden="true"
        >
            <defs>
                {/* 背景主渐变：左上中灰 → 深石板 → 右下近黑 */}
                <linearGradient id={ids.bg} x1="15%" y1="0%" x2="85%" y2="100%">
                    <stop offset="0%" stopColor="#52606E" />
                    <stop offset="44%" stopColor="#2D3A48" />
                    <stop offset="100%" stopColor="#141E28" />
                </linearGradient>

                {/* 左上辐射光晕：暗背景下降低不透明度至 0.16 */}
                <radialGradient id={ids.glow} cx="28%" cy="20%" r="52%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>

                {/* 顶部垂直高光：暗背景下降低至 0.28 */}
                <linearGradient id={ids.specV} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                    <stop offset="40%" stopColor="rgba(255,255,255,0.04)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>

                {/* 底部压暗 */}
                <linearGradient id={ids.dark} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="50%" stopColor="rgba(0,0,0,0)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
                </linearGradient>

                {/* 终端绿光投影：模拟 CRT 余晖，带绿色调 */}
                <filter id={ids.termShadow} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,200,100,0.25)" floodOpacity="1" />
                </filter>
            </defs>

            {/* ══ Squircle 背景：4 层叠加 ══ */}
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.bg})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.glow})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.specV})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.dark})`} />

            {/* ══ ">" 箭头：两折线构成右指角 ══ */}
            <polyline
                points="26,38 46,50 26,62"
                fill="none"
                stroke="rgba(255,255,255,0.92)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#${ids.termShadow})`}
            />

            {/* ══ "_" 游标块：粗水平短线 ══ */}
            <line
                x1="54"
                y1="62"
                x2="74"
                y2="62"
                stroke="rgba(255,255,255,0.88)"
                strokeWidth="4"
                strokeLinecap="round"
                filter={`url(#${ids.termShadow})`}
            />

            {/* ══ 次级命令行：低透明度横线，模拟第二行命令 ══ */}
            <line
                x1="26"
                y1="76"
                x2="62"
                y2="76"
                stroke="rgba(255,255,255,0.20)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />

            {/* ══ Squircle 内边缘高光线：暗背景下降至 0.22 ══ */}
            <rect
                x="1.5"
                y="1.5"
                width="97"
                height="97"
                rx="21.5"
                ry="21.5"
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="0.8"
            />
        </svg>
    );
}
