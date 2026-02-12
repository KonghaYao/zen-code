import { createContext, useContext, useState, useRef, ReactNode, useEffect, useMemo } from 'react';
import type { AppConfig, MCPConfig, ConfigManager } from '@codegraph/config';

export interface ModelConfig {
    id: string;
    name: string;
    provider: 'openai' | 'anthropic';
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
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
    manager: ConfigManager;
    get_allowed_models: () => Promise<ModelConfig[]>;
    children: ReactNode;
}

export const SettingsProvider = ({ manager, get_allowed_models, children }: SettingsProviderProps) => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [AVAILABLE_MODELS, setModels] = useState<ModelConfig[]>([]);

    // 使用 useRef 避免循环依赖：extraParams.model_id 使用 AVAILABLE_MODELS[0] 导致 models 变化时 extraParams 变化
    const availableModelsRef = useRef<ModelConfig[]>([]);
    availableModelsRef.current = AVAILABLE_MODELS;

    const extraParams = useMemo(() => {
        return {
            provider_id: config?.provider_id || 'default',
            model_id: config?.model_id || availableModelsRef.current[0]?.id,
            mcp_config: config?.mcp_config,
            enable_thinking: config?.enable_thinking ?? true,
            switch_command: config?.switch_command || '',
        };
    }, [config?.provider_id, config?.model_id, config?.mcp_config, config?.enable_thinking, config?.switch_command]);

    const compactMode = useMemo(() => {
        return config?.compact_mode ?? false;
    }, [config]);

    const toggleCompactMode = async () => {
        await updateConfig({ compact_mode: !compactMode });
    };

    const loadConfig = async () => {
        // 使用 ConfigManager 初始化和获取配置
        await manager.initialize();
        const loadedConfig = await manager.getConfig();

        // 并行加载模型列表
        const models = await get_allowed_models().catch(() => []);
        setModels(models);

        // 如果配置中没有 provider_id/model_id，使用第一个可用模型
        if ((!loadedConfig.provider_id || !loadedConfig.model_id) && models[0]) {
            const newConfig: Partial<AppConfig> = {
                provider_id: models[0].provider,
                model_id: models[0].id,
            };
            await manager.updateConfig(newConfig);
            const updatedConfig = await manager.getConfig();
            setConfig(updatedConfig);
        } else {
            setConfig(loadedConfig);
        }

        setLoading(false);
    };

    useEffect(() => {
        loadConfig();
    }, [manager]);

    const updateConfig = async (newConfig: Partial<AppConfig>) => {
        await manager.updateConfig(newConfig);
        const updatedConfig = await manager.getConfig();
        setConfig(updatedConfig);
    };

    if (loading) {
        return null; // 或者显示加载指示器
    }

    return (
        <SettingsContext.Provider
            value={{ config, updateConfig, extraParams, AVAILABLE_MODELS, manager, compactMode, toggleCompactMode }}
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
