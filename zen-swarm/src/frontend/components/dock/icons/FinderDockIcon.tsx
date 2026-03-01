/**
 * FinderDockIcon — macOS Finder 风格文件夹图标
 *
 * 设计层次（从下到上）：
 * 1. Squircle 背景 — 蓝色三段对角渐变（天蓝 → 中蓝 → 深蓝）
 * 2. 左上辐射光晕 — radial gradient，模拟光源打在球面
 * 3. 顶部垂直高光 — linear gradient 白色淡出，塑造曲面感
 * 4. 底部压暗 — 底边加深，增加视觉重量
 * 5. 文件夹主体 — 经典 macOS 文件夹形状（单路径，含标签页）
 * 6. 文件夹顶部光泽 — 顶部横向薄条，模拟曲面反光
 * 7. 文件夹浮影 — feDropShadow 让文件夹悬浮于背景之上
 * 8. 文件夹内描边 — 极细蓝色轮廓，清晰区分图标与背景
 * 9. Squircle 内边缘高光线 — 0.8px 白色描边模拟工艺感
 */

import { useId } from 'react';

interface FinderDockIconProps {
    className?: string;
    style?: React.CSSProperties;
}

export function FinderDockIcon({ className, style }: FinderDockIconProps) {
    const uid = useId().replace(/:/g, '');

    const ids = {
        bg: `${uid}-bg`,
        glow: `${uid}-gl`,
        specV: `${uid}-sv`,
        dark: `${uid}-dk`,
        folderFill: `${uid}-ff`,
        shadow: `${uid}-sh`,
    };

    /**
     * 文件夹路径 — 经典 macOS 文件夹形状
     * 左上角带标签页（tab），主体为圆角矩形
     *
     * 路径范围：x [14, 86]  y [22, 84]
     * 标签页：左上角到 x=50，高度到 y=28
     * 主体圆角：r ≈ 6
     */
    const folder = `
        M 14,34
        Q 14,22  20,22
        L 46,22
        Q 50,22  50,28
        L 82,28
        Q 86,28  86,34
        L 86,78
        Q 86,84  80,84
        L 20,84
        Q 14,84  14,78
        Z
    `;

    /**
     * 文件夹顶部光泽路径
     * 在文件夹主体顶部 y=34 到 y=42 的弧形薄条
     * 模拟光线打在文件夹上边缘的反光
     */
    const shine = `M 14,34 L 86,34 L 86,42 Q 50,48 14,42 Z`;

    return (
        <svg
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={style}
            aria-hidden="true"
        >
            <defs>
                {/* 背景主渐变：左上天蓝 → 中央中蓝 → 右下深蓝 */}
                <linearGradient id={ids.bg} x1="15%" y1="0%" x2="85%" y2="100%">
                    <stop offset="0%" stopColor="#60B8FF" />
                    <stop offset="44%" stopColor="#2280D4" />
                    <stop offset="100%" stopColor="#1054A0" />
                </linearGradient>

                {/* 左上辐射光晕：模拟顶部光源 */}
                <radialGradient id={ids.glow} cx="28%" cy="20%" r="52%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>

                {/* 顶部垂直高光：白色向下淡出 */}
                <linearGradient id={ids.specV} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.36)" />
                    <stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>

                {/* 底部压暗：给图标增加重量感 */}
                <linearGradient id={ids.dark} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="50%" stopColor="rgba(0,0,0,0)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
                </linearGradient>

                {/* 文件夹填充：纯白顶 → 极淡蓝底，轻微材质感 */}
                <linearGradient id={ids.folderFill} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.97)" />
                    <stop offset="100%" stopColor="rgba(210,235,255,0.95)" />
                </linearGradient>

                {/* 文件夹投影：蓝色调阴影，贴合背景颜色 */}
                <filter id={ids.shadow} x="-14%" y="-12%" width="128%" height="136%">
                    <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="rgba(10,50,130,0.30)" floodOpacity="1" />
                </filter>
            </defs>

            {/* ══ Squircle 背景：4 层叠加 ══ */}
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.bg})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.glow})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.specV})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.dark})`} />

            {/* ══ 文件夹主体（带投影） ══ */}
            <path d={folder} fill={`url(#${ids.folderFill})`} filter={`url(#${ids.shadow})`} />

            {/* ══ 文件夹顶部光泽：模拟曲面反光 ══ */}
            <path d={shine} fill="rgba(255,255,255,0.10)" />

            {/* ══ 文件夹内描边：极细蓝色轮廓 ══ */}
            <path d={folder} fill="none" stroke="rgba(30,100,200,0.20)" strokeWidth="0.75" />

            {/* ══ Squircle 内边缘高光线 ══ */}
            <rect
                x="1.5"
                y="1.5"
                width="97"
                height="97"
                rx="21.5"
                ry="21.5"
                fill="none"
                stroke="rgba(255,255,255,0.26)"
                strokeWidth="0.8"
            />
        </svg>
    );
}
