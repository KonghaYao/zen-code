import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { AIProvider } from '../types';
import { dbPath } from '../../chat/store';

interface CompleteStepProps {
    provider: AIProvider;
    model: string;
    onExit: () => void;
}

const PROVIDER_NAMES: Record<AIProvider, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
};

export const CompleteStep: React.FC<CompleteStepProps> = ({ provider, model, onExit }) => {
    // 任意键退出
    useInput((input, key) => {
        // 任意键退出（除了 Ctrl+C 已经被全局处理）
        if (input || key.return) {
            onExit();
        }
    });

    return (
        <Box flexDirection="column" flexGrow={1} justifyContent="center" paddingX={2}>
            <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1} marginBottom={1}>
                {/* Header */}
                <Box flexDirection="row" justifyContent="space-between" borderBottom={false}>
                    <Text color="green" bold>
                        ✓ 配置完成
                    </Text>
                    <Text color="gray">[完成]</Text>
                </Box>

                {/* Main Content */}
                <Box flexDirection="column" marginTop={1}>
                    <Box marginBottom={1}>
                        <Text color="blue">状态 ::</Text>
                        <Text color="green">配置已保存</Text>
                    </Box>

                    <Box flexDirection="column" marginBottom={2} gap={1}>
                        <Box>
                            <Text color="blue">提供商 ::</Text>
                            <Text color="white">{PROVIDER_NAMES[provider]}</Text>
                        </Box>
                        <Box>
                            <Text color="blue">模型 ::</Text>
                            <Text color="white">{model}</Text>
                        </Box>
                        <Box>
                            <Text color="blue">配置路径 ::</Text>
                            <Text color="gray">{dbPath}</Text>
                        </Box>
                    </Box>

                    <Box marginBottom={1} flexDirection="column" gap={0}>
                        <Text color="green" bold>
                            {' '}
                            ✓ 准备就绪！
                        </Text>
                        <Text color="gray">请重新启动 zen-code 开始使用</Text>
                    </Box>
                </Box>

                {/* Footer */}
                <Box marginTop={1} paddingTop={1} borderTop={false} flexDirection="row" justifyContent="space-between">
                    <Box>
                        <Text color="gray" dimColor>
                            按任意键退出
                        </Text>
                    </Box>
                    <Box>
                        <Text color="green" bold>{`>>> 全部完成`}</Text>
                        <Text color="green" dimColor>
                            {' '}
                            ▌
                        </Text>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};
