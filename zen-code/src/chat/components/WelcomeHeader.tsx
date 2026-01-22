import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { getCurrentUser } from '../../utils/user';
import { useSettings } from '../context/SettingsContext';
import Shimmer from './Shimmer';
import { getTerminalName } from '../../utils/colors';

const WelcomeHeader: React.FC = () => {
    const username = getCurrentUser();
    const date = new Date().toLocaleDateString();
    const { extraParams, AVAILABLE_MODELS, config } = useSettings();
    const mcpConfig = extraParams.mcp_config || {};
    const mcpServerCount = Object.keys(mcpConfig).length;
    const terminalName = getTerminalName();

    // 系统环境信息
    const platform = process.platform;
    const platformDisplay = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Linux';
    const cwd = process.cwd();

    // 确定当前使用的提供商
    const provider = config?.model_provider || process.env.MODEL_PROVIDER || 'openai';

    // 根据提供商检查对应的配置
    const hasOpenAIKey = !!config?.openai_api_key;
    const hasOpenAIBaseUrl = !!config?.openai_base_url;
    const hasAnthropicKey = !!config?.anthropic_api_key;
    const hasModels = AVAILABLE_MODELS.length > 0;

    // 根据提供商判断是否配置完整
    const isConfigured =
        provider === 'anthropic'
            ? hasAnthropicKey && hasModels
            : hasOpenAIKey && hasOpenAIBaseUrl && hasModels;

    // 全局动画索引，用于同步所有 Shimmer 组件
    const [globalShimmerIndex, setGlobalShimmerIndex] = useState(0);

    useEffect(() => {
        const interval = 40;
        const maxTextLength = 28; // 最长的一行字符数
        const spread = 32;
        const maxIndex = maxTextLength + spread * 2;

        const timer = setInterval(() => {
            setGlobalShimmerIndex((prev) => (prev + 1) % maxIndex);
        }, interval);

        return () => clearInterval(timer);
    }, []);

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginBottom={1}>
            {/* Header: System Info */}
            <Box flexDirection="row" justifyContent="space-between" borderBottom={false}>
                <Text color="cyan" bold>
                    ZEN CODE
                </Text>
                <Text color="gray">{date}</Text>
            </Box>

            {/* Main Content */}
            <Box flexDirection="row" marginTop={1} gap={2}>
                {/* Left: Logo */}
                <Box flexDirection="column">
                    {`███████╗███████╗███╗   ██╗
╚══███╔╝██╔════╝████╗  ██║
  ███╔╝ █████╗  ██╔██╗ ██║
 ███╔╝  ██╔══╝  ██║╚██╗██║
███████╗███████╗██║ ╚████║
╚══════╝╚══════╝╚═╝  ╚═══╝`
                        .split('\n')
                        .map((line) => {
                            return <Shimmer key={line} interval={40} text={line} globalIndex={globalShimmerIndex} />;
                        })}
                </Box>

                {/* Right: Status Panel */}
                <Box flexDirection="column" justifyContent="center" flexGrow={1}>
                    <Box marginBottom={1}>
                        {isConfigured ? (
                            <Text color="green" bold>
                                {' '}
                                [ SYSTEM ONLINE ]
                            </Text>
                        ) : (
                            <Text color="red" bold>
                                {' '}
                                [ CONFIG REQUIRED ]
                            </Text>
                        )}
                    </Box>

                    <Box flexDirection="column" gap={0}>
                        <Box>
                            <Text color="blue">USER::</Text>
                            <Text color="white">{username}</Text>
                        </Box>
                        <Box>
                            <Text color="blue">ARCH::</Text>
                            <Text color="white">{process.arch}</Text>
                        </Box>
                        <Box>
                            <Text color="blue">PLATFORM::</Text>
                            <Text color="white">{platformDisplay}</Text>
                        </Box>
                        <Box>
                            <Text color="blue">NODE::</Text>
                            <Text color="white">{process.version}</Text>
                        </Box>
                        <Box>
                            <Text color="blue">TERM::</Text>
                            <Text color="white">{terminalName}</Text>
                        </Box>
                        <Box>
                            <Text color="blue">{process.env.MODEL_PROVIDER?.toUpperCase()}::</Text>
                            <Text color={hasModels ? 'white' : 'red'}>
                                {hasModels ? extraParams.main_model : '无可用模型'}
                            </Text>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Working Directory */}
            <Box marginTop={1} paddingX={1} flexDirection="column" gap={0}>
                <Box>
                    <Text color="blue">WORKING_DIR ::</Text>
                </Box>
                <Box>
                    <Text color="gray">{cwd}</Text>
                </Box>
            </Box>

            {/* Configuration Warning */}
            {!isConfigured && (
                <Box marginTop={1} paddingX={1} flexDirection="column" gap={0}>
                    <Text color="red" bold>
                        {provider === 'anthropic' ? '⚠️ 需要配置 Anthropic API:' : '⚠️ 需要配置 OpenAI API:'}
                    </Text>
                    {provider === 'anthropic' ? (
                        <>
                            {!hasAnthropicKey && <Text color="yellow">{'  '}• /config anthropic_api_key sk-ant-your-api-key</Text>}
                            {!hasModels && <Text color="yellow">{'  '}• 请确保网络连接正常以获取模型列表</Text>}
                        </>
                    ) : (
                        <>
                            {!hasOpenAIKey && <Text color="yellow">{'  '}• /config openai_api_key sk-your-api-key</Text>}
                            {!hasOpenAIBaseUrl && (
                                <Text color="yellow">{'  '}• /config openai_base_url https://api.openai.com/v1</Text>
                            )}
                            {!hasModels && <Text color="yellow">{'  '}• 请确保网络连接正常以获取模型列表</Text>}
                        </>
                    )}
                    <Text color="gray">{'  '}• 配置后使用 /model 查看可用模型</Text>
                </Box>
            )}

            {/* Footer: Capabilities */}
            <Box marginTop={1} paddingTop={1} borderTop={false} flexDirection="row" justifyContent="space-between">
                <Box gap={3}>
                    <Box>
                        <Text color="green">●</Text>
                        <Text color="white" dimColor>
                            {' '}
                            AGENTS
                        </Text>
                    </Box>
                    <Box>
                        <Text color={mcpServerCount > 0 ? 'green' : 'gray'}>●</Text>
                        <Text color="white" dimColor>
                            {' '}
                            MCP ({mcpServerCount})
                        </Text>
                    </Box>
                </Box>

                <Box>
                    {isConfigured ? (
                        <Text color="yellow" bold>{`>>> WAITING_FOR_INPUT`}</Text>
                    ) : (
                        <Text color="red" bold>{`>>> CONFIGURATION_NEEDED`}</Text>
                    )}
                    <Text color="yellow" dimColor>
                        {' '}
                        ▌
                    </Text>
                </Box>
            </Box>
        </Box>
    );
};

export default WelcomeHeader;
