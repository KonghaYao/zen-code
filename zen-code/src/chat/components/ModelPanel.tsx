/**
 * Model 面板 - 使用 Tab 系统重构
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { UniversalPanel } from 'ink-pro';
import { SelectItem } from 'ink-pro';
import { PanelConfig } from 'ink-pro';
import { useSettings } from '@codegraph/union-client';
import type { ModelConfig } from '@codegraph/agent/src/utils/get_allowed_models';
import type { ProviderConfig } from '@codegraph/config';

interface ModelPanelProps {
    onClose: () => void;
}

// Provider 图标映射
const PROVIDER_ICONS: Record<string, string> = {
    openai: '🤖',
    anthropic: '🧠',
    default: '🔮',
};

// Provider 显示名称映射
const PROVIDER_LABELS: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    default: 'Default',
};

// Provider Tab 类型
interface ProviderTab {
    id: string;
    label: string;
    icon: string;
    config: ProviderConfig;
}

// 直接获取模型列表的函数
async function getOpenAIModels(apiKey: string, baseUrl: string): Promise<ModelConfig[]> {
    const response = await fetch(`${baseUrl}/models`, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data
        .map((model: any) => ({
            id: model.id,
            name: model.id,
            provider: 'openai' as const,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
}

async function getAnthropicModels(apiKey: string, baseUrl: string): Promise<ModelConfig[]> {
    // 注意：Anthropic API 可能需要使用 SDK，这里简化处理
    const response = await fetch(`${baseUrl}/v1/models`, {
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
    });

    if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((model: any) => ({
        id: model.id,
        name: model.display_name || model.id,
        provider: 'anthropic' as const,
    }));
}

const ModelPanel: React.FC<ModelPanelProps> = ({ onClose }) => {
    const { extraParams, config, updateConfig } = useSettings();
    const [activeTab, setActiveTab] = useState<string>('');
    const [models, setModels] = useState<ModelConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 从配置动态生成 provider tabs
    const providerTabs: ProviderTab[] = useMemo(() => {
        if (!config?.providers || config.providers.length === 0) {
            return [];
        }

        return config.providers.map((provider: ProviderConfig) => ({
            id: provider.id,
            label: PROVIDER_LABELS[provider.id] || provider.id,
            icon: PROVIDER_ICONS[provider.id] || PROVIDER_ICONS.default,
            config: provider,
        }));
    }, [config?.providers]);

    // 初始化 activeTab
    useEffect(() => {
        if (providerTabs.length > 0 && !activeTab) {
            // 优先使用当前配置的 provider_id
            const currentProviderTab = providerTabs.find((t) => t.id === extraParams.provider_id);
            setActiveTab(currentProviderTab?.id || providerTabs[0].id);
        }
    }, [providerTabs, extraParams.provider_id, activeTab]);

    // 加载当前 provider 的模型
    useEffect(() => {
        const loadModels = async () => {
            if (!activeTab) return;

            const providerTab = providerTabs.find((t) => t.id === activeTab);
            if (!providerTab) return;

            setLoading(true);
            setError(null);

            try {
                let providerModels: ModelConfig[] = [];

                if (providerTab.config.type === 'openai') {
                    if (providerTab.config.apiKey && providerTab.config.baseUrl) {
                        providerModels = await getOpenAIModels(providerTab.config.apiKey, providerTab.config.baseUrl);
                    }
                } else if (providerTab.config.type === 'anthropic') {
                    if (providerTab.config.apiKey && providerTab.config.baseUrl) {
                        providerModels = await getAnthropicModels(
                            providerTab.config.apiKey,
                            providerTab.config.baseUrl,
                        );
                    }
                }

                setModels(providerModels);
            } catch (err) {
                console.error(`Failed to load ${activeTab} models:`, err);
                setError(err instanceof Error ? err.message : String(err));
                setModels([]);
            } finally {
                setLoading(false);
            }
        };

        loadModels();
    }, [activeTab, providerTabs]);

    // 左右箭头切换 Tab
    useInput((input, key) => {
        if (providerTabs.length <= 1) return;

        if (key.leftArrow) {
            const currentIndex = providerTabs.findIndex((t) => t.id === activeTab);
            const nextIndex = (currentIndex - 1 + providerTabs.length) % providerTabs.length;
            setActiveTab(providerTabs[nextIndex].id);
        } else if (key.rightArrow) {
            const currentIndex = providerTabs.findIndex((t) => t.id === activeTab);
            const nextIndex = (currentIndex + 1) % providerTabs.length;
            setActiveTab(providerTabs[nextIndex].id);
        }
    });

    // 修复：使用 useCallback 保持函数引用稳定
    const dataSource = useCallback(async () => {
        return models;
    }, [models]);

    // 修复：使用 useCallback 保持 renderItem 引用稳定
    const renderItem = useCallback(
        (model: any, index: number, isSelected: boolean) => {
            const isCurrent = model.id === extraParams.model_id && model.provider === extraParams.provider_id;
            return (
                <SelectItem key={model.id} isSelected={isSelected} isCurrent={isCurrent}>
                    <Text bold>
                        {index + 1}. {model.id}
                    </Text>
                    <Text dimColor> {model.name !== model.id ? `(${model.name})` : ''}</Text>
                </SelectItem>
            );
        },
        [extraParams.model_id, extraParams.provider_id],
    );

    // 修复：使用 useCallback 保持 isSelected 引用稳定
    const isSelected = useCallback(
        (model: any) => {
            return model.id === extraParams.model_id && model.provider === extraParams.provider_id;
        },
        [extraParams.model_id, extraParams.provider_id],
    );

    // 修复：使用 useCallback 保持 onSelect 引用稳定
    const handleSelectModel = useCallback(
        async (model: any) => {
            await updateConfig({
                provider_id: activeTab,
                provider_type: model.provider,
                model_id: model.id,
            });
            onClose();
        },
        [updateConfig, activeTab, onClose],
    );

    // 修复：使用 useCallback 保持 statusInfo 引用稳定
    const statusInfo = useCallback(
        (items: any[]) => {
            const current = items.find(
                (m: any) => m.id === extraParams.model_id && m.provider === extraParams.provider_id,
            );
            return current ? (
                <Text color="gray" dimColor>
                    当前模型: <Text color="green">{current.id}</Text>
                </Text>
            ) : null;
        },
        [extraParams.model_id, extraParams.provider_id],
    );

    // 修复：使用 useMemo 缓存 panelConfig，避免每次渲染创建新对象
    const panelConfig: PanelConfig<ModelConfig> = useMemo(() => {
        const activeProviderTab = providerTabs.find((t) => t.id === activeTab);
        return {
            id: 'model',
            title: `模型选择 - ${activeProviderTab?.label || '加载中...'}`,
            icon: activeProviderTab?.icon || '🔮',

            dataSource: dataSource,

            // 搜索配置
            searchable: true,
            searchFields: ['id', 'name'],
            searchPlaceholder: '搜索模型...',

            // 渲染配置
            itemHeight: 1,
            visibleCount: 10,

            renderItem: renderItem,

            isSelected: isSelected,

            onSelect: handleSelectModel,

            showCount: true,

            statusInfo: statusInfo,
        };
    }, [activeTab, providerTabs, dataSource, renderItem, isSelected, handleSelectModel, statusInfo]);

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

    const activeProviderTab = providerTabs.find((t) => t.id === activeTab);
    const hasApiKey = activeProviderTab?.config.apiKey;

    return (
        <Box flexDirection="column">
            {/* Tab 头 */}
            <Box gap={4} paddingX={1} paddingY={1} borderStyle="single" borderColor="gray">
                {providerTabs.map((tab) => (
                    <Text key={tab.id} bold={tab.id === activeTab} color={tab.id === activeTab ? 'cyan' : 'gray'}>
                        {tab.icon} {tab.label}
                        {tab.id === activeTab && ' [当前]'}
                        {tab.id === activeTab && !hasApiKey && ' (未配置 API Key)'}
                    </Text>
                ))}
            </Box>

            {/* 快捷键提示 */}
            <Box gap={2} paddingX={1} paddingY={0}>
                <Text color="gray" dimColor>
                    <Text color="cyan" bold>
                        ←→
                    </Text>
                    :切换 Provider
                    <Text color="cyan" bold>
                        ↑↓
                    </Text>
                    :导航
                </Text>
            </Box>

            {loading ? (
                <Box paddingX={2} paddingY={1}>
                    <Text color="gray">加载模型列表中...</Text>
                </Box>
            ) : error ? (
                <Box paddingX={2} paddingY={1}>
                    <Text color="red">加载失败: {error}</Text>
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
