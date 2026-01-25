import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { WelcomeStep } from './steps/WelcomeStep';
import { ProviderStep } from './steps/ProviderStep';
import { APIAndBaseURLStep } from './steps/APIAndBaseURLStep';
import { ModelStep } from './steps/ModelStep';
import { CompleteStep } from './steps/CompleteStep';
import { updateConfig } from '../chat/store/index';
import { SetupState, SetupStep, AIProvider, DEFAULT_BASE_URLS } from './types';
import { get_allowed_models, ModelConfig } from '@codegraph/agent/src/utils/get_allowed_models';

const INITIAL_STATE: SetupState = {
    step: 'welcome',
    provider: null,
    apiKey: '',
    baseUrl: '',
    selectedModel: '',
    isLoading: false,
    error: null,
};

export const SetupWizard: React.FC = () => {
    const [state, setState] = useState<SetupState>(INITIAL_STATE);
    const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);

    const nextStep = useCallback(() => {
        setState((prev) => {
            // 验证模型选择（在 model 步骤）
            if (prev.step === 'model' && !prev.selectedModel) {
                return { ...prev, error: '请选择一个模型' };
            }
            if (prev.step === 'apiAndBaseUrl') {
                // 验证 API Key
                if (!prev.apiKey) {
                    return { ...prev, error: '请输入 API Key' };
                }

                // 设置环境变量供后续使用
                if (prev.provider) {
                    process.env.MODEL_PROVIDER = prev.provider;
                    if (prev.provider === 'openai') {
                        process.env.OPENAI_API_KEY = prev.apiKey;
                        if (prev.baseUrl && prev.baseUrl !== DEFAULT_BASE_URLS.openai) {
                            process.env.OPENAI_BASE_URL = prev.baseUrl;
                        }
                    } else {
                        process.env.ANTHROPIC_API_KEY = prev.apiKey;
                        if (prev.baseUrl && prev.baseUrl !== DEFAULT_BASE_URLS.anthropic) {
                            process.env.ANTHROPIC_BASE_URL = prev.baseUrl;
                        }
                    }
                }
            }

            const steps: SetupStep[] = ['welcome', 'provider', 'apiAndBaseUrl', 'model', 'complete'];
            const currentIndex = steps.indexOf(prev.step);
            if (currentIndex < steps.length - 1) {
                return { ...prev, step: steps[currentIndex + 1], error: null };
            }
            return prev;
        });
    }, []);

    const prevStep = useCallback(() => {
        setState((prev) => {
            const steps: SetupStep[] = ['welcome', 'provider', 'apiAndBaseUrl', 'model', 'complete'];
            const currentIndex = steps.indexOf(prev.step);
            if (currentIndex > 0) {
                return { ...prev, step: steps[currentIndex - 1], error: null };
            }
            return prev;
        });
    }, []);

    // 数据更新
    const setProvider = useCallback((provider: AIProvider) => {
        process.env.MODEL_PROVIDER = provider;
        setState((prev) => ({
            ...prev,
            provider,
            baseUrl: DEFAULT_BASE_URLS[provider],
            apiKey: '',
            selectedModel: '',
        }));
    }, []);

    const setApiKey = useCallback((apiKey: string) => {
        setState((prev) => ({ ...prev, apiKey, error: null }));
    }, []);

    const setBaseUrl = useCallback((baseUrl: string) => {
        setState((prev) => ({ ...prev, baseUrl, error: null }));
    }, []);

    const setSelectedModel = useCallback((model: string) => {
        setState((prev) => ({ ...prev, selectedModel: model, error: null }));
    }, []);

    const setError = useCallback((error: string | null) => {
        setState((prev) => ({ ...prev, error }));
    }, []);

    const setLoading = useCallback((loading: boolean) => {
        setState((prev) => ({ ...prev, isLoading: loading }));
    }, []);

    // 加载模型列表
    const loadModels = useCallback(async (provider: AIProvider, apiKey: string) => {
        setLoading(true);
        setError(null);
        try {
            // 临时设置环境变量以便 get_allowed_models 工作
            const originalProvider = process.env.MODEL_PROVIDER;
            const originalOpenAIKey = process.env.OPENAI_API_KEY;
            const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

            process.env.MODEL_PROVIDER = provider;
            if (provider === 'openai') {
                process.env.OPENAI_API_KEY = apiKey || 'temp';
            } else {
                process.env.ANTHROPIC_API_KEY = apiKey || 'temp';
            }

            const models = await get_allowed_models();
            const filteredModels = models.filter((m) => m.provider === provider);
            setAvailableModels(filteredModels);

            // 恢复环境变量
            if (originalProvider) process.env.MODEL_PROVIDER = originalProvider;
            if (originalOpenAIKey) process.env.OPENAI_API_KEY = originalOpenAIKey;
            if (originalAnthropicKey) process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
        } catch (error) {
            setError(`加载模型失败: ${error instanceof Error ? error.message : String(error)}`);
            setAvailableModels([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // 保存配置
    const saveConfig = useCallback(async () => {
        if (!state.provider || !state.apiKey || !state.selectedModel) {
            setError('配置不完整');
            return false;
        }

        setLoading(true);
        setError(null);

        try {
            const config: Record<string, string> = {
                main_model: state.selectedModel,
                model_provider: state.provider,
            };

            if (state.provider === 'openai') {
                config.openai_api_key = state.apiKey;
                if (state.baseUrl && state.baseUrl !== DEFAULT_BASE_URLS.openai) {
                    config.openai_base_url = state.baseUrl;
                }
            } else {
                config.anthropic_api_key = state.apiKey;
                if (state.baseUrl && state.baseUrl !== DEFAULT_BASE_URLS.anthropic) {
                    config.anthropic_base_url = state.baseUrl;
                }
            }

            await updateConfig(config);
            return true;
        } catch (error) {
            setError(`保存配置失败: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        } finally {
            setLoading(false);
        }
    }, [state]);

    // 退出
    const exit = useCallback(() => {
        process.exit(0);
    }, []);

    // 当进入 model 步骤且有 provider 和 apiKey 时，自动加载模型列表
    useEffect(() => {
        if (state.step === 'model' && state.provider && state.apiKey) {
            loadModels(state.provider, state.apiKey);
        }
    }, [state.step, state.provider, state.apiKey, loadModels]);

    // 全局 Ctrl+C 处理
    useInput((input, key) => {
        if (key.ctrl && input === 'c') {
            process.exit(0);
        } else if (key.escape) {
            prevStep();
        }
    });

    // 渲染当前步骤
    const renderStep = () => {
        switch (state.step) {
            case 'welcome':
                return <WelcomeStep onNext={nextStep} onExit={exit} />;
            case 'provider':
                return (
                    <ProviderStep
                        provider={state.provider}
                        onSelect={(provider) => {
                            setProvider(provider);
                        }}
                        onNext={nextStep}
                        onExit={exit}
                    />
                );
            case 'apiAndBaseUrl':
                return (
                    <APIAndBaseURLStep
                        provider={state.provider!}
                        apiKey={state.apiKey}
                        baseUrl={state.baseUrl}
                        onApiKeyChange={setApiKey}
                        onBaseUrlChange={setBaseUrl}
                        onNext={nextStep}
                        onBack={prevStep}
                        onExit={exit}
                        error={state.error}
                    />
                );
            case 'model':
                return (
                    <ModelStep
                        provider={state.provider!}
                        models={availableModels}
                        selectedModel={state.selectedModel}
                        onSelect={setSelectedModel}
                        onRefresh={() => loadModels(state.provider!, state.apiKey)}
                        onNext={async () => {
                            const success = await saveConfig();
                            if (success) nextStep();
                        }}
                        onBack={prevStep}
                        onExit={exit}
                        isLoading={state.isLoading}
                        error={state.error}
                    />
                );
            case 'complete':
                return <CompleteStep provider={state.provider!} model={state.selectedModel} onExit={exit} />;
        }
    };

    return (
        <Box flexDirection="column" height="100%" width="100%">
            {renderStep()}
        </Box>
    );
};
