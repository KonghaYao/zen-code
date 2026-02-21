import React from 'react';
import { Box, Text } from 'ink';
import { useSettings } from '../context/SettingsContext';
import { useChat } from '@langgraph-js/sdk/react';
import { MCPStatusPanel } from './MCPStatusPanel';
import { Shimmer } from 'ink-pro';
import {
    useSystemResources,
    useLoadingTimer,
    useTokenUsage,
    formatBytes,
    formatTokens,
    formatDuration,
    getCpuColor,
    getMemoryColor,
} from '../hooks/useSystemResources';

/**
 * 状态栏组件 - 显示应用状态信息
 * 第一行：应用名称、当前模型、当前 Agent、Chat ID、MCP 状态、YOLO 模式、紧凑模式
 * 第二行：CPU、内存、Token、Loading 计时
 */
const StatusBar: React.FC = () => {
    const { extraParams, compactMode } = useSettings();
    const { currentChatId, renderMessages } = useChat();
    const { loading: chatLoading } = useChat();
    const isYoloMode = process.env.YOLO_MODE === 'true';

    // 系统资源使用情况
    const systemResources = useSystemResources();
    // Loading 计时
    const loadingDuration = useLoadingTimer(chatLoading);
    // Token 使用量
    const tokenUsage = useTokenUsage(renderMessages);

    // 检查消息数量，超过 100 时提示可压缩
    const messageCount = renderMessages?.length || 0;
    const shouldShowCompressionHint = messageCount > 100;

    // 颜色计算
    const cpuColor = getCpuColor(systemResources.cpuPercent);
    const memColor = getMemoryColor(systemResources.memoryHeapUsed, systemResources.memoryHeapTotal);

    return (
        <Box flexDirection="column" width="100%">
            {/* 第一行：应用状态 */}
            <Box paddingX={1} paddingY={0} justifyContent="space-between" width="100%" marginBottom={1}>
                <Box gap={1}>
                    {chatLoading && (
                        <Text color="yellow" bold>
                            <Shimmer text="LOADING"></Shimmer>
                        </Text>
                    )}
                    {!chatLoading && (
                        <Text color="magenta" bold>
                            Zen Code
                        </Text>
                    )}
                    <Text color="cyan" bold>
                        {' '}
                        {extraParams.model_id}
                    </Text>
                    <Text color="yellow" bold>
                        {' '}
                        @{extraParams.switch_command || 'default'}
                    </Text>
                    {!compactMode && (
                        <Text color="blue" bold>
                            {' '}
                            [FULL]
                        </Text>
                    )}
                    {isYoloMode && (
                        <Text color="red" bold>
                            {' '}
                            YOLO
                        </Text>
                    )}
                    <MCPStatusPanel />
                    {shouldShowCompressionHint && (
                        <Text color="red" bold>
                            {' '}
                            /summary
                        </Text>
                    )}
                    <Text color="green" bold>
                        {renderMessages.length}
                    </Text>
                </Box>
                <Box>
                    <Text dimColor>{currentChatId?.slice(0, 6) || 'N/A'}</Text>
                </Box>
            </Box>

            {/* 第二行：系统资源 + Token + Loading 计时 */}
            <Box paddingX={1} width="100%" justifyContent="space-between">
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
                    {tokenUsage.outputTokens > 0 && (
                        <Box>
                            <Text color="cyan">{formatTokens(tokenUsage.outputTokens)}</Text>
                        </Box>
                    )}
                </Box>
                {/* Loading 计时 */}
                {chatLoading && (
                    <Box>
                        <Text color="yellow">{formatDuration(loadingDuration)}</Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default StatusBar;
