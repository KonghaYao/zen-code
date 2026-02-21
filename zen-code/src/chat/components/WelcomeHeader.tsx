import React from 'react';
import { Box, Text } from 'ink';
import { getCurrentUser, getTerminalName } from '@codegraph/union-client';
import { useSettings } from '../context/SettingsContext';

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

    // 确定当前使用的 provider
    const provider = config?.provider_id || process.env.MODEL_PROVIDER || 'openai';

    // 获取当前 provider 配置
    const currentProvider = config?.providers?.find((p: any) => p.id === provider);
    const hasProviderKey = !!currentProvider?.apiKey;

    const hasModels = AVAILABLE_MODELS.length > 0;

    // 检查配置是否完整
    const isConfigured = hasProviderKey && hasModels;

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
                    <Text color="cyan">
                        {`███████╗███████╗███╗   ██╗
╚══███╔╝██╔════╝████╗  ██║
  ███╔╝ █████╗  ██╔██╗ ██║
 ███╔╝  ██╔══╝  ██║╚██╗██║
███████╗███████╗██║ ╚████║
╚══════╝╚══════╝╚═╝  ╚═══╝`}
                    </Text>
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
                            <Text color="blue">{provider?.toUpperCase()}::</Text>
                            <Text color={hasModels ? 'white' : 'red'}>
                                {hasModels ? extraParams.model_id : '无可用模型'}
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
                        ⚠️ 需要配置 {provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API:
                    </Text>
                    {!hasProviderKey && <Text color="yellow"> • 请使用 /m 进入模型配置面板</Text>}
                    {!hasModels && <Text color="yellow"> • 请确保网络连接正常以获取模型列表</Text>}
                    <Text color="gray"> • 配置后使用 /m 查看可用模型</Text>
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
