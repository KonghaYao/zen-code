/**
 * ChatDockIcon — macOS Messages 风格聊天图标
 *
 * 设计层次（从下到上）：
 * 1. Squircle 背景 — 绿色三段对角渐变（亮绿 → 纯绿 → 深绿）
 * 2. 左上辐射光晕 — radial gradient，模拟光源打在球面
 * 3. 顶部垂直高光 — linear gradient 白色淡出，塑造曲面感
 * 4. 底部压暗 — 底边加深，增加视觉重量
 * 5. 气泡主体 — 三阶贝塞尔精确圆角 + 平滑尾巴（G1 连续）
 * 6. 气泡浮影 — feDropShadow 让气泡悬浮于背景之上
 * 7. 气泡内描边 — 极细绿色轮廓，清晰区分气泡与背景
 * 8. Squircle 内边缘高光线 — 0.8px 白色描边模拟工艺感
 */

import { useId } from 'react';

interface ChatDockIconProps {
    className?: string;
    style?: React.CSSProperties;
}

export function ChatDockIcon({ className, style }: ChatDockIconProps) {
    const uid = useId().replace(/:/g, '');

    const ids = {
        bg: `${uid}-bg`,
        glow: `${uid}-gl`,
        specV: `${uid}-sv`,
        dark: `${uid}-dk`,
        bubbleFill: `${uid}-bf`,
        shadow: `${uid}-sh`,
    };

    /**
     * 气泡路径 — 三阶贝塞尔圆角（更精准），smooth 尾巴
     *
     * 气泡矩形范围：x [16, 84]  y [13, 63]
     * 圆角半径：r = 11  控制点偏移：k = r × 0.5523 ≈ 6.1 ≈ 6
     *
     *   顶边起点：(27, 13)           顶边终点：(73, 13)
     *   右边起点：(84, 24)           右边终点：(84, 52)
     *   底边含尾巴（左侧）：         底边右侧：(73, 63)
     *
     * 尾巴：底部 x ∈ [30, 48]，尖端 (38, 81)
     *   G1 连续（两段 Q 控制点关于尖端对称）
     */
    const bubble = `
        M 27,13
        L 73,13
        C 79,13  84,18  84,24
        L 84,52
        C 84,58  79,63  73,63
        L 48,63
        Q 44,77  38,81
        Q 32,77  30,63
        L 27,63
        C 21,63  16,58  16,52
        L 16,24
        C 16,18  21,13  27,13
        Z
    `;

    return (
        <svg
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={style}
            aria-hidden="true"
        >
            <defs>
                {/* 背景主渐变：左上亮绿 → 中央纯绿 → 右下深绿 */}
                <linearGradient id={ids.bg} x1="15%" y1="0%" x2="85%" y2="100%">
                    <stop offset="0%" stopColor="#6ADF84" />
                    <stop offset="44%" stopColor="#22B547" />
                    <stop offset="100%" stopColor="#138034" />
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

                {/* 气泡填充：纯白顶 → 极淡绿底，轻微材质感 */}
                <linearGradient id={ids.bubbleFill} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
                    <stop offset="100%" stopColor="rgba(230,248,235,0.96)" />
                </linearGradient>

                {/* 气泡投影：绿色调阴影，贴合背景颜色 */}
                <filter id={ids.shadow} x="-14%" y="-12%" width="128%" height="136%">
                    <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="rgba(10,90,35,0.32)" floodOpacity="1" />
                </filter>
            </defs>

            {/* ══ Squircle 背景：4 层叠加 ══ */}
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.bg})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.glow})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.specV})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.dark})`} />

            {/* ══ 气泡主体（带投影） ══ */}
            <path d={bubble} fill={`url(#${ids.bubbleFill})`} filter={`url(#${ids.shadow})`} />

            {/* ══ 气泡内描边：极细绿色轮廓 ══ */}
            <path d={bubble} fill="none" stroke="rgba(30,140,60,0.22)" strokeWidth="0.75" />

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
