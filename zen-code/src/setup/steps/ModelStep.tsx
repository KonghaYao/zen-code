import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { MultiSelectPro, MultiSelectOption } from 'ink-pro';
import { AIProvider } from '../types';
import { ModelConfig } from '@codegraph/agent/src/utils/get_allowed_models';

interface ModelStepProps {
    provider: AIProvider;
    models: ModelConfig[];
    selectedModel: string;
    onSelect: (model: string) => void;
    onRefresh: () => void;
    onNext: () => void;
    onBack: () => void;
    onExit: () => void;
    isLoading: boolean;
    error?: string | null;
}

export const ModelStep: React.FC<ModelStepProps> = ({
    provider,
    models,
    selectedModel,
    onSelect,
    onRefresh,
    onNext,
    onBack,
    onExit,
    isLoading,
    error,
}) => {
    // 转换为 MultiSelect 格式
    const multiSelectOptions: MultiSelectOption[] = models.map((model) => ({
        label: model.name,
        value: model.id,
    }));

    // 当前选中的值
    const currentValues = selectedModel ? [selectedModel] : [];

    const handleSubmit = useCallback(
        (values: string[]) => {
            if (values.length > 0) {
                onSelect(values[0]);
                onNext();
            }
        },
        [onSelect, onNext],
    );

    // 处理 R 键刷新和 ESC 返回
    useInput((input, key) => {
        if ((input === 'r' || input === 'R') && !isLoading) {
            onRefresh();
        }
        if (key.escape) {
            onBack();
        }
    });

    return (
        <Box flexDirection="column" flexGrow={1} justifyContent="center" paddingX={2}>
            <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginBottom={1}>
                {/* Header */}
                <Box flexDirection="row" justifyContent="space-between" borderBottom={false}>
                    <Text color="cyan" bold>
                        选择模型
                    </Text>
                    <Text color="gray">[4/4]</Text>
                </Box>

                {/* Main Content */}
                <Box flexDirection="column" marginTop={1}>
                    <Box marginBottom={1}>
                        <Text color="blue">提供商 ::</Text>
                        <Text color="white">{provider.toUpperCase()}</Text>
                    </Box>

                    {isLoading && models.length === 0 && (
                        <Box marginBottom={1}>
                            <Text>
                                <Spinner type="dots" /> 检测可用模型中...
                            </Text>
                        </Box>
                    )}

                    {!isLoading && models.length === 0 && (
                        <Box marginBottom={1}>
                            <Text color="yellow">未找到可用模型，请按 R 刷新</Text>
                        </Box>
                    )}

                    {!isLoading && models.length > 0 && (
                        <Box marginBottom={1}>
                            <Text color="gray">选择您偏好的模型：</Text>
                        </Box>
                    )}

                    {!isLoading && models.length > 0 && (
                        <MultiSelectPro
                            options={multiSelectOptions}
                            values={currentValues}
                            onChange={(values) => {
                                if (values.length > 0) {
                                    onSelect(values[0]);
                                }
                            }}
                            onSubmit={handleSubmit}
                            singleSelect={true}
                            autoFocus={true}
                        />
                    )}

                    {error && (
                        <Box marginTop={1}>
                            <Text color="red">✗ {error}</Text>
                        </Box>
                    )}
                </Box>

                {/* Footer */}
                <Box marginTop={1} paddingTop={1} borderTop={false} flexDirection="row" justifyContent="space-between">
                    <Box>
                        <Text color="gray" dimColor>
                            ↑/↓ 导航 | Enter 确认 | R 刷新 | Esc 返回
                        </Text>
                    </Box>
                    <Box>
                        <Text color="cyan" bold>{`>>> 选择模型`}</Text>
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
