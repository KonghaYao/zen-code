/**
 * 统一面板系统 - 虚拟滚动列表组件
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { VirtualScrollListProps } from './types';

/**
 * 虚拟滚动列表组件
 */
export function VirtualScrollList<T>({
    items,
    selectedIndex,
    itemHeight,
    visibleCount = 8,
    renderItem,
}: VirtualScrollListProps<T>) {
    if (items.length === 0) {
        return (
            <Box paddingX={1} paddingY={1}>
                <Text color="gray">暂无数据</Text>
            </Box>
        );
    }

    // 计算可见区域
    const viewportHeight = visibleCount * itemHeight;
    const totalHeight = items.length * itemHeight;

    // 计算滚动位置 (保持选中项在视野内)
    const scrollTop = useMemo(() => {
        const selectedPosition = selectedIndex * itemHeight;
        const viewportMiddle = viewportHeight / 2;

        if (selectedPosition < viewportMiddle) {
            return 0;
        }

        const maxScroll = Math.max(0, totalHeight - viewportHeight);
        return Math.min(selectedPosition - viewportMiddle, maxScroll);
    }, [selectedIndex, itemHeight, viewportHeight, totalHeight]);

    // 计算可见范围
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + 1, items.length);

    // 只渲染可见项
    const visibleItems = items.slice(startIndex, endIndex);

    return (
        <Box flexDirection="column" width="100%" gap={1}>
            {visibleItems.map((item, idx) => renderItem(item, startIndex + idx, startIndex + idx === selectedIndex))}
        </Box>
    );
}
