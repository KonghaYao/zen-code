/**
 * SetupWizard - 首次启动配置向导
 *
 * 当配置无效时（无配置文件或配置不正确），引导用户完成：
 * 1. Provider 配置（添加/编辑 Provider）
 * 2. Model 选择（从 Provider 获取模型列表）
 * 3. 完成
 *
 * 内存泄漏修复：
 * - 使用 useSafeTimeout 处理消息自动清除
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink-pro';
import { useSettings } from '../../context/SettingsContext';
import { useModels } from '../../hooks/useModels';
import { useTimeout } from 'usehooks-ts';
import type { ProviderConfig } from '@codegraph/config';
import type { ConfigValidationResult } from '../../utils/configValidation';
import ProviderForm from '../forms/ProviderForm';

type SetupStep = 'welcome' | 'provider' | 'model' | 'complete';

interface SetupWizardProps {
    validation: ConfigValidationResult;
    onComplete: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ validation, onComplete }) => {
    const { config, updateConfig } = useSettings();
    const [step, setStep] = useState<SetupStep>('welcome');
    const [showProviderForm, setShowProviderForm] = useState(false);
    const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [message, setMessage] = useState<string | null>(null);

    // 使用 ref 稳定状态引用
    const isAddModeRef = useRef(true);
    const providersRef = useRef<ProviderConfig[]>([]);
    const selectedIndexRef = useRef(selectedIndex);

    // 获取 providers 列表
    const providers = config?.providers || [];

    // 同步 ref
    useEffect(() => {
        providersRef.current = providers;
    }, [providers]);

    useEffect(() => {
        selectedIndexRef.current = selectedIndex;
    }, [selectedIndex]);

    const selectedProvider = providers[selectedIndex];

    // 内存泄漏修复：使用安全的 timeout hook 处理消息自动清除
    const clearMessage = useCallback(() => setMessage(null), []);
    useTimeout(clearMessage, message ? 3000 : null);

    // 进入新增表单
    const goToAddForm = useCallback(() => {
        isAddModeRef.current = true;
        setEditingProvider(null);
        setShowProviderForm(true);
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
        setShowProviderForm(true);
        setMessage(null);
    }, []);

    // 返回列表
    const closeForm = useCallback(() => {
        setShowProviderForm(false);
        setEditingProvider(null);
        setMessage(null);
    }, []);

    // 保存 Provider
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

            if (isAddMode) {
                const newIndex = newProviders.findIndex((p) => p.id === provider.id);
                setSelectedIndex(newIndex >= 0 ? newIndex : 0);
            }

            closeForm();
        },
        [updateConfig, closeForm],
    );

    // 进入 Model 选择步骤
    const goToModelSelection = useCallback(() => {
        if (!selectedProvider || !selectedProvider.apiKey) {
            setMessage('请先配置 Provider 的 API Key');
            return;
        }

        // 更新当前选中的 provider_id
        updateConfig({
            provider_id: selectedProvider.id,
            provider_type: selectedProvider.type,
        }).then(() => {
            setStep('model');
        });
    }, [selectedProvider, updateConfig]);

    // 键盘处理 - Welcome 步骤
    // 只要 step 为 'welcome' 就激活，不依赖 validation
    useInput(
        (input, key) => {
            if (key.return || input === ' ') {
                setStep('provider');
            }
        },
        { isActive: step === 'welcome' },
    );

    // 键盘处理 - Provider 步骤（列表模式）
    // 只要 step 为 'provider' 且不在表单编辑模式就激活
    useInput(
        (input, key) => {
            if (showProviderForm) return;

            if (key.upArrow) {
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : providers.length - 1));
            } else if (key.downArrow) {
                setSelectedIndex((prev) => (prev < providers.length - 1 ? prev + 1 : 0));
            } else if (input === 'n' || input === 'N') {
                goToAddForm();
            } else if ((input === 'e' || input === 'E' || key.return) && selectedProvider) {
                goToEditForm();
            } else if (input === 's' || input === 'S') {
                goToModelSelection();
            }
        },
        { isActive: step === 'provider' },
    );

    // 渲染欢迎页面
    if (step === 'welcome') {
        return (
            <Box flexDirection="column" paddingX={2} paddingY={1} width="100%">
                <Box marginBottom={1}>
                    <Text bold color="cyan">
                        欢迎使用 Zen Code
                    </Text>
                </Box>
                <Box marginBottom={1}>
                    <Text color="yellow">{validation.reason || '需要进行初始配置'}</Text>
                </Box>
                <Box flexDirection="column" marginBottom={1}>
                    <Text dimColor>接下来将引导你完成：</Text>
                    <Text dimColor> 1. 配置 Provider（API 服务提供商）</Text>
                    <Text dimColor> 2. 选择 Model（AI 模型）</Text>
                </Box>
                <Box>
                    <Text color="green" bold>
                        按 Enter 开始配置
                    </Text>
                </Box>
            </Box>
        );
    }

    // 渲染 Provider 配置页面
    if (step === 'provider') {
        return (
            <Box flexDirection="column" width="100%">
                <Box paddingX={2} paddingY={1}>
                    <Text bold color="cyan">
                        步骤 1/2: Provider 配置
                    </Text>
                </Box>

                {showProviderForm ? (
                    <ProviderForm
                        provider={editingProvider || undefined}
                        onCancel={closeForm}
                        onSave={handleSaveProvider}
                    />
                ) : (
                    <>
                        <Box flexDirection="column" paddingX={2} gap={1}>
                            {providers.length === 0 ? (
                                <Box paddingY={1}>
                                    <Text color="yellow">未配置任何 Provider，请按 'n' 新增</Text>
                                </Box>
                            ) : (
                                providers.map((provider: ProviderConfig, index: number) => {
                                    const hasApiKey = !!provider.apiKey;
                                    const statusColor = hasApiKey ? 'green' : 'yellow';

                                    return (
                                        <Box key={provider.id} marginBottom={0} gap={1}>
                                            <Text
                                                color={index === selectedIndex ? 'cyan' : 'gray'}
                                                bold={index === selectedIndex}
                                            >
                                                {index === selectedIndex ? '>' : ' '}
                                            </Text>
                                            <Text
                                                bold={index === selectedIndex}
                                                color={index === selectedIndex ? 'cyan' : undefined}
                                            >
                                                {provider.id}
                                            </Text>
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
                                })
                            )}

                            <Box marginTop={1}>
                                <Text color="gray" dimColor>
                                    <Text color="cyan">↑↓</Text> 导航 <Text color="cyan">n</Text> 新增{' '}
                                    <Text color="cyan">e/Enter</Text> 编辑{' '}
                                </Text>
                                {providers.some((p) => p.apiKey) && (
                                    <Text>
                                        <Text color="green">s</Text> 下一步
                                    </Text>
                                )}
                            </Box>
                        </Box>
                    </>
                )}

                {message && (
                    <Box paddingX={2} paddingY={0}>
                        <Text color="green">{message}</Text>
                    </Box>
                )}
            </Box>
        );
    }

    // 渲染 Model 选择页面 - 使用 ModelSelectionStep 组件
    if (step === 'model') {
        return <ModelSelectionStep onComplete={onComplete} onBack={() => setStep('provider')} />;
    }

    return null;
};

/**
 * Model 选择步骤组件
 */
