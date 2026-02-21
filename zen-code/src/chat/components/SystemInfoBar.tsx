import React from 'react';
import { Box, Text } from 'ink';
import { useSystemResources, formatBytes, getCpuColor, getMemoryColor } from '../hooks/useSystemResources';

/**
 * 系统信息栏组件 - 显示系统资源使用情况
 * CPU、内存等信息
 */
const SystemInfoBar: React.FC = () => {
    // 系统资源使用情况
    const systemResources = useSystemResources();

    // 颜色计算
    const cpuColor = getCpuColor(systemResources.cpuPercent);
    const memColor = getMemoryColor(systemResources.memoryHeapUsed, systemResources.memoryHeapTotal);

    return (
        <Box paddingX={1} width="100%">
            <Box gap={2}>
                <Box>
                    <Text dimColor>CPU:</Text>
                    <Text color={cpuColor}> {systemResources.cpuPercent.toFixed(0)}%</Text>
                </Box>
                <Box>
                    <Text dimColor>MEM:</Text>
                    <Text color={memColor}>
                        {formatBytes(systemResources.memoryHeapUsed)}/{formatBytes(systemResources.memoryRSS)}
                    </Text>
                </Box>
            </Box>
        </Box>
    );
};

export default SystemInfoBar;
