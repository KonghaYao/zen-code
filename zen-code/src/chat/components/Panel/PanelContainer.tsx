/**
 * 统一面板系统 - 通用容器组件
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { PanelContainerProps } from './types';

/**
 * 面板容器组件
 */
export const PanelContainer: React.FC<PanelContainerProps> = ({ title, icon, count, children, statusInfo }) => {
    return (
        <Box flexDirection="column" paddingX={1} paddingY={0} flexGrow={1}>
            {/* 标题栏 */}
            <Box paddingBottom={1} justifyContent="space-between">
                <Text color="yellow" bold>
                    {icon} {title} {count !== undefined && `(${count})`}
                </Text>
            </Box>

            {/* 主内容区 */}
            {children}

            {/* 状态栏 */}
            {statusInfo && (
                <Box marginTop={1} paddingX={1}>
                    {statusInfo}
                </Box>
            )}
        </Box>
    );
};
