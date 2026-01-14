import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import { useSettings } from '../context/SettingsContext';
import type { ModelConfig } from '../../../../agents/code/utils/get_allowed_models';

interface ModelPanelProps {
    onClose: () => void;
}

const ModelPanel: React.FC<ModelPanelProps> = ({ onClose }) => {
    const { isFocused } = useFocus({ autoFocus: true });
    const { AVAILABLE_MODELS, extraParams, updateConfig } = useSettings();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [switchingModel, setSwitchingModel] = useState<string | null>(null);

    // 找到当前模型的索引
    const currentModelIndex = AVAILABLE_MODELS.findIndex((m) => m.id === extraParams.main_model);

    useEffect(() => {
        // 初始化时选中当前模型
        if (currentModelIndex !== -1) {
            setSelectedIndex(currentModelIndex);
        }
    }, [currentModelIndex]);

    useInput((input, key) => {
        if (key.escape || input === 'q' || input === 'c') {
            onClose();
            return;
        }

        if (key.return) {
            // 切换到选中的模型
            const selectedModel = AVAILABLE_MODELS[selectedIndex];
            if (selectedModel && selectedModel.id !== extraParams.main_model) {
                handleModelSwitch(selectedModel);
            }
            return;
        }

        // 上下键选择
        if (key.upArrow) {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : AVAILABLE_MODELS.length - 1));
        } else if (key.downArrow) {
            setSelectedIndex((prev) => (prev < AVAILABLE_MODELS.length - 1 ? prev + 1 : 0));
        }
    });

    const handleModelSwitch = async (model: ModelConfig) => {
        setSwitchingModel(model.id);
        try {
            if (model.provider) {
                await updateConfig({ main_model: model.id, model_provider: model.provider });
            } else {
                await updateConfig({ main_model: model.id });
            }
            // 切换成功后自动关闭面板
            setTimeout(() => {
                onClose();
            }, 500);
        } catch (error) {
            console.error('模型切换失败:', error);
            setSwitchingModel(null);
        }
    };

    if (AVAILABLE_MODELS.length === 0) {
        return (
            <Box paddingX={1} paddingY={1}>
                <Text color="red">没有可用的模型</Text>
            </Box>
        );
    }

    const renderModelList = () => {
        return AVAILABLE_MODELS.map((model, index) => {
            const isSelected = index === selectedIndex;
            const isCurrent = model.id === extraParams.main_model;
            const isSwitching = switchingModel === model.id;

            // 图标
            let icon = '  ';
            if (isCurrent && !isSwitching) icon = '✓ ';
            if (isSwitching) icon = '⟳ ';
            if (isSelected) icon = '▶ ';

            // 颜色
            let color = 'gray';
            if (isSelected) color = 'cyan';
            if (isCurrent && !isSwitching) color = 'green';
            if (isSwitching) color = 'yellow';

            // 背景高亮
            const bgColor = isSelected ? 'bgBlack' : '';

            return (
                <Box key={model.id} paddingX={1} paddingY={0}>
                    <Text color={isSelected ? 'cyan' : 'gray'}>
                        {icon}
                    </Text>
                    <Text bold={isSelected} color={color}>
                        {model.id}
                    </Text>
                    {model.provider && (
                        <Text color="gray" dimColor>
                            {' '}({model.provider})
                        </Text>
                    )}
                    {isCurrent && !isSwitching && (
                        <Text color="green"> 当前</Text>
                    )}
                    {isSwitching && (
                        <Text color="yellow"> 切换中...</Text>
                    )}
                </Box>
            );
        });
    };

    return (
        <Box flexDirection="column" paddingX={1} paddingY={0} flexGrow={1}>
            <Box paddingBottom={1} justifyContent="space-between">
                <Text color="yellow" bold>
                    🤖 模型选择
                </Text>
                <Text color="gray">
                    <Text color="cyan" bold>
                        ↑↓
                    </Text>
                    :选择{' '}
                    <Text color="green" bold>
                        Enter
                    </Text>
                    :切换{' '}
                    <Text color="red" bold>
                        q
                    </Text>
                    :关闭
                </Text>
            </Box>

            <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
                {renderModelList()}
            </Box>

            <Box marginTop={1} paddingX={1}>
                <Text color="gray" dimColor>
                    当前模型: <Text color="green">{extraParams.main_model}</Text>
                </Text>
            </Box>
        </Box>
    );
};

export default ModelPanel;
