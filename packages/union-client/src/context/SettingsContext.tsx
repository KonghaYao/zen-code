import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
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
        main_model: string;
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

    const extraParams = useMemo(() => {
        return {
            main_model: config?.main_model || AVAILABLE_MODELS[0]?.id,
            mcp_config: config?.mcp_config,
            enable_thinking: config?.enable_thinking ?? true,
            switch_command: config?.switch_command || '',
        };
    }, [config, AVAILABLE_MODELS]);

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

        // 如果配置中没有 main_model，使用第一个可用模型
        if (!loadedConfig.main_model && models[0]) {
            const newConfig: Partial<AppConfig> = { main_model: models[0].id };
            if (models[0].provider) {
                newConfig.model_provider = models[0].provider;
            }
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
        <SettingsContext.Provider value={{ config, updateConfig, extraParams, AVAILABLE_MODELS, manager, compactMode, toggleCompactMode }}>
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
