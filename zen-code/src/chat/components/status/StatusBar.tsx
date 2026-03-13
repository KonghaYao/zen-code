import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { useSettings } from '../../context/SettingsContext';
import { useChat } from '@langgraph-js/sdk/react';
import { MCPStatusPanel } from '../panels/mcp/MCPStatusPanel';
import { Shimmer, useInput } from 'ink-pro';
import { useLoadingTimer, formatDuration } from '../../hooks/useSystemResources';
import SystemInfoBar from '../common/SystemInfoBar';
import { processManager } from '../../services/ProcessManagerService.js';
import { useZenCoreStatus } from '../../hooks/useZenCoreStatus.js';
import path from 'path';

/**
 * 状态栏组件 - 显示应用状态信息
 * 第一行：应用名称、当前模型、当前 Agent、MCP 状态、YOLO 模式、紧凑模式、当前文件夹、消息数量、Ctrl+C 提示
 * 第二行：系统资源（CPU、内存）- 受 showDetailedInfo 控制
 */
const StatusBar: React.FC = () => {
    const { extraParams, compactMode, showDetailedInfo } = useSettings();
    const { currentChatId, renderMessages } = useChat();
    const { loading: chatLoading, stopGeneration } = useChat();
    const isYoloMode = process.env.YOLO_MODE === 'true';
    const [backgroundProcessCount, setBackgroundProcessCount] = useState(0);
    const zenCoreStatus = useZenCoreStatus();

    // 轮询后台进程数量（每 2 秒）
    useEffect(() => {
        const updateProcessCount = async () => {
            const processes = await processManager.getProcessList();
            setBackgroundProcessCount(processes.length);
        };

        updateProcessCount();
        const interval = setInterval(updateProcessCount, 2000);
        return () => clearInterval(interval);
    }, []);

    // Ctrl+C 处理逻辑 - 使用 useCallback 避免重复注册
    const handleInput = useCallback(
        (input: string, key: any) => {
            if (key.ctrl && input === 'c') {
                // if (chatLoading) {
                //     stopGeneration();
                // }
                process.exit();
            }
        },
        [chatLoading, stopGeneration],
    );

    useInput(handleInput);

    // Loading 计时
    const loadingDuration = useLoadingTimer(chatLoading);

    // 获取当前工作目录的文件夹名称
    const currentFolderName = React.useMemo(() => {
        return path.basename(process.cwd());
    }, []);

    // 检查消息数量，超过 100 时提示可压缩
    const messageCount = renderMessages?.length || 0;
    const shouldShowCompressionHint = messageCount > 100;

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
                    {/* zen-core 状态 */}
                    <Text color={zenCoreStatus.online ? 'green' : 'red'}>
                        {zenCoreStatus.online ? '● core' : '○ core'}
                    </Text>
                    {backgroundProcessCount > 0 && (
                        <Text color="magenta" bold>
                            {' '}
                            ● BG ({backgroundProcessCount})
                        </Text>
                    )}
                    {shouldShowCompressionHint && (
                        <Text color="red" bold>
                            {' '}
                            /summary
                        </Text>
                    )}
                    <Text color="green" bold>
                        {renderMessages.length}
                    </Text>
                    <Text color="blue">{currentFolderName}</Text>
                </Box>
                {/* Loading 计时 */}
                {chatLoading && (
                    <Box>
                        <Text color="yellow">{formatDuration(loadingDuration)}</Text>
                    </Box>
                )}
            </Box>

            {/* 第二行：系统资源（受 showDetailedInfo 控制） */}
            {showDetailedInfo && <SystemInfoBar />}
        </Box>
    );
};

export default StatusBar;
