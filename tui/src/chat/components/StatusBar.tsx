import React from 'react';
import { Box, Text } from 'ink';
import { useSettings } from '../context/SettingsContext';
import { useChat } from '@langgraph-js/sdk/react';

interface StatusBarProps {
    currentChatId?: string;
}

/**
 * 状态栏组件 - 显示应用状态信息
 * 包括：应用名称、当前模型、当前 Agent、Chat ID
 */
const StatusBar: React.FC<StatusBarProps> = ({}) => {
    const { extraParams } = useSettings();
    const { currentChatId } = useChat();

    return (
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
            </Box>
            <Box>
                <Text dimColor>{currentChatId?.slice(0, 6) || 'N/A'}</Text>
            </Box>
        </Box>
    );
};

export default StatusBar;
