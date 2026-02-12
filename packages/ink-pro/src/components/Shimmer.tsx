import React, { useState, useEffect } from 'react';
import { Text } from 'ink';

interface ShimmerProps {
    text: string;
    highlightColor?: string;
    baseColor?: string;
    interval?: number;
    spread?: number; // 过渡区域的大小
    globalIndex?: number; // 全局索引，用于同步多个 Shimmer
}

const interpolateColor = (color1: string, color2: string, factor: number) => {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);

    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
};

export const Shimmer: React.FC<ShimmerProps> = ({
    text,
    highlightColor = '#00FFFF', // Cyan
    baseColor = '#003333', // Dark Cyan
    interval = 20,
    spread = 32,
    globalIndex,
}) => {
    // 如果提供了 globalIndex，使用它；否则使用本地状态
    const [localIndex, setLocalIndex] = useState(0);
    const index = globalIndex !== undefined ? globalIndex : localIndex;

    // 只有在没有 globalIndex 时才启动本地定时器
    useEffect(() => {
        if (globalIndex !== undefined) return; // 如果有全局索引，不启动本地定时器

        const timer = setInterval(() => {
            setLocalIndex((prevIndex) => (prevIndex + 1) % (text.length + spread * 2));
        }, interval);

        return () => clearInterval(timer);
    }, [text.length, spread, interval, globalIndex]);

    return (
        <Text>
            {text.split('').map((char, i) => {
                // 计算当前字符距离聚光灯中心的距离
                // index 从 0 运动到 text.length + spread * 2
                // 我们让聚光灯中心点相对于 text 的位置偏移一下，使得它能从左侧完全进入并从右侧完全离开
                const center = index - spread;
                const distance = Math.abs(i - center);

                let color = baseColor;
                let isBold = false;

                if (distance < spread) {
                    // 使用余弦函数实现更平滑的渐变效果：
                    // 核心逻辑：cos(0)=1 (中心)，cos(pi/2)=0 (边缘)
                    const factor = Math.cos((distance / spread) * (Math.PI / 2));

                    // 使用幂运算进一步平滑过渡，增强“中间实，两边虚”的视觉感
                    const smoothedFactor = Math.pow(factor, 2);

                    color = interpolateColor(baseColor, highlightColor, smoothedFactor);
                    isBold = distance < 1;
                }

                return (
                    <Text key={i} color={color} bold={isBold}>
                        {char}
                    </Text>
                );
            })}
        </Text>
    );
};

export default Shimmer;
