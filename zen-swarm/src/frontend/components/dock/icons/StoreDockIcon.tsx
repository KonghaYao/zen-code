/**
 * StoreDockIcon — macOS-quality remote store / marketplace icon
 *
 * Design: teal-to-indigo gradient background with a simplified
 * "cloud download" motif (cloud shape + downward arrow).
 */

import { useId } from 'react';

interface StoreDockIconProps {
    className?: string;
    style?: React.CSSProperties;
}

export function StoreDockIcon({ className, style }: StoreDockIconProps) {
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
                <linearGradient id={ids.bg} x1="15%" y1="0%" x2="85%" y2="100%">
                    <stop offset="0%" stopColor="#5EEAD4" />
                    <stop offset="50%" stopColor="#0EA5E9" />
                    <stop offset="100%" stopColor="#4F46E5" />
                </linearGradient>
                <radialGradient id={ids.glow} cx="28%" cy="20%" r="52%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
                <linearGradient id={ids.specV} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
                    <stop offset="40%" stopColor="rgba(255,255,255,0.04)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                <linearGradient id={ids.dark} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="50%" stopColor="rgba(0,0,0,0)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
                </linearGradient>
            </defs>

            {/* Background */}
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.bg})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.glow})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.specV})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.dark})`} />

            {/* Cloud shape */}
            <path
                d="M 30 52 Q 22 52 22 44 Q 22 36 30 35 Q 30 26 39 25 Q 45 20 52 24 Q 60 20 66 26 Q 74 26 74 34 Q 80 35 80 43 Q 80 52 72 52 Z"
                fill="rgba(255,255,255,0.92)"
            />

            {/* Downward arrow shaft */}
            <rect x="46" y="54" width="8" height="18" rx="2" fill="rgba(255,255,255,0.92)" />

            {/* Downward arrow head */}
            <polygon points="38,68 50,80 62,68" fill="rgba(255,255,255,0.92)" />

            {/* Edge highlight */}
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
