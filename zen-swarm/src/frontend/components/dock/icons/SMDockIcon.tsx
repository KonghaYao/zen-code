/**
 * SMDockIcon — macOS 风格状态机图标
 *
 * 设计层次（从下到上）：
 * 1. Squircle 背景 — 紫色三段对角渐变（亮紫 → 鲜紫 → 深靛）
 * 2. 左上辐射光晕 — radial gradient，模拟光源打在球面
 * 3. 顶部垂直高光 — linear gradient 白色淡出，塑造曲面感
 * 4. 底部压暗 — 底边加深，增加视觉重量
 * 5. 有向图连线 — 三条带箭头边，先于节点绘制（节点覆盖线端）
 * 6. 三个状态节点 — 半透明圆圈 + 中心点
 * 7. Squircle 内边缘高光线 — 0.8px 白色描边模拟工艺感
 */

import { useId } from 'react';

interface SMDockIconProps {
    className?: string;
    style?: React.CSSProperties;
}

export function SMDockIcon({ className, style }: SMDockIconProps) {
    const uid = useId().replace(/:/g, '');

    const ids = {
        bg: `${uid}-bg`,
        glow: `${uid}-gl`,
        specV: `${uid}-sv`,
        dark: `${uid}-dk`,
    };

    // Node centers
    const nodeA = { cx: 34, cy: 33 }; // top-left
    const nodeB = { cx: 67, cy: 33 }; // top-right
    const nodeC = { cx: 50, cy: 70 }; // bottom-center

    return (
        <svg
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={style}
            aria-hidden="true"
        >
            <defs>
                {/* 背景主渐变：左上亮紫 → 中央鲜紫 → 右下深靛 */}
                <linearGradient id={ids.bg} x1="15%" y1="0%" x2="85%" y2="100%">
                    <stop offset="0%" stopColor="#C084FC" />
                    <stop offset="44%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#4C1D95" />
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
            </defs>

            {/* ══ Squircle 背景：4 层叠加 ══ */}
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.bg})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.glow})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.specV})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.dark})`} />

            {/* ══ 有向图连线（先绘制，节点覆盖线端） ══ */}

            {/* A→B: 水平连线 (43,33) → (58,33) */}
            <line
                x1="43"
                y1={nodeA.cy}
                x2="58"
                y2={nodeB.cy}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />

            {/* B→C: 斜向左下 (64,40) → (54,63) */}
            <line
                x1="64"
                y1="40"
                x2="54"
                y2="63"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />

            {/* C→A: 斜向左上 (46,63) → (37,40) */}
            <line
                x1="46"
                y1="63"
                x2="37"
                y2="40"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />

            {/* ══ 状态节点（绘制于连线之上） ══ */}

            {/* Node A — 左上 */}
            <circle
                cx={nodeA.cx}
                cy={nodeA.cy}
                r="9"
                fill="rgba(255,255,255,0.22)"
                stroke="rgba(255,255,255,0.92)"
                strokeWidth="2.2"
            />
            <circle cx={nodeA.cx} cy={nodeA.cy} r="2.5" fill="rgba(255,255,255,0.8)" />

            {/* Node B — 右上 */}
            <circle
                cx={nodeB.cx}
                cy={nodeB.cy}
                r="9"
                fill="rgba(255,255,255,0.22)"
                stroke="rgba(255,255,255,0.92)"
                strokeWidth="2.2"
            />
            <circle cx={nodeB.cx} cy={nodeB.cy} r="2.5" fill="rgba(255,255,255,0.8)" />

            {/* Node C — 底部中央 */}
            <circle
                cx={nodeC.cx}
                cy={nodeC.cy}
                r="9"
                fill="rgba(255,255,255,0.22)"
                stroke="rgba(255,255,255,0.92)"
                strokeWidth="2.2"
            />
            <circle cx={nodeC.cx} cy={nodeC.cy} r="2.5" fill="rgba(255,255,255,0.8)" />

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
