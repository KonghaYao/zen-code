import React, { useState, useEffect, useMemo } from 'react';
import { Text } from 'ink';

export interface ShimmerProps {
    text: string;
    highlightColor?: string;
    baseColor?: string;
    interval?: number;
    spread?: number; // 过渡区域的大小
    globalIndex?: number; // 全局索引，用于同步多个 Shimmer
}

interface RGB {
    r: number;
    g: number;
    b: number;
}

const parseHex = (hex: string): RGB => {
    if (!hex || hex.length < 7) return { r: 0, g: 0, b: 0 };
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return { r, g, b };
};

const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));

const interpolateColor = (color1: RGB, color2: RGB, factor: number) => {
    const r = clamp(color1.r + factor * (color2.r - color1.r));
    const g = clamp(color1.g + factor * (color2.g - color1.g));
    const b = clamp(color1.b + factor * (color2.b - color1.b));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
};

const HALF_PI = Math.PI / 2;

export const Shimmer: React.FC<ShimmerProps> = ({
    text,
    highlightColor = '#00FFFF', // Cyan
    baseColor = '#003333', // Dark Cyan
    interval = 50,
    spread = 10,
    globalIndex,
}) => {
    // 如果提供了 globalIndex，使用它；否则使用本地状态
    const [localIndex, setLocalIndex] = useState(0);
    const index = globalIndex !== undefined ? globalIndex : localIndex;

    const rgbBase = useMemo(() => parseHex(baseColor), [baseColor]);
    const rgbHighlight = useMemo(() => parseHex(highlightColor), [highlightColor]);
    const chars = useMemo(() => text.split(''), [text]);

    // 只有在没有 globalIndex 时才启动本地定时器
    useEffect(() => {
        if (globalIndex !== undefined) return; // 如果有全局索引，不启动本地定时器

        const timer = setInterval(() => {
            setLocalIndex((prevIndex) => (prevIndex + 1) % (text.length + spread * 2));
        }, interval);

        return () => clearInterval(timer);
    }, [text.length, spread, interval, globalIndex]);

    const center = index - spread;

    // 优化：计算需要着色的范围，减少 Text 组件数量，避免长文字时的内存压力
    const startShimmer = Math.max(0, Math.floor(center - spread));
    const endShimmer = Math.min(chars.length, Math.ceil(center + spread));

    const leftPart = text.slice(0, startShimmer);
    const shimmerPart = chars.slice(startShimmer, endShimmer);
    const rightPart = text.slice(endShimmer);

    return (
        <Text>
            {leftPart ? (
                <Text key="static-left" color={baseColor}>
                    {leftPart}
                </Text>
            ) : null}
            {shimmerPart.map((char, i) => {
                const charIndex = startShimmer + i;
                const distance = Math.abs(charIndex - center);

                let color = baseColor;
                let isBold = false;

                if (distance < spread) {
                    // 使用余弦函数实现更平滑的渐变效果
                    const factor = Math.cos((distance / spread) * HALF_PI);
                    // 使用乘法代替 Math.pow
                    const smoothedFactor = factor * factor;

                    color = interpolateColor(rgbBase, rgbHighlight, smoothedFactor);
                    isBold = distance < 1;
                }

                return (
                    <Text key={charIndex} color={color} bold={isBold}>
                        {char}
                    </Text>
                );
            })}
            {rightPart ? (
                <Text key="static-right" color={baseColor}>
                    {rightPart}
                </Text>
            ) : null}
        </Text>
    );
};
