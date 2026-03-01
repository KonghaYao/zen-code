/**
 * Settings Context (zen-code version)
 *
 * Manages application settings using TanStack Query.
 * Replaces manual state management from packages/union-client.
 *
 * Key improvements:
 * - Uses TanStack Query for data fetching
 * - Automatic cache management
 * - Better error handling
 * - Less boilerplate code
 *
 * Note: This is zen-code specific version. The original version
 * in packages/union-client remains unchanged.
 */

import { createContext, useContext, useMemo, ReactNode, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { useQuery } from '@tanstack/react-query';
import type { AppConfig, MCPConfig, ConfigManager } from '@codegraph/config';
import { createFSManager } from '@codegraph/config';
import { useConfig, useUpdateConfig } from '../hooks/useConfig';
import { queryKeys } from '../query-keys';

// ConfigManager 单例
let configManagerSingleton: ConfigManager | null = null;
let configManagerPromise: Promise<ConfigManager> | null = null;

async function getConfigManager(): Promise<ConfigManager> {
    if (!configManagerSingleton) {
        if (!configManagerPromise) {
            configManagerPromise = createFSManager().then((manager) => {
                configManagerSingleton = manager;
                configManagerPromise = null;
                return manager;
            });
        }
        return configManagerPromise;
    }
    return Promise.resolve(configManagerSingleton);
}

export interface ModelConfig {
    id: string;
    name: string;
    provider: 'openai' | 'anthropic' | 'gemini';
}

interface SettingsContextType {
    config: AppConfig | null;
    updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
    extraParams: {
        provider_id: string;
        model_id: string;
        mcp_config?: MCPConfig;
        switch_command?: string;
    };
    AVAILABLE_MODELS: ModelConfig[];
    manager: ConfigManager;
    compactMode: boolean;
    toggleCompactMode: () => Promise<void>;
    showDetailedInfo: boolean;
    toggleDetailedInfo: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
    get_allowed_models: () => Promise<ModelConfig[]>;
    children: ReactNode;
}

// 内部组件：在 manager 初始化后渲染
const SettingsProviderInternal = ({
    manager,
    get_allowed_models,
    children,
}: SettingsProviderProps & { manager: ConfigManager }) => {
    const { data: config, isLoading: configLoading, error: configError } = useConfig({ manager });
    const updateConfigMutation = useUpdateConfig({ manager });

    const {
        data: AVAILABLE_MODELS = [],
        isLoading: modelsLoading,
        error: modelsError,
    } = useQuery({
        queryKey: queryKeys.models.available(),
        queryFn: get_allowed_models,
        staleTime: 30 * 60 * 1000,
        retry: 1,
    });

    const extraParams = useMemo(() => {
        return {
            provider_id: config?.provider_id || 'openai',
            provider_type: config?.provider_type || 'openai',
            model_id: config?.model_id || AVAILABLE_MODELS[0]?.id || 'default',
            mcp_config: config?.mcp_config,
            enable_thinking: config?.enable_thinking ?? true,
            switch_command: config?.switch_command || '',
            cwd: process.cwd(), // 添加 cwd 字段，供 filesystem tools 使用
        };
    }, [
        config?.provider_id,
        config?.provider_type,
        config?.model_id,
        config?.mcp_config,
        config?.enable_thinking,
        config?.switch_command,
        config?.providers,
        AVAILABLE_MODELS,
    ]);

    const compactMode = useMemo(() => {
        return config?.compact_mode ?? false;
    }, [config?.compact_mode]);

    const toggleCompactMode = async () => {
        await updateConfigMutation.mutateAsync({ compact_mode: !compactMode });
    };

    const showDetailedInfo = useMemo(() => {
        return config?.show_detailed_info ?? false;
    }, [config?.show_detailed_info]);

    const toggleDetailedInfo = async () => {
        await updateConfigMutation.mutateAsync({ show_detailed_info: !showDetailedInfo });
    };

    const updateConfig = async (newConfig: Partial<AppConfig>) => {
        await updateConfigMutation.mutateAsync(newConfig);
    };

    if (configLoading || modelsLoading) {
        return (
            <Box padding={2}>
                <Text>Loading configuration...</Text>
            </Box>
        );
    }

    return (
        <SettingsContext.Provider
            value={{
                config: config || null,
                updateConfig,
                extraParams,
                AVAILABLE_MODELS,
                manager,
                compactMode,
                toggleCompactMode,
                showDetailedInfo,
                toggleDetailedInfo,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

// 外部组件：处理异步初始化，保持 hooks 顺序一致
export const SettingsProvider = ({ get_allowed_models, children }: SettingsProviderProps) => {
    const [manager, setManager] = useState<ConfigManager | null>(null);

    // 初始化 ConfigManager（只执行一次）
    useEffect(() => {
        getConfigManager().then(setManager);
    }, []);

    // 等待 manager 初始化，然后渲染内部组件
    if (!manager) {
        return (
            <Box padding={2}>
                <Text>Initializing configuration manager...</Text>
            </Box>
        );
    }

    return (
        <SettingsProviderInternal manager={manager} get_allowed_models={get_allowed_models}>
            {children}
        </SettingsProviderInternal>
    );
};
