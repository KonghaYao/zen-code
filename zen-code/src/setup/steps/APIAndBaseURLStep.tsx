import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { EnhancedTextInput } from '../../chat/components/input/EnhancedTextInput';
import { AIProvider, DEFAULT_BASE_URLS } from '../types';

interface APIAndBaseURLStepProps {
    provider: AIProvider;
    apiKey: string;
    baseUrl: string;
    onApiKeyChange: (key: string) => void;
    onBaseUrlChange: (url: string) => void;
    onNext: () => void;
    onBack: () => void;
    onExit: () => void;
    error?: string | null;
}

const PROVIDER_URLS: Record<AIProvider, string> = {
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/settings/keys',
};

type InputField = 'apiKey' | 'baseUrl';

export const APIAndBaseURLStep: React.FC<APIAndBaseURLStepProps> = ({
    provider,
    apiKey,
    baseUrl,
    onApiKeyChange,
    onBaseUrlChange,
    onNext,
    onBack,
    onExit,
    error,
}) => {
    const [activeField, setActiveField] = useState<InputField>('apiKey');
    const [localApiKey, setLocalApiKey] = useState(apiKey);
    const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);

    const defaultUrl = DEFAULT_BASE_URLS[provider];

    const handleApiKeyChange = (value: string) => {
        setLocalApiKey(value);
        onApiKeyChange(value);
    };

    const handleBaseUrlChange = (value: string) => {
        setLocalBaseUrl(value);
        onBaseUrlChange(value);
    };

    const handleApiKeySubmit = (value: string) => {
        value = value.trim();
        handleApiKeyChange(value);
        onNext();
    };

    const handleBaseUrlSubmit = (value: string) => {
        value = value.trim();
        handleBaseUrlChange(value);
        onNext();
    };

    // 键盘输入处理
    useInput((input, key) => {
        if (key.ctrl && input === 'c') {
            onExit();
        }

        // ESC 返回上一步
        if (key.escape) {
            onBack();
            return;
        }
    });

    return (
        <Box flexDirection="column" flexGrow={1} justifyContent="center" paddingX={2}>
            <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginBottom={1}>
                {/* Header */}
                <Box flexDirection="row" justifyContent="space-between" borderBottom={false}>
                    <Text color="cyan" bold>
                        API CONFIGURATION
                    </Text>
                    <Text color="gray">[3/4]</Text>
                </Box>

                {/* Main Content */}
                <Box flexDirection="column" marginTop={1}>
                    <Box marginBottom={1}>
                        <Text color="blue">PROVIDER::</Text>
                        <Text color="white">{provider.toUpperCase()}</Text>
                    </Box>
                    {/* Base URL 输入 */}
                    <Box marginBottom={1}>
                        <Text bold>Base URL (可选)</Text>
                    </Box>
                    <Box marginBottom={1}>
                        <Text color="gray">默认值: {defaultUrl}</Text>
                    </Box>
                    <Box marginBottom={1}>
                        <EnhancedTextInput
                            value={localBaseUrl}
                            onChange={handleBaseUrlChange}
                            onSubmit={handleBaseUrlSubmit}
                            placeholder={defaultUrl}
                        />
                    </Box>

                    {/* API Key 输入 */}
                    <Box marginBottom={1}>
                        <Text bold>API 密钥</Text>
                    </Box>
                    <Box marginBottom={1}>
                        <Text color="gray">获取地址: {PROVIDER_URLS[provider]}</Text>
                    </Box>
                    <Box marginBottom={activeField === 'apiKey' && error ? 0 : 1}>
                        <EnhancedTextInput
                            value={localApiKey}
                            onChange={handleApiKeyChange}
                            onSubmit={handleApiKeySubmit}
                            placeholder="sk-..."
                            autoFocus={false}
                        />
                    </Box>

                    {error && activeField === 'apiKey' && (
                        <Box marginBottom={1}>
                            <Text color="red">✗ {error}</Text>
                        </Box>
                    )}

                    {/* 提示信息 */}
                    {activeField === 'baseUrl' && !localBaseUrl && (
                        <Box>
                            <Text color="gray" dimColor>
                                💡 留空使用默认值
                            </Text>
                        </Box>
                    )}
                </Box>

                {/* Footer */}
                <Box marginTop={1} paddingTop={1} borderTop={false} flexDirection="row" justifyContent="space-between">
                    <Box>
                        <Text color="gray" dimColor>
                            Tab/Shift+Tab 切换 | Enter 确认 | Esc 返回
                        </Text>
                    </Box>
                    <Box>
                        <Text color="cyan" bold>{`>>> 输入 API 密钥`}</Text>
                        <Text color="cyan" dimColor>
                            {' '}
                            ▌
                        </Text>
                    </Box>
                </Box>
            </Box>

            {/* Exit Hint */}
            <Box flexDirection="row" justifyContent="center">
                <Text color="gray" dimColor>
                    [Ctrl+C 退出]
                </Text>
            </Box>
        </Box>
    );
};
