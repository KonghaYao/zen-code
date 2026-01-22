/**
 * 统一面板系统 - 列表项渲染组件
 */

import React from 'react';
import { Box, Text } from 'ink';

export interface SelectItemProps {
    /** 选中状态 */
    isSelected: boolean;
    /** 是否为当前项 */
    isCurrent?: boolean;
    /** 主内容（必选） */
    children: React.ReactNode;
    /** 前置图标（emoji 等） */
    prefix?: React.ReactNode;
    /** 前置图标颜色 */
    prefixColor?: string;
    /** 后置标签（如 [当前]） */
    suffix?: React.ReactNode;
    /** 后置标签颜色 */
    suffixColor?: string;
}

/**
 * 统一的列表项组件
 *
 * 使用示例：
 * ```tsx
 * <SelectItem isSelected={true} isCurrent={true} prefix="🟢">
 *   <Text>主要内容</Text>
 *   <Text dimColor> - 描述</Text>
 * </SelectItem>
 * ```
 */
export function SelectItem({
    isSelected,
    isCurrent = false,
    children,
    prefix,
    prefixColor,
    suffix,
    suffixColor = 'green',
}: SelectItemProps) {
    return (
        <Box paddingX={1} paddingY={0}>
            {/* 选中标记 */}
            <Text color={isSelected ? 'cyan' : 'gray'}>{isSelected ? '>' : ' '}</Text>

            {/* 前置图标 */}
            {prefix && <Text color={prefixColor || (isSelected || isCurrent ? 'cyan' : 'gray')}>{prefix}</Text>}

            {/* 主内容 */}
            <Text color={isSelected ? 'cyan' : 'gray'}> </Text>
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    // 克隆子元素并覆盖颜色属性
                    return React.cloneElement(child as React.ReactElement<any>, {
                        /* @ts-ignore */
                        color: isSelected ? 'cyan' : child.props?.color || 'white',
                        /* @ts-ignore */
                        bold: isSelected ? true : child.props?.bold,
                    });
                }
                return child;
            })}
        </Box>
    );
}
