/**
 * Model 面板 - 使用 Tab 系统重构
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { UniversalPanel } from 'ink-pro';
import { SelectItem } from 'ink-pro';
import { PanelConfig } from 'ink-pro';
import { useSettings } from '@codegraph/union-client';
import type { ProviderConfig } from '@codegraph/config';

// 简化的模型接口（provider 字段已不再需要）
export interface ModelConfig {
    id: string;
    name: string;
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

    const data: {
        data: { id: string }[];
    } = await response.json();
    return data.data
        .map((model) => ({
            id: model.id,
            name: model.id,
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
    return data.data.map((model: { id: string; display_name?: string }) => ({
        id: model.id,
        name: model.display_name || model.id,
    }));
}

interface ModelPanelProps {
    onClose: () => void;
}

const ModelPanel: React.FC<ModelPanelProps> = ({ onClose }) => {
    const { extraParams, config, updateConfig } = useSettings();
    const [activeTab, setActiveTab] = useState<string>('');
    const [models, setModels] = useState<ModelConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 使用 ref 存储最新的 models，避免 dataSource 依赖 models 导致引用变化
    const modelsRef = useRef<ModelConfig[]>([]);
    // 同步 models 到 ref
    modelsRef.current = models;

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
                // 注意：这里不再调用 setModels([])，避免触发额外的渲染循环
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

    // 修复：使用 useCallback 保持 dataSource 引用稳定
    // 使用空依赖数组，确保函数引用不会变化
    // 内部通过 modelsRef 获取最新的 models 值
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

    // 修复：使用 useMemo 缓存 panelConfig，避免每次渲染创建新对象
    const panelConfig: PanelConfig<ModelConfig> = useMemo(() => {
        const activeProviderTab = providerTabs.find((t) => t.id === activeTab);
        return {
            id: 'model',
            title: `模型选择 - ${activeProviderTab?.label || '加载中...'}`,
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
        };
    }, [activeTab, providerTabs, dataSource, renderItem, isSelected, handleSelectModel]);

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
            <Box gap={1} paddingX={1} paddingY={1}>
                {providerTabs.map((tab) => (
                    <Text key={tab.id} bold={tab.id === activeTab} color={tab.id === activeTab ? 'cyan' : 'gray'}>
                        {tab.icon} {tab.label}
                        {tab.id === activeTab && ' [当前]'}
                        {tab.id === activeTab && !hasApiKey && ' (未配置 API Key)'}
                    </Text>
                ))}
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
