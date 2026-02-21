/**
 * Provider 配置面板 - 管理 Provider
 *
 * 使用 TanStack Query 优化配置更新
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Box, Spacer, Text } from 'ink';
import { useInput } from 'ink-pro';
import { useSettings } from '../context/SettingsContext';
import type { ProviderConfig } from '@codegraph/config';
import ProviderForm from './forms/ProviderForm';

interface ProviderPanelProps {
    onClose: () => void;
}

const ProviderPanel: React.FC<ProviderPanelProps> = ({ onClose }) => {
    const { config, updateConfig } = useSettings();

    // 视图状态: 'list' | 'form'
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [message, setMessage] = useState<string | null>(null);

    // 使用 ref 稳定状态引用
    const viewRef = useRef(view);
    const selectedIndexRef = useRef(selectedIndex);
    const providersRef = useRef<ProviderConfig[]>([]);
    const isAddModeRef = useRef(true); // true = add, false = edit

    // 同步 ref
    useEffect(() => {
        viewRef.current = view;
    }, [view]);

    useEffect(() => {
        selectedIndexRef.current = selectedIndex;
    }, [selectedIndex]);

    // Providers 列表（直接从 config 获取）
    const providers = config?.providers || [];

    // 同步 providers 到 ref
    useEffect(() => {
        providersRef.current = providers;
    }, [providers]);

    // 显示消息后自动清除
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [message]);

    // 进入新增表单
    const goToAddForm = useCallback(() => {
        isAddModeRef.current = true;
        setEditingProvider(null);
        setView('form');
        setMessage(null);
    }, []);

    // 进入编辑表单
    const goToEditForm = useCallback(() => {
        const currentProviders = providersRef.current;
        const currentIndex = selectedIndexRef.current;
        const provider = currentProviders[currentIndex];
        if (!provider) return;
        isAddModeRef.current = false;
        setEditingProvider(provider);
        setView('form');
        setMessage(null);
    }, []);

    // 返回列表
    const goToList = useCallback(() => {
        setView('list');
        setEditingProvider(null);
        setMessage(null);
    }, []);

    // 保存 Provider（新增或编辑）- 使用 ref 稳定引用
    const handleSaveProvider = useCallback(
        async (provider: ProviderConfig) => {
            const currentProviders = providersRef.current;
            const isAddMode = isAddModeRef.current;

            const newProviders = isAddMode
                ? [...currentProviders, provider]
                : currentProviders.map((p) => (p.id === provider.id ? provider : p));

            await updateConfig({
                providers: newProviders,
            });

            setMessage(isAddMode ? `已添加 Provider: ${provider.id}` : `已更新 Provider: ${provider.id}`);

            // 新增时选中新 Provider
            if (isAddMode) {
                const newIndex = newProviders.findIndex((p) => p.id === provider.id);
                setSelectedIndex(newIndex >= 0 ? newIndex : 0);
            }

            setView('list');
            setEditingProvider(null);
            setMessage(null);
        },
        [updateConfig],
    );

    // 删除 Provider
    const handleDeleteProvider = useCallback(async () => {
        const currentProviders = providersRef.current;
        const currentIndex = selectedIndexRef.current;
        const provider = currentProviders[currentIndex];

        if (!provider) return;
        if (currentProviders.length <= 1) {
            setMessage('无法删除最后一个 Provider');
            return;
        }

        const newProviders = currentProviders.filter((p: ProviderConfig) => p.id !== provider.id);

        await updateConfig({
            providers: newProviders,
        });

        const newIndex = Math.min(currentIndex, newProviders.length - 1);
        setSelectedIndex(newIndex >= 0 ? newIndex : 0);
        setMessage(`已删除 Provider: ${provider.id}`);
    }, [updateConfig]);

    // 使用 ref 存储回调
    const goToAddFormRef = useRef(goToAddForm);
    const goToEditFormRef = useRef(goToEditForm);
    const handleDeleteProviderRef = useRef(handleDeleteProvider);
    const goToListRef = useRef(goToList);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        goToAddFormRef.current = goToAddForm;
    }, [goToAddForm]);

    useEffect(() => {
        goToEditFormRef.current = goToEditForm;
    }, [goToEditForm]);

    useEffect(() => {
        handleDeleteProviderRef.current = handleDeleteProvider;
    }, [handleDeleteProvider]);

    useEffect(() => {
        goToListRef.current = goToList;
    }, [goToList]);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // 键盘快捷键 - 使用稳定的 handler
    useInput(
        (input, key) => {
            const currentView = viewRef.current;
            const currentProviders = providersRef.current;
            const currentSelectedIndex = selectedIndexRef.current;

            if (currentView === 'form') {
                if (key.escape) {
                    goToListRef.current();
                }
                return;
            }

            // 列表视图快捷键
            if (key.upArrow) {
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : currentProviders.length - 1));
            } else if (key.downArrow) {
                setSelectedIndex((prev) => (prev < currentProviders.length - 1 ? prev + 1 : 0));
            } else if (input === 'n' || input === 'N') {
                goToAddFormRef.current();
            } else if ((input === 'e' || input === 'E' || key.return) && currentProviders[currentSelectedIndex]) {
                goToEditFormRef.current();
            } else if ((input === 'd' || input === 'D') && currentProviders[currentSelectedIndex]) {
                handleDeleteProviderRef.current();
            } else if (key.escape) {
                onCloseRef.current();
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
            <Box flexDirection="column" paddingX={2} gap={1}>
                {providers.map((provider: ProviderConfig, index: number) => {
                    const hasApiKey = !!provider.apiKey;
                    const statusColor = hasApiKey ? 'green' : 'yellow';

                    return (
                        <Box key={provider.id} marginBottom={0} gap={1}>
                            <Text color={index === selectedIndex ? 'cyan' : 'gray'} bold={index === selectedIndex}>
                                {index === selectedIndex ? '>' : ' '}
                            </Text>
                            <Text bold={index === selectedIndex} color={index === selectedIndex ? 'cyan' : undefined}>
                                {provider.id}
                            </Text>
                            <Spacer></Spacer>
                            <Text color="gray" dimColor={index !== selectedIndex}>
                                {' '}
                                {provider.type}
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
                        <Text color="cyan">↑↓</Text> 导航 <Text color="cyan">n</Text> 新增 <Text color="cyan">d</Text>{' '}
                        删除 <Text color="cyan">Esc</Text> 关闭
                    </Text>
                </Box>
            </Box>
        );
    }, [providers, selectedIndex]);

    // 渲染当前视图
    return (
        <Box flexDirection="column">
            <Box paddingX={2} paddingY={1}>
                <Text bold color="cyan">
                    Providers
                </Text>
            </Box>

            {view === 'list' ? (
                renderListView
            ) : (
                <ProviderForm provider={editingProvider || undefined} onCancel={goToList} onSave={handleSaveProvider} />
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
