/**
 * Model 面板 - 使用统一面板系统重构
 */

import React from 'react';
import { Spacer, Text } from 'ink';
import { UniversalPanel } from './Panel/UniversalPanel';
import { SelectItem } from './Panel/SelectItem';
import { PanelConfig } from './Panel/types';
import { useSettings } from '../context/SettingsContext';
import type { ModelConfig } from '../../../../agents/code/utils/get_allowed_models';

interface ModelPanelProps {
    onClose: () => void;
}

const ModelPanel: React.FC<ModelPanelProps> = ({ onClose }) => {
    const { AVAILABLE_MODELS, extraParams, updateConfig } = useSettings();

    const panelConfig: PanelConfig<ModelConfig> = {
        id: 'model',
        title: '模型选择',
        icon: '🤖',

        dataSource: () => AVAILABLE_MODELS,

        // 搜索配置
        searchable: true,
        searchFields: ['id', 'provider'],
        searchPlaceholder: '搜索模型...',

        // 过滤配置
        filterable: true,
        filters: [
            {
                id: 'openai',
                label: 'OpenAI',
                predicate: (model: any) => model.provider === 'openai',
            },
            {
                id: 'anthropic',
                label: 'Anthropic',
                predicate: (model: any) => model.provider === 'anthropic',
            },
            {
                id: 'other',
                label: '其他',
                predicate: (model: any) => !model.provider,
            },
        ],
        defaultFilter: 'all',

        // 渲染配置
        itemHeight: 2, // 每个模型占 2 行
        visibleCount: 20,

        renderItem: (model: any, index, isSelected) => {
            const isCurrent = model.id === extraParams.main_model;
            return (
                <SelectItem key={model.id} isSelected={isSelected} isCurrent={isCurrent}>
                    <Text bold>{model.id}</Text>
                    <Spacer></Spacer>
                    <Text dimColor>{model.provider}</Text>
                </SelectItem>
            );
        },

        isSelected: (model: any) => model.id === extraParams.main_model,

        onSelect: async (model: any) => {
            if (model.provider) {
                await updateConfig({
                    main_model: model.id,
                    model_provider: model.provider,
                });
            } else {
                await updateConfig({ main_model: model.id });
            }
            onClose();
        },

        showCount: true,

        statusInfo: (items) => {
            const current = items.find((m: any) => m.id === extraParams.main_model);
            return current ? (
                <Text color="gray" dimColor>
                    当前模型: <Text color="green">{current.id}</Text>
                </Text>
            ) : null;
        },
    };

    return <UniversalPanel config={panelConfig} onClose={onClose} />;
};

export default ModelPanel;
