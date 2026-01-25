import React from 'react';
import { Box, Text } from 'ink';
import { useSettings } from '@codegraph/union-client';
import { useChat } from '@langgraph-js/sdk/react';
import { MCPStatusPanel } from './MCPStatusPanel';

interface StatusBarProps {
    currentChatId?: string;
}

/**
 * 状态栏组件 - 显示应用状态信息
 * 包括：应用名称、当前模型、当前 Agent、Chat ID、MCP 状态、YOLO 模式
 */
const StatusBar: React.FC<StatusBarProps> = ({ }) => {
    const { extraParams } = useSettings();
    const { currentChatId, renderMessages } = useChat();
    const isYoloMode = process.env.YOLO_MODE === 'true';

    // 检查消息数量，超过 100 时提示可压缩
    const messageCount = renderMessages?.length || 0;
    const shouldShowCompressionHint = messageCount > 100;

    return (
        <Box flexDirection="column" width="100%">
            <Box paddingX={1} paddingY={0} justifyContent="space-between" width="100%">
                <Box>
                    <Text color="magenta" bold>
                        ⚡ Zen Code
                    </Text>
                    <Text color="cyan" bold>
                        {' '}
                        {extraParams.main_model}
                    </Text>
                    <Text color="yellow" bold>
                        {' '}
                        @{extraParams.switch_command || 'default'}
                    </Text>
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
                            💡 /summary
                        </Text>
                    )}
                </Box>
                <Box>
                    <Text dimColor>{currentChatId?.slice(0, 6) || 'N/A'}</Text>
                </Box>
            </Box>
        </Box>
    );
};

export default StatusBar;
