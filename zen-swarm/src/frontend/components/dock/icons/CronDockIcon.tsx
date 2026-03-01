/**
 * CronDockIcon — macOS-quality Cron/Scheduler app icon
 *
 * Layer stack (bottom to top):
 * 1. Squircle background — teal-green diagonal gradient (bright teal → medium → deep forest)
 * 2. Top-left radial glow — simulates light source hitting a curved surface
 * 3. Vertical specular highlight — white fade-out from top, sculpts curvature
 * 4. Bottom darkening — adds visual weight to base
 * 5. Clock face — outer circle ring + 4 tick marks + hour/minute hands + center dot
 * 6. Squircle inner edge highlight — 0.8px white stroke for craftsmanship feel
 */

import { useId } from 'react';

interface CronDockIconProps {
    className?: string;
    style?: React.CSSProperties;
}

export function CronDockIcon({ className, style }: CronDockIconProps) {
    const uid = useId().replace(/:/g, '');

    const ids = {
        bg: `${uid}-bg`,
        glow: `${uid}-gl`,
        specV: `${uid}-sv`,
        dark: `${uid}-dk`,
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
                {/* Background main gradient: top-left bright teal → mid teal-green → bottom-right deep forest */}
                <linearGradient id={ids.bg} x1="15%" y1="0%" x2="85%" y2="100%">
                    <stop offset="0%" stopColor="#4ADFA8" />
                    <stop offset="44%" stopColor="#0EB876" />
                    <stop offset="100%" stopColor="#097A50" />
                </linearGradient>

                {/* Top-left radial glow: simulates top light source */}
                <radialGradient id={ids.glow} cx="28%" cy="20%" r="52%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>

                {/* Vertical specular highlight: white fading downward */}
                <linearGradient id={ids.specV} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.36)" />
                    <stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>

                {/* Bottom darkening: adds visual weight */}
                <linearGradient id={ids.dark} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="50%" stopColor="rgba(0,0,0,0)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
                </linearGradient>
            </defs>

            {/* Squircle background: 4-layer stack */}
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.bg})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.glow})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.specV})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.dark})`} />

            {/* Clock outer ring */}
            <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.90)" strokeWidth="2.8" />

            {/* Tick marks at 12 / 3 / 6 / 9 o'clock */}
            {/* 12 o'clock */}
            <line
                x1="50"
                y1="22"
                x2="50"
                y2="28"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            {/* 3 o'clock */}
            <line
                x1="78"
                y1="50"
                x2="72"
                y2="50"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            {/* 6 o'clock */}
            <line
                x1="50"
                y1="78"
                x2="50"
                y2="72"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            {/* 9 o'clock */}
            <line
                x1="22"
                y1="50"
                x2="28"
                y2="50"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />

            {/* Hour hand — pointing toward ~10 o'clock */}
            <line
                x1="50"
                y1="50"
                x2="37"
                y2="38"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="3.2"
                strokeLinecap="round"
            />

            {/* Minute hand — pointing toward ~12 o'clock, slightly right */}
            <line
                x1="50"
                y1="50"
                x2="53"
                y2="22"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />

            {/* Center dot */}
            <circle cx="50" cy="50" r="3" fill="rgba(255,255,255,0.95)" />

            {/* Squircle inner edge highlight */}
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
