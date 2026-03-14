/**
 * PostmanDockIcon — macOS-quality HTTP Client app icon
 *
 * Layer stack (bottom to top):
 * 1. Squircle background — warm orange diagonal gradient
 * 2. Top-left radial glow — simulates light source
 * 3. Vertical specular highlight — sculpts curvature
 * 4. Bottom darkening — adds visual weight
 * 5. Send arrow icon — stylized > with HTTP wave lines
 * 6. Inner edge highlight — craftsmanship detail
 */

import { useId } from 'react';

interface PostmanDockIconProps {
    className?: string;
    style?: React.CSSProperties;
}

export function PostmanDockIcon({ className, style }: PostmanDockIconProps) {
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
                {/* Background: warm orange-red gradient */}
                <linearGradient id={ids.bg} x1="15%" y1="0%" x2="85%" y2="100%">
                    <stop offset="0%" stopColor="#FF8C42" />
                    <stop offset="48%" stopColor="#FF6B2B" />
                    <stop offset="100%" stopColor="#D94010" />
                </linearGradient>

                {/* Top-left radial glow */}
                <radialGradient id={ids.glow} cx="28%" cy="20%" r="52%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>

                {/* Vertical specular highlight */}
                <linearGradient id={ids.specV} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
                    <stop offset="40%" stopColor="rgba(255,255,255,0.04)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>

                {/* Bottom darkening */}
                <linearGradient id={ids.dark} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="50%" stopColor="rgba(0,0,0,0)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
                </linearGradient>
            </defs>

            {/* Squircle background layers */}
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.bg})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.glow})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.specV})`} />
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.dark})`} />

            {/* Send / arrow symbol — stylized > arrow */}
            <path d="M 28 50 L 58 32 L 58 42 L 72 42 L 72 58 L 58 58 L 58 68 Z" fill="rgba(255,255,255,0.95)" />

            {/* HTTP wave lines to the right of arrow */}
            <line
                x1="67"
                y1="36"
                x2="78"
                y2="36"
                stroke="rgba(255,255,255,0.75)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            <line
                x1="67"
                y1="42"
                x2="82"
                y2="42"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <line
                x1="67"
                y1="58"
                x2="82"
                y2="58"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <line
                x1="67"
                y1="64"
                x2="78"
                y2="64"
                stroke="rgba(255,255,255,0.75)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />

            {/* Inner edge highlight */}
            <rect
                x="1.5"
                y="1.5"
                width="97"
                height="97"
                rx="21.5"
                ry="21.5"
                fill="none"
                stroke="rgba(255,255,255,0.24)"
                strokeWidth="0.8"
            />
        </svg>
    );
}
