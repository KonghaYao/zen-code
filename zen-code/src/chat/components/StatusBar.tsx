import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { useSettings } from '@codegraph/union-client';
import { useChat } from '@langgraph-js/sdk/react';
import { MCPStatusPanel } from './MCPStatusPanel';
import { Shimmer } from 'ink-pro';

interface StatusBarProps {
    currentChatId?: string;
}

/**
 * 状态栏组件 - 显示应用状态信息
 * 包括：应用名称、当前模型、当前 Agent、Chat ID、MCP 状态、YOLO 模式、紧凑模式
 */
const StatusBar: React.FC<StatusBarProps> = ({}) => {
    const { extraParams, compactMode } = useSettings();
    const { currentChatId, renderMessages } = useChat();
    const { loading: chatLoading } = useChat();
    const isYoloMode = process.env.YOLO_MODE === 'true';

    // 检查消息数量，超过 100 时提示可压缩
    const messageCount = renderMessages?.length || 0;
    const shouldShowCompressionHint = messageCount > 100;

    return (
        <Box flexDirection="column" width="100%">
            <Box paddingX={1} paddingY={0} justifyContent="space-between" width="100%">
                <Box gap={1}>
                    {chatLoading && (
                        <Text color="yellow" bold>
                            <Spinner></Spinner>
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
        </Box>
    );
};

export default StatusBar;
