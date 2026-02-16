/**
 * Model 面板 - 使用 Tab 系统重构 + TanStack Query
 *
 * 使用 TanStack Query 管理模型列表的加载状态
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { Box, Text } from 'ink';
import { UniversalPanel } from 'ink-pro';
import { SelectItem } from 'ink-pro';
import { PanelConfig } from 'ink-pro';
import { useSettings } from '../context/SettingsContext';
import { useModels } from '../hooks/useModels';
import type { ProviderConfig } from '@codegraph/config';
import type { ModelConfig as HookModelConfig } from '../hooks/useModels';

// 组件内部使用的模型配置
export interface ModelConfig {
    id: string;
    name: string;
}

// Provider 图标映射
const PROVIDER_ICONS: Record<string, string> = {
    openai: '🤖',
    anthropic: '🧠',
    gemini: '✨',
    default: '🔮',
};

// Provider 显示名称映射
const PROVIDER_LABELS: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Gemini',
    default: 'Default',
};

// Provider Tab 类型
interface ProviderTab {
    id: string;
    label: string;
    icon: string;
    config: ProviderConfig;
}

interface ModelPanelProps {
    onClose: () => void;
}

const ModelPanel: React.FC<ModelPanelProps> = ({ onClose }) => {
    const { extraParams, config, updateConfig } = useSettings();
    const [activeTab, setActiveTab] = useState<string>('');

    // 使用 ref 存储最新的 models，避免 dataSource 依赖 models 导致引用变化
    const modelsRef = useRef<ModelConfig[]>([]);

    // 从配置动态生成 provider tabs
    const providerTabs: ProviderTab[] = useMemo(() => {
        if (!config?.providers || config.providers.length === 0) {
            return [];
        }

        return config.providers.map((provider: ProviderConfig) => {
            // 根据 provider type 获取图标和标签
            const type = provider.type || 'default';
            return {
                id: provider.id,
                // 使用 id 比较清楚
                label: provider.id,
                icon: PROVIDER_ICONS[type] || PROVIDER_ICONS.default,
                config: provider,
            };
        });
    }, [config?.providers]);

    // 初始化 activeTab
    useMemo(() => {
        if (providerTabs.length > 0 && !activeTab) {
            // 优先使用当前配置的 provider_id
            const currentProviderTab = providerTabs.find((t) => t.id === extraParams.provider_id);
            setActiveTab(currentProviderTab?.id || providerTabs[0].id);
        }
    }, [providerTabs, extraParams.provider_id, activeTab]);

    // 获取当前选中的 provider
    const activeProviderTab = providerTabs.find((t) => t.id === activeTab);

    const {
        data: hookModels,
        isLoading,
        error,
    } = useModels({
        provider: activeProviderTab?.config || null,
        enabled: !!activeTab,
    });

    // 转换模型数据格式并同步到 ref
    const models: ModelConfig[] = useMemo(() => {
        const convertedModels = (hookModels || []).map((m: HookModelConfig) => ({
            id: m.id,
            name: m.name,
        }));
        modelsRef.current = convertedModels;
        return convertedModels;
    }, [hookModels]);

    // 修复：使用 useCallback 保持 dataSource 引用稳定
    const dataSource = useCallback(async () => {
        return modelsRef.current;
    }, []); // 空依赖，函数引用永远不变

    // 修复：使用 useCallback 保持 renderItem 引用稳定
    const renderItem = useCallback(
        (model: any, index: number, isSelected: boolean) => {
            const isCurrent = model.id === extraParams.provider_id + '-' + model.id;
            return (
                <SelectItem key={index + model.id} isSelected={isSelected} isCurrent={isCurrent}>
                    <Text bold>
                        {index + 1}. {model.id}
                    </Text>
                    <Text dimColor> {model.name !== model.id ? `(${model.name})` : ''}</Text>
                </SelectItem>
            );
        },
        [extraParams.provider_id],
    );

    // 修复：使用 useCallback 保持 isSelected 引用稳定
    const isSelected = useCallback(
        (model: any) => {
            return model.id === extraParams.provider_id + '-' + model.id;
        },
        [extraParams.provider_id],
    );

    // 修复：使用 useCallback 保持 onSelect 引用稳定
    const handleSelectModel = useCallback(
        async (model: any) => {
            await updateConfig({
                provider_id: activeTab,
                model_id: model.id,
            });
            onClose();
        },
        [updateConfig, activeTab, onClose],
    );

    // 修复：使用 useCallback 保持 handleSwitchTab 引用稳定
    const handleSwitchTab = useCallback(
        (direction: 'left' | 'right') => {
            if (providerTabs.length <= 1) return;

            const currentIndex = providerTabs.findIndex((t) => t.id === activeTab);
            const nextIndex =
                direction === 'left'
                    ? (currentIndex - 1 + providerTabs.length) % providerTabs.length
                    : (currentIndex + 1) % providerTabs.length;
            setActiveTab(providerTabs[nextIndex].id);
        },
        [activeTab, providerTabs],
    );

    // 修复：使用 useMemo 缓存 panelConfig，最小化依赖项
    // 只依赖 activeTab 和 activeProviderTab，其他通过 useCallback 保持稳定
    const panelConfig: PanelConfig<ModelConfig> = useMemo(() => {
        const tabLabel = activeProviderTab?.label || '加载中...';
        return {
            // 关键修复：在 id 中包含 activeTab，这样切换 Tab 时 id 会变化，触发 UniversalPanel 重新加载数据
            id: `model-${activeTab}`,
            title: `模型选择 - ${tabLabel}`,
            icon: activeProviderTab?.icon || '🔮',

            // 关键：使用稳定的 dataSource 函数
            dataSource: dataSource,

            // 搜索配置
            searchable: true,
            searchFields: ['id', 'name'],
            searchPlaceholder: '搜索模型...',

            // 渲染配置
            itemHeight: 1,
            visibleCount: 10,

            // 关键：使用稳定的回调函数
            renderItem: renderItem,
            isSelected: isSelected,
            onSelect: handleSelectModel,

            showCount: true,

            // 修复：通过 keyMap 处理左右箭头切换 Tab，避免多个 useInput 冲突
            keyMap: {
                leftArrow: (context) => {
                    handleSwitchTab('left');
                },
                rightArrow: (context) => {
                    handleSwitchTab('right');
                },
            },
        };
    }, [activeTab, activeProviderTab, dataSource, renderItem, isSelected, handleSelectModel, handleSwitchTab]);

    // 如果没有配置任何 provider
    if (providerTabs.length === 0) {
        return (
            <Box flexDirection="column" paddingX={2} paddingY={1}>
                <Text color="yellow">⚠️ 未配置任何 Provider</Text>
                <Text color="gray" dimColor>
                    请先配置 Provider 后再查看模型列表
                </Text>
            </Box>
        );
    }

    const hasApiKey = activeProviderTab?.config.apiKey;

    return (
        <Box flexDirection="column">
            {/* Tab 头 */}
            <Box gap={1} paddingX={1} paddingY={1}>
                {providerTabs.map((tab) => (
                    <Text key={tab.id} bold={tab.id === activeTab} color={tab.id === activeTab ? 'cyan' : 'gray'}>
                        {tab.icon} {tab.label}
                        {tab.id === activeTab && ' [当前]'}
                        {tab.id === activeTab && !hasApiKey && ' (未配置 API Key)'}
                    </Text>
                ))}
            </Box>

            {isLoading ? (
                <Box paddingX={2} paddingY={1}>
                    <Text color="gray">加载模型列表中...</Text>
                </Box>
            ) : error ? (
                <Box paddingX={2} paddingY={1}>
                    <Text color="red">加载失败: {error.message}</Text>
                </Box>
            ) : !hasApiKey ? (
                <Box paddingX={2} paddingY={1}>
                    <Text color="yellow">请先配置 API Key</Text>
                </Box>
            ) : (
                <UniversalPanel config={panelConfig} onClose={onClose} />
            )}
        </Box>
    );
};

export default ModelPanel;
