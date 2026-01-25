import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { getConfig, updateConfig as updateDbConfig, initDb, AppConfig, MCPConfig } from '../store/index';
import { get_allowed_models, ModelConfig } from '@codegraph/agent/src/utils/get_allowed_models';

interface SettingsContextType {
    config: AppConfig | null;
    updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
    extraParams: {
        main_model: string;
        mcp_config?: MCPConfig;
        switch_command?: string;
    };
    AVAILABLE_MODELS: ModelConfig[];
    compactMode: boolean;
    toggleCompactMode: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [AVAILABLE_MODELS, setModels] = useState<ModelConfig[]>([]);

    const extraParams = useMemo(() => {
        return {
            main_model: config?.main_model || AVAILABLE_MODELS[0]?.id,
            cwd: process.cwd(),
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
        await initDb();
        const loadedConfig = await getConfig();

        // 并行加载模型列表
        const models = await get_allowed_models().catch(() => []);
        setModels(models);

        // 如果配置中没有 main_model，使用第一个可用模型
        if (!loadedConfig.main_model && models[0]) {
            const config = { main_model: models[0].id };
            /** @ts-ignore 避免空值覆盖 */
            if (models[0].provider) config['model_provider'] = models[0].provider;
            await updateDbConfig(config);
            const newConfig = await getConfig();
            setConfig(newConfig);
        } else {
            setConfig(loadedConfig);
        }

        setLoading(false);
    };
    useEffect(() => {
        loadConfig();
    }, []);

    const updateConfig = async (newConfig: Partial<AppConfig>) => {
        await updateDbConfig(newConfig);
        const updatedConfig = await getConfig();
        setConfig(updatedConfig);
    };

    if (loading) {
        return null; // 或者显示加载指示器
    }

    return (
        <SettingsContext.Provider value={{ config, updateConfig, extraParams, AVAILABLE_MODELS, compactMode, toggleCompactMode }}>
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