const ModelSelectionStep: React.FC<{
    onComplete: () => void;
    onBack: () => void;
}> = ({ onComplete, onBack }) => {
    const { config, updateConfig } = useSettings();
    const [selectedIndex, setSelectedIndex] = useState(0);

    // 获取当前 provider
    const currentProvider = useMemo(() => {
        return config?.providers.find((p) => p.id === config.provider_id) || null;
    }, [config?.providers, config?.provider_id]);

    // 获取模型列表
    const {
        data: models = [],
        isLoading,
        error,
    } = useModels({
        provider: currentProvider,
        enabled: !!currentProvider?.apiKey,
    });

    // 选中的模型
    const selectedModel = models[selectedIndex];

    // 键盘处理
    useInput(
        (input, key) => {
            if (key.upArrow) {
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : models.length - 1));
            } else if (key.downArrow) {
                setSelectedIndex((prev) => (prev < models.length - 1 ? prev + 1 : 0));
            } else if (key.escape || input === 'b' || input === 'B') {
                onBack();
            } else if ((key.return || input === ' ') && selectedModel) {
                // 保存模型选择并完成
                updateConfig({
                    model_id: selectedModel.id,
                }).then(() => {
                    onComplete();
                });
            }
        },
        { isActive: !isLoading && !error && config !== null },
    );

    if (isLoading) {
        return (
            <Box flexDirection="column" paddingX={2} paddingY={1}>
                <Text bold color="cyan">
                    步骤 2/2: Model 选择
                </Text>
                <Box marginTop={1}>
                    <Text color="gray">加载模型列表中...</Text>
                </Box>
            </Box>
        );
    }

    if (error) {
        return (
            <Box flexDirection="column" paddingX={2} paddingY={1}>
                <Text bold color="cyan">
                    步骤 2/2: Model 选择
                </Text>
                <Box marginTop={1}>
                    <Text color="red">加载失败: {error.message}</Text>
                </Box>
                <Box marginTop={1}>
                    <Text color="gray" dimColor>
                        按 <Text color="cyan">Esc</Text> 返回上一步
                    </Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" width="100%">
            <Box paddingX={2} paddingY={1}>
                <Text bold color="cyan">
                    步骤 2/2: Model 选择
                </Text>
                {currentProvider && (
                    <Text dimColor>
                        {' '}
                        - {currentProvider.id} ({currentProvider.type})
                    </Text>
                )}
            </Box>

            <Box flexDirection="column" paddingX={2} gap={0}>
                {models.map((model, index) => (
                    <Box key={model.id} marginBottom={0} gap={1}>
                        <Text color={index === selectedIndex ? 'cyan' : 'gray'} bold={index === selectedIndex}>
                            {index === selectedIndex ? '>' : ' '}
                        </Text>
                        <Text bold={index === selectedIndex} color={index === selectedIndex ? 'cyan' : undefined}>
                            {model.id}
                        </Text>
                        {model.name !== model.id && <Text dimColor={index !== selectedIndex}>({model.name})</Text>}
                    </Box>
                ))}
            </Box>

            <Box marginTop={1} paddingX={2}>
                <Text color="gray" dimColor>
                    <Text color="cyan">↑↓</Text> 导航 <Text color="cyan">Enter/Space</Text> 确认{' '}
                    <Text color="cyan">Esc/B</Text> 返回
                </Text>
            </Box>
        </Box>
    );
};

export default SetupWizard;
