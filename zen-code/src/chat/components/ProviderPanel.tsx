/**
 * Provider 配置面板 - 管理 Provider
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { useSettings } from '@codegraph/union-client';
import type { ProviderConfig } from '@codegraph/config';
import ProviderForm, { ProviderFormProps } from './forms/ProviderForm';

interface ProviderPanelProps {
    onClose: () => void;
}

// Provider 类型图标映射
const PROVIDER_TYPE_ICONS: Record<string, string> = {
    openai: '🤖',
    anthropic: '🧠',
};

const ProviderPanel: React.FC<ProviderPanelProps> = ({ onClose }) => {
    const { config, updateConfig } = useSettings();

    // 视图状态: 'list' | 'form'
    const [view, setView] = useState<'list' | 'form'>('list');
    const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
    const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [message, setMessage] = useState<string | null>(null);

    // Providers 列表
    const providers = config?.providers || [];

    // 当前选中的 Provider
    const selectedProvider = providers[selectedIndex];

    // 显示消息后自动清除
    React.useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // 进入新增表单
    const goToAddForm = useCallback(() => {
        setFormMode('add');
        setEditingProvider(null);
        setView('form');
        setMessage(null);
    }, []);

    // 进入编辑表单
    const goToEditForm = useCallback(() => {
        if (!selectedProvider) return;
        setFormMode('edit');
        setEditingProvider(selectedProvider);
        setView('form');
        setMessage(null);
    }, [selectedProvider]);

    // 返回列表
    const goToList = useCallback(() => {
        setView('list');
        setEditingProvider(null);
        setMessage(null);
    }, []);

    // 保存 Provider（新增或编辑）
    const handleSaveProvider = useCallback(
        async (provider: ProviderConfig) => {
            const existingProviders = config?.providers || [];
            let newProviders: ProviderConfig[];

            if (formMode === 'add') {
                newProviders = [...existingProviders, provider];
                setMessage(`已添加 Provider: ${provider.id}`);
            } else {
                newProviders = existingProviders.map((p: ProviderConfig) => (p.id === provider.id ? provider : p));
                setMessage(`已更新 Provider: ${provider.id}`);
            }

            await updateConfig({
                providers: newProviders,
            });

            // 新增时选中新 Provider
            if (formMode === 'add') {
                const newIndex = newProviders.findIndex((p) => p.id === provider.id);
                setSelectedIndex(newIndex >= 0 ? newIndex : 0);
            }

            goToList();
        },
        [formMode, config?.providers, updateConfig, goToList],
    );

    // 删除 Provider
    const handleDeleteProvider = useCallback(async () => {
        if (!selectedProvider) return;
        if (providers.length <= 1) {
            setMessage('无法删除最后一个 Provider');
            return;
        }

        const newProviders = providers.filter((p: ProviderConfig) => p.id !== selectedProvider.id);

        await updateConfig({
            providers: newProviders,
        });

        const newIndex = Math.min(selectedIndex, newProviders.length - 1);
        setSelectedIndex(newIndex >= 0 ? newIndex : 0);
        setMessage(`已删除 Provider: ${selectedProvider.id}`);
    }, [selectedProvider, providers, selectedIndex, updateConfig]);

    // 键盘快捷键
    useInput(
        (input, key) => {
            if (view === 'form') {
                if (key.escape) {
                    goToList();
                }
                return;
            }

            // 列表视图快捷键
            if (key.upArrow) {
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : providers.length - 1));
            } else if (key.downArrow) {
                setSelectedIndex((prev) => (prev < providers.length - 1 ? prev + 1 : 0));
            } else if (input === 'n' || input === 'N') {
                goToAddForm();
            } else if ((input === 'e' || input === 'E') && selectedProvider) {
                goToEditForm();
            } else if ((input === 'd' || input === 'D') && selectedProvider) {
                handleDeleteProvider();
            } else if (key.escape) {
                onClose();
            }
        },
        { isActive: true },
    );

    // 渲染列表视图
    const renderListView = useMemo(() => {
        if (providers.length === 0) {
            return (
                <Box paddingX={2} paddingY={1}>
                    <Text color="yellow">未配置任何 Provider</Text>
                </Box>
            );
        }

        return (
            <Box flexDirection="column" paddingX={2}>
                {providers.map((provider: ProviderConfig, index: number) => {
                    const hasApiKey = !!provider.apiKey;
                    const statusColor = hasApiKey ? 'green' : 'yellow';

                    return (
                        <Box key={provider.id} marginBottom={0}>
                            <Text color={index === selectedIndex ? 'cyan' : 'gray'} bold={index === selectedIndex}>
                                {index === selectedIndex ? '>' : ' '}
                            </Text>
                            <Text
                                marginLeft={1}
                                bold={index === selectedIndex}
                                color={index === selectedIndex ? 'cyan' : undefined}
                            >
                                {provider.id}
                            </Text>
                            <Text color="gray" dimColor={index !== selectedIndex}>
                                {' '}
                                {PROVIDER_TYPE_ICONS[provider.type] || '🔌'} {provider.name}
                            </Text>
                            <Text color={statusColor} dimColor={index !== selectedIndex}>
                                {' '}
                                [{hasApiKey ? '已配置' : '未配置'}]
                            </Text>
                        </Box>
                    );
                })}

                <Box marginTop={1}>
                    <Text color="gray" dimColor>
                        <Text color="cyan">↑↓</Text> 导航 <Text color="cyan">n</Text> 新增 <Text color="cyan">e</Text>{' '}
                        编辑 <Text color="cyan">d</Text> 删除 <Text color="cyan">Esc</Text> 关闭
                    </Text>
                </Box>
            </Box>
        );
    }, [providers, selectedIndex]);

    // 渲染当前视图
    return (
        <Box flexDirection="column">
            <Box paddingX={2} paddingY={0}>
                <Text bold color="cyan">
                    Providers
                </Text>
            </Box>

            {view === 'list' ? (
                renderListView
            ) : (
                <ProviderForm
                    mode={formMode}
                    provider={editingProvider || undefined}
                    onCancel={goToList}
                    onSave={handleSaveProvider}
                />
            )}

            {/* 消息提示 */}
            {message && (
                <Box paddingX={2} paddingY={0}>
                    <Text color="green">{message}</Text>
                </Box>
            )}
        </Box>
    );
};

export default ProviderPanel;
