/**
 * Setup 流程类型定义
 */

export type SetupStep = 'welcome' | 'provider' | 'apiAndBaseUrl' | 'model' | 'complete';

export type AIProvider = 'openai' | 'anthropic';

export interface SetupState {
    step: SetupStep;
    provider: AIProvider | null;
    apiKey: string;
    baseUrl: string;
    selectedModel: string;
    isLoading: boolean;
    error: string | null;
}

export interface ProviderOption {
    id: AIProvider;
    name: string;
    description: string;
}

export const DEFAULT_BASE_URLS: Record<AIProvider, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com',
};
