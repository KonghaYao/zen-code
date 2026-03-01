/**
 * ConfigDockIcon — macOS-quality settings/config icon
 *
 * Design layers (bottom to top):
 * 1. Squircle background  — slate three-stop diagonal gradient (light slate → medium slate-blue → dark navy)
 * 2. Top-left radial glow — radial gradient simulating a light source on a sphere
 * 3. Vertical specular    — linear gradient white fade, adds curvature
 * 4. Bottom darkening     — subtle darkening at the bottom edge for visual weight
 * 5. Slider bars (×3)    — three horizontal equalizer-style slider tracks (white, low opacity)
 * 6. Knob circles (×3)   — draggable knob on each slider track (white, high opacity)
 * 7. Knob inner rings    — subtle inner ring on each knob for depth
 * 8. Squircle edge highlight — 0.8 px white stroke, macOS craftsmanship feel
 */

import { useId } from 'react';

interface ConfigDockIconProps {
    className?: string;
    style?: React.CSSProperties;
}

export function ConfigDockIcon({ className, style }: ConfigDockIconProps) {
    const uid = useId().replace(/:/g, '');

    // Unique IDs for all gradient / filter defs — avoids conflicts when the icon
    // is rendered multiple times on the same page.
    const ids = {
        bg: `${uid}-bg`,
        glow: `${uid}-gl`,
        specV: `${uid}-sv`,
        dark: `${uid}-dk`,
    };

    // ── Slider geometry ──────────────────────────────────────────────────────
    // Three horizontal slider bars, evenly spaced across the icon center.
    // Each bar spans x = [18, 82] and has a draggable knob at a staggered cx.
    const sliders = [
        { yCenter: 30, knobCx: 42 }, // top bar    — knob slightly left of center
        { yCenter: 50, knobCx: 63 }, // middle bar — knob right of center
        { yCenter: 70, knobCx: 38 }, // bottom bar — knob left of center
    ];

    const barX1 = 18; // track left edge
    const barX2 = 82; // track right edge
    const barHeight = 3.5; // track thickness
    const barRx = 1.75; // track corner radius (= height / 2 → pill shape)
    const knobR = 7; // knob circle radius
    const innerR = 4.5; // inner ring radius (depth illusion)

    return (
        <svg
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={style}
            aria-hidden="true"
        >
            <defs>
                {/* ── Background main gradient ─────────────────────────────────
                    Diagonal: light slate (top-left) → medium slate-blue → dark navy (bottom-right) */}
                <linearGradient id={ids.bg} x1="15%" y1="0%" x2="85%" y2="100%">
                    <stop offset="0%" stopColor="#94A3B8" />
                    <stop offset="44%" stopColor="#4B6280" />
                    <stop offset="100%" stopColor="#1E3050" />
                </linearGradient>

                {/* ── Top-left radial glow ─────────────────────────────────────
                    Simulates a light source hitting the upper-left of a rounded surface */}
                <radialGradient id={ids.glow} cx="28%" cy="20%" r="52%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>

                {/* ── Vertical specular highlight ──────────────────────────────
                    White fade from top, reinforces the sphere-lit curvature */}
                <linearGradient id={ids.specV} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.36)" />
                    <stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>

                {/* ── Bottom darkening ─────────────────────────────────────────
                    Adds visual weight so the icon doesn't look flat */}
                <linearGradient id={ids.dark} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="50%" stopColor="rgba(0,0,0,0)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
                </linearGradient>
            </defs>

            {/* ══ Squircle background: 4 stacked layers ══ */}
            {/* Layer 1 — base color gradient */}
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.bg})`} />
            {/* Layer 2 — top-left glow */}
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.glow})`} />
            {/* Layer 3 — vertical specular */}
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.specV})`} />
            {/* Layer 4 — bottom darkening */}
            <rect x="1" y="1" width="98" height="98" rx="22" ry="22" fill={`url(#${ids.dark})`} />

            {/* ══ Slider bars + knobs ══
                Rendered in two passes so all tracks appear behind all knobs. */}

            {/* Pass 1: slider tracks */}
            {sliders.map(({ yCenter }, i) => (
                <rect
                    key={`track-${i}`}
                    x={barX1}
                    y={yCenter - barHeight / 2}
                    width={barX2 - barX1}
                    height={barHeight}
                    rx={barRx}
                    ry={barRx}
                    fill="rgba(255,255,255,0.40)"
                />
            ))}

            {/* Pass 2: knob circles (on top of tracks) */}
            {sliders.map(({ yCenter, knobCx }, i) => (
                <g key={`knob-${i}`}>
                    {/* Knob fill — bright white disc */}
                    <circle cx={knobCx} cy={yCenter} r={knobR} fill="rgba(255,255,255,0.95)" />
                    {/* Knob inner ring — subtle dark stroke for depth */}
                    <circle
                        cx={knobCx}
                        cy={yCenter}
                        r={innerR}
                        fill="none"
                        stroke="rgba(0,0,0,0.12)"
                        strokeWidth="0.8"
                    />
                </g>
            ))}

            {/* ══ Squircle inner edge highlight ══
                0.8 px white stroke mimics the polished-glass edge of macOS icons */}
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
