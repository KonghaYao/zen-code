import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { MultiSelectPro, MultiSelectOption } from '../../chat/components/input/MultiSelect';
import { AIProvider } from '../types';

const PROVIDER_OPTIONS: MultiSelectOption[] = [
    { label: 'OpenAI (GPT-4, o1 等)', value: 'openai' },
    { label: 'Anthropic (Claude)', value: 'anthropic' },
];

interface ProviderStepProps {
    provider: AIProvider | null;
    onSelect: (provider: AIProvider) => void;
    onNext: () => void;
    onExit: () => void;
}

export const ProviderStep: React.FC<ProviderStepProps> = ({ provider, onSelect, onNext }) => {
    // 当前选中的值
    const currentValues = useMemo(() => (provider ? [provider] : []), [provider]);

    return (
        <Box flexDirection="column" flexGrow={1} justifyContent="center" paddingX={2}>
            <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginBottom={1}>
                {/* Header */}
                <Box flexDirection="row" justifyContent="space-between" borderBottom={false}>
                    <Text color="cyan" bold>
                        选择提供商
                    </Text>
                    <Text color="gray">[2/4]</Text>
                </Box>

                {/* Main Content */}
                <Box flexDirection="column" marginTop={1}>
                    <Box marginBottom={1}>
                        <Text color="blue">步骤 ::</Text>
                        <Text color="white"> 选择 AI 提供商</Text>
                    </Box>

                    <Box marginBottom={1} flexDirection="column" gap={0}>
                        <Text color="gray">选择您要使用的 AI 服务：</Text>
                        <Text color="gray" dimColor>
                            • OpenAI: GPT-4, o1 等模型
                        </Text>
                        <Text color="gray" dimColor>
                            • Anthropic: Claude 3.5 Sonnet, Opus
                        </Text>
                    </Box>

                    <Box marginTop={1} marginBottom={1}>
                        <MultiSelectPro
                            options={PROVIDER_OPTIONS}
                            values={currentValues}
                            onChange={(values) => {
                                if (values.length > 0) {
                                    onSelect(values[0] as AIProvider);
                                }
                            }}
                            onSubmit={onNext}
                            singleSelect={true}
                            autoFocus={true}
                        />
                    </Box>
                </Box>

                {/* Footer */}
                <Box marginTop={1} paddingTop={1} borderTop={false} flexDirection="row" justifyContent="space-between">
                    <Box>
                        <Text color="gray" dimColor>
                            ↑/↓ 导航 | Enter 确认
                        </Text>
                    </Box>
                    <Box>
                        <Text color="cyan" bold>{`>>> 选择提供商`}</Text>
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
