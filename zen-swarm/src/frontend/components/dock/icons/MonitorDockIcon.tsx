/**
 * MonitorDockIcon — macOS Activity Monitor 风格心电图图标
 *
 * 设计层次（从下到上）：
 * 1. Squircle 背景 — 红色三段对角渐变（亮红粉 → 鲜红 → 深红）
 * 2. 左上辐射光晕 — radial gradient，模拟光源打在球面
 * 3. 顶部垂直高光 — linear gradient 白色淡出，塑造曲面感
 * 4. 底部压暗 — 底边加深，增加视觉重量
 * 5. EKG 辉光底层 — 宽描边白色半透明，制造发光效果
 * 6. EKG 主线 — 经典心电图波形，白色实线
 * 7. Squircle 内边缘高光线 — 0.8px 白色描边模拟工艺感
 */

import { useId } from 'react';

interface MonitorDockIconProps {
    className?: string;
    style?: React.CSSProperties;
}

export function MonitorDockIcon({ className, style }: MonitorDockIconProps) {
    const uid = useId().replace(/:/g, '');

    const ids = {
        bg: `${uid}-bg`,
        glow: `${uid}-gl`,
        specV: `${uid}-sv`,
        dark: `${uid}-dk`,
    };

    /**
     * EKG 心电图路径
     *
     * 水平基线 y = 50，从左到右贯穿图标
     * 经典 EKG 脉冲：上升斜坡 → 陡峭 Q 谷 → 高耸 R 峰 → S 谷 → 回归基线
     *
     *   起点：(10, 50)  基线延伸到脉冲前缘 (28, 50)
     *   Q 谷 ：(33, 62)
     *   R 峰 ：(38, 24)
     *   S 谷 ：(42, 64)
     *   回基线：(47, 50)
     *   基线延伸到终点：(90, 50)
     */
    const ekg = 'M 10,50  L 28,50  L 33,62  L 38,24  L 42,64  L 47,50  L 90,50';

    return (
        <svg
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={style}
            aria-hidden="true"
        >
            <defs>
                {/* 背景主渐变：左上亮红粉 → 中央鲜红 → 右下深红 */}
                <linearGradient id={ids.bg} x1="15%" y1="0%" x2="85%" y2="100%">
                    <stop offset="0%" stopColor="#FF8080" />
                    <stop offset="44%" stopColor="#E03535" />
                    <stop offset="100%" stopColor="#AA1A1A" />
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

            {/* ══ EKG 辉光底层：宽白色描边，营造发光晕染 ══ */}
            <path
                d={ekg}
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* ══ EKG 主线：清晰白色心电图波形 ══ */}
            <path
                d={ekg}
                fill="none"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="3.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

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
