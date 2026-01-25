import React from 'react';
import { Box, Text } from 'ink';
import { EnhancedTextInput } from '../../chat/components/input/EnhancedTextInput';
import { AIProvider, DEFAULT_BASE_URLS } from '../types';

interface CredentialsStepProps {
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

export const CredentialsStep: React.FC<CredentialsStepProps> = ({
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
    const defaultUrl = DEFAULT_BASE_URLS[provider];

    const handleApiKeySubmit = (value: string) => {
        // API Key 提交后，焦点移到 Base URL 输入
        // 但这里我们使用单个提交按钮，所以不自动跳转
    };

    const handleBaseUrlSubmit = (value: string) => {
        // Base URL 提交后进入下一步
        onNext();
    };

    const handleNext = () => {
        onNext();
    };

    return (
        <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1} justifyContent="center">
            <Box marginBottom={1}>
                <Text bold>输入凭据</Text>
            </Box>

            <Box marginBottom={1}>
                <Text color="gray">{PROVIDER_URLS[provider]}</Text>
            </Box>

            <Box flexDirection="column" marginBottom={1} gap={1}>
                <Box>
                    <Text color="gray">API Key:</Text>
                </Box>
                <Box>
                    <EnhancedTextInput
                        value={apiKey}
                        onChange={onApiKeyChange}
                        onSubmit={handleApiKeySubmit}
                        placeholder="sk-..."
                        mask="*"
                        autoFocus={true}
                        id="api-key-input"
                    />
                </Box>

                <Box marginTop={1}>
                    <Text color="gray">Base URL (可选):</Text>
                </Box>
                <Box>
                    <EnhancedTextInput
                        value={baseUrl}
                        onChange={onBaseUrlChange}
                        onSubmit={handleBaseUrlSubmit}
                        placeholder={defaultUrl}
                        id="base-url-input"
                    />
                </Box>
            </Box>

            {error && (
                <Box marginBottom={1}>
                    <Text color="red">{error}</Text>
                </Box>
            )}

            <Box>
                <Text color="cyan">[Enter 确认]</Text>
                <Text> </Text>
                <Text color="red">[Ctrl+C 退出]</Text>
            </Box>
        </Box>
    );
};
